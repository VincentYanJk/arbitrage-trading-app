var mongodb = require('mongodb').MongoClient;
var promise = require('promise');
var url = "mongodb://bot-user-test:yjb3XyrQEA@ds243008.mlab.com:43008/binance";

var database = 'binance';

function PushPatch(p_oSeedData, p_sUniqId) {
    oPushData = p_oSeedData;
    var sUniqId = p_sUniqId;
    var oId = {id:sUniqId};
    Object.assign(oPushData, oId);   
    return Collection = 'patch';
    
}

function PushTransaction(p_oSeedData, p_sUniqId) {
    oPushData = p_oSeedData;
    var sUniqId = p_sUniqId;    
    var oId = {id:sUniqId};
    Object.assign(oPushData, oId);   
    return Collection = 'transaction';
}

var dbClient;
new Promise((resolve, reject) => {
  mongodb.connect(url, function(err, client) {
    if (err) {
        console.log(err);
    }
    dbClient = client;
    resolve();
  });
}).then(() => {
  console.log(dbClient);
});
/*let seedData =
{
  decade: '1970s',
  artist: 'Mariusz Skonieczny',
  song: 'Piosenka mojego  22',
  weeksAtOne: 10
};
PushPatch(seedData, 'ddddddd');*/