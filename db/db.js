const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;

const config = require('../config/config.js');

let database = 'binance', Patch, Transaction, Ticker, clientMongo, db, tradeDataCollection, occasionCollection;

mongodb.connect(config.DB_URL, (err, client) => {
    if (err)  {
        throw err;
    }

    clientMongo = client;
    db = client.db(database);
    Patch = db.collection('patch');
    Transaction = db.collection('transaction');
    Ticker = db.collection('ticker');
    tradeDataCollection = db.collection('trade_data');
    occasionCollection = db.collection('occasion');
}); 

const PushPatch = function(oData, sUnique) {
    let oPushData = oData;
    let oId = {id:sUnique};
    Object.assign(oPushData, oId);
    return new Promise(function(resolve, reject) 
    {
        Patch.insert(oPushData, function(err, result) 
        {
            if (err)  
            {
                reject(err);
            }
            else
            {
                resolve();
            }
        });
    });
};
const PushTransaction = function(oData, sUnique) {
    let oPushData = oData;
    let oId = {id:sUnique};
    Object.assign(oPushData, oId);
    return new Promise(function(resolve, reject) 
    {
        Transaction.insert(oPushData, function(err, result) 
        {
            if (err)  
            {
                reject(err);
            }
            else
            {
                resolve();
            }
        });
    });
};
const CloseConnection =  function (client) {
    return new Promise(function(resolve, reject) {
        client.close(function (err) {
             if (err) {
                 reject(err);
             } else {
                 resolve();
             }
        });
    });
};

module.exports = {
    pushPath: PushPatch,
    pushTransaction: PushTransaction,
    close: CloseConnection,
    insertTradeOccasion: (occasion) => occasionCollection.insertOne(occasion),
    updateTradeData: (tradeData) => tradeDataCollection.updateOne({ _id: tradeData._id }, { $set: { data: tradeData.data }}, { upsert: true }),
    getTradeData: () => tradeDataCollection.find({}).toArray(),
    generateObjectId: () => new ObjectId()
};

