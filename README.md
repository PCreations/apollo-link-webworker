# apollo-link-webworker
Apollo link that lets you use graphql client-side only, with a webworker as a "server" supporting normal query and subscriptions

# Important note
This repository is just a proof of concept and not intended for production use yet. But contributions are welcomed :)

# Installing
Install the package and its peer dependencies :
`yarn add apollo-link-webworker graphql apollo-link subscriptions-transport-ws`

# Getting started
Start by creating a `worker.js` file. Then you can import the utility functions that help you to build the worker :

*worker.js*
```javascript
import { createWorker, handleSubscriptions } from 'apollo-link-webworker';
```

## Creating the basic worker

`createWorker` takes an option object as parameter accepting the schema and the context:

*worker.js*
```javascript
import { createWorker, handleSubscriptions } from 'apollo-link-webworker';

import schema from './schema'; // your graphql schema
import context from './context'; // your graphql context

createWorker({
  schema,
  context
});
```

## Configuring the webpack worker-loader

In order to `require` the worker file, you'll need to add the `worker-loader` to your webpack configuration :

`yarn add worker-loader --dev`

Then, with an ejected `react-app` for example, edit the `config/webpack.config.[dev/prod].js` files to add the specific loader :

```
[...]
module: {
    strictExportPresence: true,
    rules: [
      // TODO: Disable require.ensure as it's not a standard language feature.
      // We are waiting for https://github.com/facebookincubator/create-react-app/issues/2176.
      // { parser: { requireEnsure: false } },

      // First, run the linter.
      // It's important to do this before Babel processes the JS.
      {
        test: /\.(js|jsx|mjs)$/,
        enforce: 'pre',
        use: [
          {
            options: {
              formatter: eslintFormatter,
              eslintPath: require.resolve('eslint'),
              
            },
            loader: require.resolve('eslint-loader'),
          },
        ],
        include: paths.appSrc,
      },
      {
        // "oneOf" will traverse all following loaders until one will
        // match the requirements. When no loader matches it will fall
        // back to the "file" loader at the end of the loader list.
        oneOf: [
          {
            test: /worker\.js$/,  //worker.js is the filename I chose
            include: path.appSrc,
            loader: require.resolve('worker-loader'),
          },
          // "url" loader works like "file" loader except that it embeds assets
          // smaller than specified limit in bytes as data URLs to avoid requests.
          // A missing `test` is equivalent to a match.
          {
            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
            loader: require.resolve('url-loader'),
            options: {
              limit: 10000,
              name: 'static/media/[name].[hash:8].[ext]',
            },
          },
[...]
```

If you only want to support classical communication (i.e : you don't mind about subscriptions) you can skip the next step.

## Handling subscriptions

`apollo-link-webworker` lets you generate graphql subscriptions from external event source. It's very useful when you don't own the socket server (firebase realtime database for example) but still need to resolve the result via your graphql schema.

To add subscriptions, just compose the `handleSubscriptions` utility function inside the worker `onmessage` handler :

*worker.js*
```javascript
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
```javascript
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

export default pubsub;
```

Whenever you need to generate a subscription from an external event source, you just need to push to the correct pubsub channel. By convention, the channel name used is the graphql subscription operation name.

For example (with firebase) :
*schema.js*
```javascript
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
```javascript
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

```javascript
// Generates a subscriptions from external firebase event source
firebaseDb().ref('/messages').on('child_added', snapshot => pubsub.publish('OnMessageAdded', {
 messageAdded: snapshot.val()
}));
```

## Generating the apollo client

Once you created your `worker.js` file you can instanciate a new `WebWorkerLink` from the factory function `createWebWorkerLink` :

*client.js*
```javascript
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
