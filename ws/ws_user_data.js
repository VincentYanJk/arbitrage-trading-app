const WebSocket = require('ws');

const binance = require('../exchange/binance.js');

let listenKey;
let sockets = {};

/*const ws = new WebSocket('wss://stream.binance.com:9443/ws/Ae57A8BPA2jdhseiuCsdDUyY7L4IQyXv0PHNXbdfj3MID63MqZ0zf5Dn0gr9');

ws.on('open', () => {
	console.log('Connection is open ...');
	ws.send(JSON.stringify({e: 'outboundAccountInfo'}));
});

ws.on('message', (message) => {
	console.log(message);
});*/

const onUserData = (callback) => {
	return binance.getListenKey().then((res) => {
		console.log('ListenKey:', res.listenKey);
		listenKey = res.listenKey;
		return setupWebSocket(listenKey, callback);
	});
};

const setupWebSocket = (listenKey, callback) => {
	let wsUrl = `wss://stream.binance.com:9443/ws/${listenKey}`;
	console.log(wsUrl);
	const ws = new WebSocket(wsUrl);

	ws.on('open', () => {
		console.log('Connection is open ...');
		// ws.send(JSON.stringify({e: 'outboundAccountInfo'}));
	});

	ws.on('message', (message) => {
		let msg = JSON.parse(message);
		console.log(msg);
		callback(msg);
	});

	ws.on('error', (err) => {
		console.log(err);
	});

	ws.on('close', () => {
		console.log('Connection is closed ...');
	});

	sockets[listenKey] = ws;

	return ws;
};

onUserData((data) => {
	console.log(data);
});

setInterval(() => {
    try{
        sockets[listenKey].send(JSON.stringify({e: 'outboundAccountInfo'}));
    } catch(e) {
        console.error(e);
    }
}, 5000);

