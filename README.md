# apollo-link-webworker
Apollo link that lets you use graphql client-side only, with a webworker as a "server" supporting normal query and subscriptions

# Important note
This repository is just a proof of concept and not intended to production use yet. But contributions are welcomed :)

# Installing
`yarn add apollo-link-webworker`

# Getting started
Start by creating a `worker.js` file. Then you can import the utility functions that help you to build the worker :

*worker.js*
```
import { createWorker, handleSubscriptions } from 'apollo-link-webworker';
```

## Creating the basic worker

`createWorker` takes an option object as parameter accepting the schema and the context:

*worker.js*
```
import { createWorker, handleSubscriptions } from 'apollo-link-webworker';

import schema from './schema'; // your graphql schema
import context from './context'; // your graphql context

createWorker({
  schema,
  context
});
```

If you only want to support classical communication (i.e : you don't mind about subscriptions) you can skip the next step.

## Handling subscriptions

`apollo-link-webworker` lets you generate graphql subscriptions from external event source. It's very useful when you don't own the socket server (firebase realtime database for example) but still need to resolve the result via your graphql schema.

To add subscriptions, just compose the `handleSubscriptions` utility function inside the worker `onmessage` handler :

*worker.js*
```
import { createWorker, handleSubscriptions } from 'apollo-link-webworker';

import schema from './schema'; // your graphql schema
import context from './context'; // your graphql context
import pubsub from './pubsub'; // a PubSub instance from graphql-subscriptions package for example

createWorker({
  schema,
  context
});

self.onmessage = message => handleSubscriptions({
  self,
  message,
  schema,
  context,
  pubsub,
});
```

*pubsub.js*
```
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

export default pubsub;
```

Whenever you need to generate a subscription from an external event source, you just need to push to the correct pubsub channel. By convention, the channel name used is the graphql subscription operation name.

For example (with firebase) :
*schema.js*
```
import pubsub from './pubsub';

const schemaString = `
  [...]
  
  type Subscription {
    messageAdded: Message!
  }
  
  [...]

`;

const resolvers = {
  [...]
  Subscription: {
    messageAdded: {
      subscribe: () => pubsub.asyncIterator('OnMessageAdded'),
    },
  }
  [...]
};
```

*OnMessageAdded.graphql*
```
subscription OnMessageAdded {
  messageAdded {
    id
    content
    user {
      id
      username
    }
  }
}
```

```
// Generates a subscriptions from external firebase event source
firebaseDb().ref('/messages').on('child_added', snapshot => pubsub.publish('OnMessageAdded', {
 messageAdded: snapshot.val()
}));
```

## Generating the apollo client

Once you created your `worker.js` file you can instanciate a new `WebWorkerLink` from the factory function `createWebWorkerLink` :

*client.js*
```
import { ApolloClient } from 'apollo-client';
import InMemoryCache from 'apollo-cache-inmemory';
import { createWebWorkerLink } from 'apollo-link-webworker';

const GraphqlWorker = require('./worker.js');

const worker = new GraphqlWorker();

const link = createWebWorkerLink({ worker });

const dataIdFromObject = result => result.id;

const cache = new InMemoryCache({ dataIdFromObject });

const client = new ApolloClient({
  cache,
  link,
});

export default client;
```

# Example chat application with Firebase & Authentication :
[Firechat repository](https://github.com/PCreations/firechat)