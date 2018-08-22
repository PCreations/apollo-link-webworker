/// <reference path="../promise-worker.d.ts"/>

import { ApolloLink, FetchResult, Operation } from "apollo-link";
import { DocumentNode } from "graphql";
import PromiseWorker = require("promise-worker");
import { OperationOptions, SubscriptionClient } from "subscriptions-transport-ws";
import Observable = require("zen-observable");

type OptionsWithWorker = { worker: Worker; };

export class PromiseWorkerLink extends ApolloLink {
  public promiseWorker: PromiseWorker;
  constructor(options: PromiseWorkerLink.ConstructorOptions);
  public request(operation: Operation): Observable<FetchResult>;
}
export namespace PromiseWorkerLink {
  type ConstructorOptions = OptionsWithWorker;
}

export class WorkerInterface {
  public url: string;
  public protocol: string;
  public readyState: WorkerInterface.readyState;
  public onerror: ((ev: ErrorEvent) => any) | null;
  public onmessage: ((ev: WorkerInterface.OnMessageEvent) => any) | null;
  public close(): void;
  public send(serializedMessage: string): void;
}
export namespace WorkerInterface {
  const CLOSED: "CLOSED";
  const OPEN: "OPEN";
  const CONNECTING: "CONNECTING";
  type readyState = "CLOSED" | "OPEN" | "CONNECTING";
  interface OnMessageEvent {
    data: any;
  }
}

export function createWorkerInterface(options: createWorkerInterface.Options): void;
export namespace createWorkerInterface {
  type Options = OptionsWithWorker;
}

export class SubscriptionWorkerLink extends ApolloLink {
  public worker: Worker;
  public subscriptionClient: SubscriptionClient;
  constructor(options: SubscriptionWorkerLink.ConstructorOptions);
  public request(operation: OperationOptions): Observable<FetchResult>;
}
export namespace SubscriptionWorkerLink {
  type ConstructorOptions = OptionsWithWorker;
}

export const isASubscriptionOperation: (document: DocumentNode, operationName: null | undefined | string) => boolean;

export const createWebWorkerLink: (options: OptionsWithWorker) => ApolloLinkWebworker;
export type ApolloLinkWebworker = ApolloLink & {
  __subscriptionWorkerLink: SubscriptionWorkerLink,
  __promiseWorkerLink: PromiseWorkerLink,
};
