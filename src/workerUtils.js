import {
  execute,
  subscribe,
  parse,
  specifiedRules,
  validate,
} from 'graphql';
import {
  $$asyncIterator,
  isAsyncIterable,
  createAsyncIterator,
  forAwaitEach,
} from 'iterall';
const registerPromiseWorker = require('promise-worker/register');

import * as MessageTypes from './MessageTypes';

const createEmptyIterable = () => ({
  next: () => Promise.resolve({ value: undefined, done: true }),
  return: () => Promise.resolve({ value: undefined, done: true }),
  throw: e => Promise.reject(e),
  [$$asyncIterator]: () => this,
});

const createIterableFromPromise = promise => {
  let isResolved = false;
  
  return promise.then(value => {
    if (isAsyncIterable(value)) {
      return value;
    }
    
    return {
      next: () => {
        if (!isResolved) {
          isResolved = true;
          return Promise.resolve({ value, done: false });
        }
        return Promise.resolve({ value: undefined, done: true });
      },
      return: () => {
        isResolved = true;
        return Promise.resolve({ value: undefined, done: true });
      },
      throw: e => {
        isResolved = true;
        return Promise.reject(e);
      },
      [$$asyncIterator]: () => this,
    };
  });
}

export const createWorker = ({
  schema,
  context,
  beforeRequest = () => Promise.resolve(),
}) => registerPromiseWorker(request => {
  if (request) {
    return beforeRequest(request).then(() => execute(
      schema,
      request.query,
      {},
      Object.assign({}, request.context || {}, context),
      request.variables,
      request.operationName
    ));
  }
  return Promise.resolve();
});

let _onMessage;
    
const getOnMessage = ({ schema, context }) => {
  if (_onMessage) return _onMessage;
  
  const sendMessage = (opId, type, payload) => {
    const message = {
      type,
      id: opId,
      payload,
    };
    self.postMessage(JSON.stringify(message));
  };
  
  const sendError = (opId, errorPayload, overrideDefaultErrorType) => {
    const sanitizedOverrideDefaultErrorType = overrideDefaultErrorType || MessageTypes.GQL_ERROR;
    if ([
        MessageTypes.GQL_CONNECTION_ERROR,
        MessageTypes.GQL_ERROR,
      ].indexOf(sanitizedOverrideDefaultErrorType) === -1) {
      throw new Error('overrideDefaultErrorType should be one of the allowed error messages' +
        ' GQL_CONNECTION_ERROR or GQL_ERROR');
    }
    sendMessage(opId, sanitizedOverrideDefaultErrorType, errorPayload);
  }
  
  const connectionContext = {
    isLegacy: false,
    operations: {},
  };
  
  const unsubscribe = opId => {
    if (connectionContext.operations && connectionContext.operations[opId]) {
      if (connectionContext.operations[opId].return) {
        connectionContext.operations[opId].return();
      }
      
      delete connectionContext.operations[opId];
    }
  }
  
  _onMessage = workerMessage => {
    console.log('RECEIVED JSON MESSAGE', workerMessage);
    const message = JSON.parse(workerMessage.data);
    const opId = message.id;
    if (typeof opId !== 'undefined') {
        switch (message.type) {
          case MessageTypes.GQL_START:
            // if we already have a subscription with this id, unsubscribe from it first
            if (connectionContext.operations && connectionContext.operations[opId]) {
              unsubscribe(opId);
            }
            
            const baseParams = {
              query: message.payload.query,
              variables: message.payload.variables,
              operationName: message.payload.operationName,
              context,
              formatResponse: undefined,
              formatError: undefined,
              callback: undefined,
            };
            let promisedParams = Promise.resolve(baseParams);
            
            // set an initial mock subscription to only registering opId
            connectionContext.operations[opId] = createEmptyIterable();
            
            promisedParams.then(params => {
              if (typeof params !== 'object') {
                const error = `Invalid params returned from onOperation! return values must be an object!`;
                throw new Error(error);
              }
              const document = typeof baseParams.query !== 'string' ? baseParams.query : parse(baseParams.query);
              let executionIterable;
              const validationErrors = validate(schema, document, specifiedRules);
              if (validationErrors.length > 0) {
                executionIterable = Promise.resolve(createIterableFromPromise(
                  Promise.resolve({ errors: validationErrors })
                ));
              } else {
                let executor = subscribe;
                const promiseOrIterable = executor(
                  schema,
                  document,
                  {},
                  params.context,
                  params.variables,
                  params.operationName
                );
                
                if (!isAsyncIterable(promiseOrIterable) && promiseOrIterable instanceof Promise) {
                  executionIterable = promiseOrIterable;
                } else if (isAsyncIterable(promiseOrIterable)) {
                  executionIterable = Promise.resolve(promiseOrIterable);
                } else {
                  throw new Error('Invalid `execute` return type! Only Promise or AsyncIterable are valid values!');
                }
              }
              
              return executionIterable.then(ei => ({
                executionIterable: isAsyncIterable(ei) ? ei : createAsyncIterator([ ei ]),
                params,
              }));
            }).then(({ executionIterable, params }) => {
              forAwaitEach(
                createAsyncIterator(executionIterable),
                value => {
                  let result = value;
                  if (params.formatResponse) {
                    try {
                      result = params.formatResponse(value, params);
                    } catch (err) {
                      console.error('Error in formatError function:', err);
                    }
                  }
                  sendMessage(opId, MessageTypes.GQL_DATA, result);
                }).then(() => {
                  sendMessage(opId, MessageTypes.GQL_COMPLETE, null);
                }).catch(e => {
                  let error = e;
    
                  if (params.formatError) {
                    try {
                      error = params.formatError(e, params);
                    } catch (err) {
                      console.error('Error in formatError function: ', err);
                    }
                  }
    
                  // plain Error object cannot be JSON stringified.
                  if (Object.keys(e).length === 0) {
                    error = { name: e.name, message: e.message };
                  }
    
                  sendError(opId, error);
                });
                
                return executionIterable;
            }).then(subscription => {
              connectionContext.operations[opId] = subscription;
            }).catch(e => {
              if (e.errors) {
                sendMessage(opId, MessageTypes.GQL_DATA, { errors: e.errors });
              } else {
                sendError(opId, { message: e.message });
              }
              unsubscribe(opId);
              return;
            });
            break;
            
            default:
              sendError(opId, { message: 'Invalid message type!' });
        } 
      }
  };
  
  return _onMessage;
};

export const handleSubscriptions = ({
  self,
  message,
  schema,
  context,
}) => getOnMessage({ schema, context })(message);