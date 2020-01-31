const mongo = require('mongodb').MongoClient;

class MongoStorage {
    /**
     * Constructor is used for connection with database
     * @param connectionUrl - its specify the mongodb URL, Example is: `mongodb://127.0.0.1:27017/`
     * @param databaseName - its specify the mongodb Database Name, Example is: `BotStorage`
     * @param collectionName - its specify the mongodb collectionName, Example is: `UserData`
     */
    constructor(connectionUrl, databaseName, collectionName) {
        this.etag = 1;
        this.database = {};

        if (!connectionUrl) {
            throw new Error('MongoDB Url Must Require');
        }
        if (!databaseName) {
            databaseName = 'BotStorge'
        }
        if (!collectionName) {
            collectionName = 'UserData'
        }

        this.collectionName = collectionName;
        //let connectionUrl = 'mongodb://127.0.0.1:27017/wizbiz-v4';
        this.dbHost = connectionUrl.substring(0, connectionUrl.lastIndexOf('/'));

        mongo
            .connect(this.dbHost, {
                useNewUrlParser: true,
                socketTimeoutMS: 0,
                keepAlive: false,
                reconnectTries: Number.MAX_SAFE_INTEGER,
                poolSize: 1
            })
            .then(database => {
                console.log('Bot Storage Connected To Database');
                this.database = database.db(databaseName);
            })
            .catch(err => {
                console.error(err);
                throw new Error('Error in Database Connection');
            });
    }

    read(keys) {
        if (!keys || keys.length === 0) {
            // No keys passed in, no result to return.
            return Promise.resolve({});
        }
        let _this = this;
        return new Promise((resolve, reject) => {
            const data = {};
            let promiseArr = [];
            keys.forEach(key => {
                promiseArr.push(_this.database.collection(_this.collectionName).findOne({key: key}));
            });
            Promise.all(promiseArr)
                .then(results => {
                    results.forEach(item => {
                        if (item) {
                            data[item.key] = item.memory;
                        }
                        //console.log('Read Data:', data);
                        resolve(data);
                    });
                })
                .catch(err => {
                    console.error(`Error:`, err);
                    reject(new Error(`Error in Find records in key`));
                });
        });
    }

    write(changes) {
        const _this = this;
        if (!changes || Object.keys(changes).length === 0) {
            return Promise.resolve();
        }

        function updateItem(key, item) {
            const clone = Object.assign({}, item);
            clone.eTag = (_this.etag++).toString();
            _this.database
                .collection(_this.collectionName)
                .findOneAndUpdate({key: key}, {memory: clone}, {new: true})
                .then(result => {
                    //console.log('Update in Item ');
                })
                .catch(err => {
                    console.log('Error in update item');
                    console.log(err);
                });
        }

        function insertItem(key, item) {
            const clone = Object.assign({}, item);
            clone.eTag = (_this.etag++).toString();
            _this.database
                .collection(_this.collectionName)
                .findOneAndDelete({
                    key: key,
                })
                .then(res => {
                    //console.log('Deleted Record:', res);
                    return _this.database.collection(_this.collectionName).insertOne({
                        key: key,
                        memory: clone,
                    });
                })
                .then(result => {
                    //console.log('Create in Database ');
                })
                .catch(err => {
                    console.log('Error in create item');
                    console.log(err);
                });
        }

        return new Promise((resolve, reject) => {
            Object.keys(changes).forEach(key => {
                const newItem = changes[key];

                _this.database
                    .collection(_this.collectionName)
                    .findOne({key: key})
                    .then(old => {
                        if (!old || newItem.eTag === '*') {
                            insertItem(key, newItem);
                        } else {
                            const oldItem = JSON.parse(old);
                            if (newItem.eTag === oldItem.eTag) {
                                updateItem(key, newItem);
                            } else {
                                reject(new Error(`Storage: error writing "${key}" due to eTag conflict.`));
                            }
                        }
                    })
                    .catch(err => {
                        console.log(err);
                        reject(new Error(`Error in Find records in key`));
                    });
            });
            resolve();
        });
    }

    delete(keys) {
        if (!keys || keys.length === 0) {
            return Promise.resolve();
        }
        let _this = this;
        return new Promise((resolve, reject) => {
            keys.forEach(key => {
                _this.database
                    .collection(_this.collectionName)
                    .findOneAndDelete({
                        key: key,
                    })
                    .then(res => {
                        //console.log('Deleted Item is:', res);
                    })
                    .catch(err => {
                        console.error(err);
                        reject(new Error(`Error in Delete Item`));
                    });
            });
            resolve();
        });
    }
}

module.exports.MongoStorage = MongoStorage;
