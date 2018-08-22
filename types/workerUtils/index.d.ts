/// <reference path="../promise-worker.d.ts"/>

import { GraphQLSchema } from "graphql";
import { PubSub } from "graphql-subscriptions";

/**
 * Interface of your graphql context for module augmenting
 */
export interface GraphQLContext {}

export const createWorker: <TContext = GraphQLContext>(options: createWorker.Options<TContext>) => void;
export namespace createWorker {
  interface Options<TContext = GraphQLContext> {
    schema: GraphQLSchema;
    context: TContext;
    // FIXME can the type of the "request" parameter be more precise?
    beforeRequest?: (request: any) => Promise<void>;
  }
}

export type OnMessage = (workerMessage: MessageEvent) => void;

export const getOnMessage: <TContext = GraphQLContext>(options: getOnMessage.Options<TContext>) => OnMessage;
export namespace getOnMessage {
  interface Options<TContext = GraphQLContext> {
    schema: GraphQLSchema;
    context: TContext;
  }
}

export const handleSubscriptions: <TContext = GraphQLContext>(options: handleSubscriptions.Options<TContext>) => void;
export namespace handleSubscriptions {
  interface Options<TContext = GraphQLContext> {
    self: WorkerGlobalScope;
    message: MessageEvent;
    schema: GraphQLSchema;
    context: TContext;
    pubsub?: PubSub;
  }
}
