const WebSocket = require('ws');
const moment = require('moment');

// const db = require('../db/db.js');

let sockets = {};
let tradingData = {};

const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

ws.on('open', function() {
    console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']','Trading data WebSocket connection is open ...');
    ws.on('message', (message) => {
        let data = JSON.parse(message);
        // console.log('Received data of length:', data.length);
        data.forEach((item) => tradingData[item.s] = item);
    });
});

sockets.tradeData = ws;

module.exports = {
    getActualTradeData: () => tradingData
};