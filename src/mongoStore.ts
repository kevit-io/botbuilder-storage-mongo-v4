import { Storage, StoreItems } from 'botbuilder-core';
import {
  ObjectID,
  MongoClient,
  Collection,
  MongoClientOptions,
  BulkWriteOperation,
} from 'mongodb';

export interface MongoStorageConfig {
  uri: string;
  database: string;
  collection: string;
  options: MongoClientOptions;
}

interface MongoDocumentStoreItem {
  _id: string;
  state: Record<string, unknown> | string;
  etag: string;
}

export default class MongoStore implements Storage {
  private config: MongoStorageConfig;

  private client: MongoClient;

  public static readonly NO_CONFIG_ERROR: Error = new Error(
    'MongoStorageConfig is required.'
  );

  public static readonly NO_URL_ERROR: Error = new Error(
    'MongoStorageConfig.uri is required.'
  );

  static readonly DEFAULT_DATABASE_NAME: 'botstorage';

  static readonly DEFAULT_COLLECTION_NAME: 'conversations';

  constructor(config: MongoStorageConfig) {
    // throw error if configs are missing
    if (!config) throw MongoStore.NO_CONFIG_ERROR;
    if (!config.uri || config.uri.trim() === '') throw MongoStore.NO_URL_ERROR;

    // assign config to instance
    this.config = config;

    // add default values
    if (!this.config.database || this.config.database.trim() === '') {
      this.config.database = MongoStore.DEFAULT_DATABASE_NAME;
    }
    if (!this.config.collection || this.config.collection.trim() === '') {
      this.config.collection = MongoStore.DEFAULT_COLLECTION_NAME;
    }

    this.client = new MongoClient(this.config.uri, this.config.options);
  }

  // ensure the connection with database
  public async ensureConnected(): Promise<void> {
    if (!this.client.isConnected) {
      await this.client.connect();
    }
  }

  // database collection for state storage
  get storageCollection(): Collection<MongoDocumentStoreItem> {
    return this.client
      .db(this.config.database)
      .collection(this.config.collection);
  }

  // read state keys from database
  public async read(stateKeys: string[]): Promise<StoreItems> {
    if (!stateKeys || stateKeys.length === 0) {
      return {};
    }
    await this.ensureConnected();
    const docs = this.storageCollection.find({ _id: { $in: stateKeys } });
    const storeItems: StoreItems = (await docs.toArray()).reduce(
      (accum: Record<string, MongoDocumentStoreItem>, item) => {
        accum[item._id] = JSON.parse(item.state as string);
        return accum;
      },
      {}
    );
    return storeItems;
  }

  // write updates to database
  public async write(changes: StoreItems): Promise<void> {
    if (!changes || Object.keys(changes).length === 0) {
      return;
    }
    await this.ensureConnected();
    const operations = [] as BulkWriteOperation<MongoDocumentStoreItem>[];
    Object.keys(changes).forEach((key) => {
      const state = changes[key];
      state.eTag = new ObjectID().toHexString();
      operations.push({
        updateOne: {
          filter: { _id: key },
          update: {
            $set: {
              state: JSON.stringify(state),
              date: new Date(),
              etag: state.eTag,
            },
          },
          upsert: true,
        },
      });
    });
    await this.storageCollection.bulkWrite(operations);
  }

  // delete state key data from database
  public async delete(keys: string[]): Promise<void> {
    if (!keys || keys.length === 0) {
      return;
    }
    await this.ensureConnected();
    await this.storageCollection.deleteMany({ _id: { $in: keys } });
  }
}
