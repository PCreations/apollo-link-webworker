import { createWorker, GraphQLContext, handleSubscriptions } from "apollo-link-webworker/workerUtils";
import { buildSchema, GraphQLSchema } from "graphql";
import { PubSub } from "graphql-subscriptions";

const SCHEMA = `
  schema {
    query: Query
  }

  type Query {
    hello: String!
  }
`;

const schema: GraphQLSchema = buildSchema(SCHEMA);
const context: GraphQLContext = {
  dummy: "value",
};
const beforeRequest: () => Promise<void> = () => Promise.resolve();

createWorker({ schema, context, beforeRequest });

const pubsub = new PubSub();

// Typescript webworker lib does not include "onmessage" and "PostMessage" on WorkerGlobalScope(self)
addEventListener("message", (message: MessageEvent) => handleSubscriptions({
  context,
  message,
  pubsub,
  schema,
  self,
}));
