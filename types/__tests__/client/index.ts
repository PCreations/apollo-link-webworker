import {
  ApolloLinkWebworker,
  createWebWorkerLink,
  PromiseWorkerLink,
  SubscriptionWorkerLink,
} from "apollo-link-webworker/webWorkerLink";

const worker = new Worker("");

const link: ApolloLinkWebworker = createWebWorkerLink({ worker });

// tslint:disable:no-console
console.log(link.__promiseWorkerLink instanceof PromiseWorkerLink);
console.log(link.__subscriptionWorkerLink instanceof SubscriptionWorkerLink);
