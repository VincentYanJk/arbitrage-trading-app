var request = require('request');
var WebSocket = require('ws');

var GetListenKey = function()
{
    return new Promise(function(resolve, reject) 
    {

    });
};    



var UserData = function(sListenKey)
{
    

};


/*GetListenKey().then(function (listenKey){
    sWsAdress = 'wss://stream.binance.com:9443/ws/' + listenKey;
    console.log(sWsAdress);

    ws = new WebSocket(sWsAdress);
    ws.on('message', function incoming(data) 
    {  
        add = JSON.parse(data);
        console.log(add);
        add.forEach(function(items) 
        {
            console.log(items);
        });

    });    

    // UserData(sListenKey);
  });*/

request({
    headers: {
        'X-MBX-APIKEY': '4jr0OuNtmfaFhWOg46YIBTvbKpLQj2oBXWXPjb3eZTgPOshosZ8YX1Hw8THe4jvj'
    },
    uri: 'https://api.binance.com/api/v1/userDataStream',
    method: 'POST'
}, function (error, response, body) {  
    if (error) {
        throw error;
    }
    if (!error && response.statusCode === 200) {
        console.log(JSON.parse(body).listenKey);

        var ws = new WebSocket('wss://stream.binance.com:9443/ws/' + JSON.parse(body).listenKey);
        ws.on('open', () => {
            console.log('Connected with ws');
        });
        ws.on('message', function (data) {  
            add = JSON.parse(data);
            console.log(add);
            add.forEach(function(items) {
                console.log(items);
            });

        });

        ws.on('close', () => {
            console.log('Connection closed');
        });    
    }
});