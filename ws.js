const WebSocket = require('ws');
const promies = require('promise');

const binance = require('./exchange/binance.js');

binance.getListenKey('PdcaMpyLrTfZAgt88Km8S18EmCkjsWwhDIoT83XB06DiGk1bzZbYxDnUzqX3').then((res) => {
	const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${res.listenKey}`);

	ws.on('open', () => {
		console.log('Connection is open ...');

		ws.on('message', (msg) => {
	 		console.log(JSON.parse(msg));
		});		
	});
});

/*const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

ws.on('open', () => {
	console.log('Connection is open ...');
});

ws.on('message', (msg) => {
 console.log(JSON.parse(msg));
});*/