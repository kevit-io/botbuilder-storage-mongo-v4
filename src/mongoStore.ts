import { Storage, StoreItems } from 'botbuilder-core';
import {
  ObjectID,
  MongoClient,
  Collection,
  MongoClientOptions,
  BulkWriteOperation,
} from 'mongodb';

export interface MongoStoreOptions extends MongoClientOptions {
  storageKey?: string;
  databaseName?: string;
  collectionName?: string;
}

interface MongoStoreDocument extends StoreItems {
  _id?: string;
  state: Record<string, unknown> | string;
  date?: Date;
  etag: string;
}

export class MongoStore implements Storage {
  private uri: string;

  private databaseName: string;

  private collectionName: string;

  private key: string;

  private options: MongoClientOptions | undefined;

  private client: MongoClient;

  public static readonly NO_URL_ERROR: Error = new Error(
    'MongoStore.uri is required.'
  );

  static readonly DEFAULT_DATABASE_NAME = 'botstorage';

  static readonly DEFAULT_COLLECTION_NAME = 'conversations';

  public connect: () => Promise<MongoClient>;

  constructor(uri: string, options?: MongoStoreOptions) {
    // throw error if configs are missing
    if (!uri || uri.trim() === '') throw MongoStore.NO_URL_ERROR;
    this.uri = uri;

    const {
      databaseName = '',
      collectionName = '',
      storageKey = '_id',
      ...clientOptions
    } = options || {};

    this.options = clientOptions;

    this.key = storageKey;

    this.databaseName = databaseName.trim()
      ? databaseName.trim()
      : MongoStore.DEFAULT_DATABASE_NAME;
    this.collectionName = collectionName.trim()
      ? collectionName.trim()
      : MongoStore.DEFAULT_COLLECTION_NAME;

    this.client = new MongoClient(this.uri, this.options);
    this.connect = this.client.connect.bind(this.client);
  }

  // ensure the connection with database
  public async ensureConnected(): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
  }

  // database collection for state storage
  get storageCollection(): Collection<MongoStoreDocument> {
    return this.client.db(this.databaseName).collection(this.collectionName);
  }

  // read state keys from database
  public async read(stateKeys: string[]): Promise<StoreItems> {
    if (!stateKeys || stateKeys.length === 0) {
      return {};
    }
    await this.ensureConnected();
    const docs = this.storageCollection.find({
      [this.key]: { $in: stateKeys },
    });
    const storeItems: StoreItems = (await docs.toArray()).reduce(
      (accum: Record<string, MongoStoreDocument>, item) => {
        accum[item[this.key]] = JSON.parse(item.state as string);
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
    const operations = [] as BulkWriteOperation<MongoStoreDocument>[];
    Object.keys(changes).forEach((key) => {
      const state = changes[key];
      state.eTag = new ObjectID().toHexString();
      operations.push({
        updateOne: {
          filter: { [this.key]: key },
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
    await this.storageCollection.deleteMany({ [this.key]: { $in: keys } });
  }
}
