import { ApolloLink, Observable } from 'apollo-link-core';
import { SubscriptionClient } from 'subscriptions-transport-ws';

export class PromiseWorkerLink extends ApolloLink {
  promiseWorker = null;
  constructor({ promiseWorker }) {
    super();
    this.promiseWorker = promiseWorker;
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
      console.log('sending', serializedMessage);
      worker.postMessage(serializedMessage);
    }
    set onopen(fn) {
      console.info('onopen noop');
    }
    set onclose(fn) {
      console.log('onclose noop');
    }
    set onerror(fn) {
      worker.onerror = fn;
    }
    set onmessage(fn) {
      worker.onmessage = ({ data }) => {
        const d = JSON.parse(data);
        if (d.type === 'data') {
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

// TODO: quick hack
export const isSubscription = operation => operation.query.definitions[0].operation === 'subscription';

export const createWebWorkerLink = ({ worker, promiseWorker }) => ApolloLink.split(
  isSubscription,
  new SubscriptionWorkerLink({ worker }),
  new PromiseWorkerLink({ promiseWorker })
);