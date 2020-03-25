import { DocumentNode, getOperationAST, parse } from 'graphql';
import { ApolloLink, Observable } from 'apollo-link';
import {
  SubscriptionClient,
} from 'subscriptions-transport-ws';
import PromiseWorker from 'promise-worker';

import * as MessageTypes from './MessageTypes';

export class PromiseWorkerLink extends ApolloLink {
  promiseWorker = null;
  constructor({ worker }) {
    super();
    this.promiseWorker = new PromiseWorker(worker);
  }
  request(operation) {
    return new Observable(observer => {
      this.promiseWorker.postMessage(operation)
        .then(data => {
          observer.next(data);
          observer.complete();
        })
        .catch(observer.error.bind(observer));
    });
  }
}

export const createWorkerInterface = ({ worker }) => {
  class WorkerInterface {
    url;
    protocol;
    readyState;
    constructor(url, protocol) {
      this.url = url;
      this.protocol = protocol;
      this.readyState = WorkerInterface.OPEN; // webworker is always opened
    }
    close() {
      console.log('closing noop');
    }
    send(serializedMessage) {
      worker.postMessage(serializedMessage);
    }
    set onerror(fn) {
      worker.onerror = fn;
    }
    set onmessage(fn) {
      worker.onmessage = ({ data }) => {
        const d =  (typeof data === "object") ? data : JSON.parse(data) ;
        if (Object.keys(MessageTypes).map(k => MessageTypes[k]).indexOf(d.type) !== -1) {
          fn({ data });
        }
      };
    }
  }

  WorkerInterface.CLOSED = 'CLOSED';
  WorkerInterface.OPEN = 'OPEN';
  WorkerInterface.CONNECTING = 'CONNECTING';

  return WorkerInterface;
}

export class SubscriptionWorkerLink extends ApolloLink {
  worker = null;
  subscriptionClient = null;
  constructor({ worker }) {
    super();
    this.worker = worker;
    this.subscriptionClient = new SubscriptionClient(null, {}, createWorkerInterface({ worker }));
  }
  request(operation) {
    return this.subscriptionClient.request(operation);
  }
}

export const isASubscriptionOperation = (document, operationName) => {
  const operationAST = getOperationAST(document, operationName);

  return !!operationAST && operationAST.operation === 'subscription';
};

export const createWebWorkerLink = ({ worker }) => {
  const subscriptionWorkerLink = new SubscriptionWorkerLink({ worker });
  const promiseWorkerLink = new PromiseWorkerLink({ worker });
  const link = ApolloLink.split(
    operation => {
      const document = parse(operation.query);
      return isASubscriptionOperation(document, operation.operationName);
    },
    subscriptionWorkerLink,
    promiseWorkerLink
  );
  link.__subscriptionWorkerLink = subscriptionWorkerLink;
  link.__promiseWorkerLink = promiseWorkerLink;
  return link;
};
