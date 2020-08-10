Bot Framework MongoDB Storage (Compatible V4+)
--------------------------------

### Descriptions:

This project gives ability to use mongodb as storage for [Bot Framework-JS SDK V4+](https://github.com/Microsoft/botbuilder-js).

It provides resilient solution to store bot state so that you can scale out your bot.



## Installation:
```
npm install @kevit/botbuilder-storage-mongo-v4
```

**Latest improved feature**

- Usage of multi read and bulk write
- Improved constructor gives ability to customise mongodb connections



## Usage

### JavaScript : 

```javascript
// Package
const { MongoStore } = require('botbuilder-storage-mongo-v4');

// Options (Optional)
const options = {
  databaseName: 'foobar', // default : 'botStorage'
  collectionName: 'conversations', // default : 'conversations'
  // other mongo client options
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// construct
const storage = new MongoStore(<YOUR_CONNECTION_STRING>, options);
```

#### TypeScript

``` typescript
// Package
import { MongoStore, MongoStoreOptions } from 'botbuilder-storage-mongo-v4';

// Options (Optional)
const options: MongoStoreOptions = {
  databaseName: 'foobar', // default : 'botStorage'
  collectionName: 'conversations', // default : 'conversations'
  // other mongo client options
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// construct
const storage = new MongoStore(<YOUR_CONNECTION_STRING>, options);
```

#### Storage Usage

```typescript
const conversationState = new ConversationState(storage);
const userState = new UserState(storage);
```



## Extra

1. Storage automatically connects with database on first query but to override the behaviour

   ```typescript
   await storage.connect()
   
   /** or **/
   
   storage
     .connect()
     .then((client) => console.log('Connected :', client.isConnected()))
     .catch((err) => console.error('Error', err));
   ```

2. User custom key as storage key  [ default : `_id` ]

   ```typescript
   // define storage key in options
   const storage = new MongoStore(<YOUR_CONNECTION_STRING>, { storageKey: 'conversationId' });
   
   // create index for perfomance for storage-key
   storage
     .connect()
     .then(() =>
       storage.storageCollection.createIndex({ conversationId: 1 }, { unique: true, background: true })
     );
   
   // Info : if you were using older versions then storageKey should be "key" ( options = { storageKey: 'key' } )
   ```

3. If your database has extra authentication then you can add other mongodb options

   ```typescript
   const storage = new MongoStore(<YOUR_CONNECTION_STRING>, {
     auth: {
       user: 'user',
       password: 'password',
     },
   });
   ```

   