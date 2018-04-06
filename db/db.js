const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;

const config = require('../config/config.js');

var database = 'binance';
var Patch;
var Transaction;
var Ticker;
var clientMongo;
var db;
var tradeDataCollection;

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
    updateTradeData: (tradeData) => {
        return tradeDataCollection.updateOne({ _id: tradeData._id }, { $set: { data: tradeData.data }}, { upsert: true });
    },
    getTradeData: () => tradeDataCollection.find({}).toArray(),
    generateObjectId: () => new ObjectId()
};

