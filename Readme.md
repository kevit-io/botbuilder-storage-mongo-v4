Bot Framework v4 MongoDB Storage
--------------------------------

This package gives ability to use MongoDB as session storage for Botframewok v4.x

## Instructions:
### 1. Install the package:
```
npm i botbuilder-storage-mongo-v4
```

### 2. Use the storage:
``` 
const {MongoStorage} = require('botbuilder-storage-mongo-v4');

/**
* @param connectionUrl - its specify the mongodb URL, Example: mongodb://127.0.0.1:27017/
* @param databaseName - its specify the mongodb Database Name, Example: BotStorage
* @param collectionName - its specify the mongodb collectionName, Example: UserData
*/
let storage = new MongoStorage(
  connectionUrl,
  databaseName,
  collectionName,
);

let conversationState = new ConversationState(storage);
let userState = new UserState(storage);

```


## API
`MongoStorage` constructor takes 3 values as arguments
1. Connection URL
2. Database Name
3. Collection Name

After creating instance of `MongoStorage` you can pass ot as arguments in `ConversationState` & `UserState`.