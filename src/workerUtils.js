import { execute, parse } from 'graphql';
const registerPromiseWorker = require('promise-worker/register')

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

export const handleSubscriptions = ({
  self,
  message,
  schema,
  pubsub,
  context,
}) => {
  const messageData = JSON.parse(message.data);
  if (messageData.type === 'start') {
    const payload = messageData.payload;
    pubsub.subscribe(payload.operationName, data => {
      return execute(
        schema,
        parse(payload.query),
        data,
        context,
        payload.variables || {},
        payload.operationName
      ).then(({ data, errors }) => {
        if (errors) console.error(errors[0]);
        self.postMessage(JSON.stringify({
          type: 'data',
          id: messageData.id,
          payload: {
            errors,
            data,
          }
        }));
      });
    });
  }
}