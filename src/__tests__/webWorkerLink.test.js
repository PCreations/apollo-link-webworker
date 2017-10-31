/* global jest expect */

import { SubscriptionClient } from 'subscriptions-transport-ws';
import { Observable, execute } from 'apollo-link';
import { ExecutionResult } from 'graphql';

import { createWebWorkerLink } from '../webWorkerLink';

const query = `
  query SampleQuery {
    stub {
      id
    }
  }
`;

const mutation = `
  mutation SampleMutation {
    stub {
      id
    }
  }
`;

const subscription = `
  subscription SampleSubscription {
    stub {
      id
    }
  }
`;

const getMockWorker = () => ({
  addEventListener: jest.fn(),
});

describe('WebWorkerLink', () => {
  it('should call request on the promiseWorkerLink for a query', done => {
    const result = { data: { data: 'result' } };
    const observable = Observable.of(result);
    const link = createWebWorkerLink({ worker: getMockWorker() });
    link.__promiseWorkerLink.request = jest.fn();
    link.__promiseWorkerLink.request.mockReturnValueOnce(observable);

    const obs = execute(link, { query });
    expect(obs).toEqual(observable);
    obs.subscribe(data => {
      expect(data).toEqual(result);
      expect(link.__promiseWorkerLink.request).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('should call request on the promiseWorkerLink for a mutation', done => {
    const result = { data: { data: 'result' } };
    const observable = Observable.of(result);
    const link = createWebWorkerLink({ worker: getMockWorker() });
    link.__promiseWorkerLink.request = jest.fn();
    link.__promiseWorkerLink.request.mockReturnValueOnce(observable);

    const obs = execute(link, { query: mutation });
    expect(obs).toEqual(observable);
    obs.subscribe(data => {
      expect(data).toEqual(result);
      expect(link.__promiseWorkerLink.request).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('should call request on the subscriptionClient for a subscription', done => {
    const result = { data: { data: 'result' } };
    const observable = Observable.of(result);
    const link = createWebWorkerLink({ worker: getMockWorker() });
    link.__subscriptionWorkerLink.subscriptionClient.request = jest.fn();
    link.__subscriptionWorkerLink.subscriptionClient.request.mockReturnValueOnce(observable);

    const obs = execute(link, { query: subscription });
    expect(obs).toEqual(observable);
    obs.subscribe(data => {
      expect(data).toEqual(result);
      expect(link.__subscriptionWorkerLink.subscriptionClient.request).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('should call next with multiple results for subscription', done => {
    const results = [
      { data: { data: 'result1' } },
      { data: { data: 'result2' } },
    ];
    const link = createWebWorkerLink({ worker: getMockWorker() });
    link.__subscriptionWorkerLink.subscriptionClient.request = jest.fn(() => {
      const copy = [...results];
      return new Observable(observer => {
        observer.next(copy[0]);
        observer.next(copy[1]);
      });
    });

    execute(link, { query: subscription }).subscribe(data => {
      expect(link.__subscriptionWorkerLink.subscriptionClient.request).toHaveBeenCalledTimes(1);
      expect(data).toEqual(results.shift());
      if (results.length === 0) {
        done();
      }
    });
  });
});