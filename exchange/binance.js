const request = require('request');
const url = require('url');
const crypto = require('crypto');

const config = require('../config/config.js');

const API_KEY = config.API_KEY;
const SECRET_KEY = config.SECRET_KEY;

// API URL
const URL = 'https://api.binance.com';

// PUBLIC ENDPOINTS
const PING_PATH = '/api/v1/ping';
const INFO_PATH = '/api/v1/exchangeInfo';
const PRICE_PATH = '/api/v3/ticker/price';
const TICKER_PATH = '/api/v3/ticker/bookTicker';
const USER_DATA_STREAM_PATH = '/api/v1/userDataStream';

// PRIVATE ENDPOINTS
const ORDER_PATH = '/api/v3/order';
const TEST_ORDER_PATH = '/api/v3/order/test';
const OPEN_ORDERS_PATH = '/api/v3/openOrders';
const ACCOUNT_INFO_PATH = '/api/v3/account';

let options = {
	method: 'GET',
	url: '',
	headers: {},
	json: true
};

const call = (options) => {
	return new Promise((resolve, reject) => {
		request(options, (err, res, body) => {
			if(err) {
				reject(err);
			} else {
				resolve(body);
			}
		});
	});
};

module.exports = {
	ping: () => {
		options.url = url.parse(URL.concat(PING_PATH));
		return call(options);
	},	
	info: () => {
		options.url = url.parse(URL.concat(INFO_PATH));
		return call(options);
	}, 
	price: (symbol) => {
		options.url = url.parse(URL.concat(symbol ? PRICE_PATH.concat('?symbol='.concat(symbol)) : PRICE_PATH));
		return call(options);
	},
	bookTicker: (symbol) => {
		options.url = url.parse(URL.concat(symbol ? TICKER_PATH.concat('?symbol='.concat(symbol)) : TICKER_PATH));
		return call(options);
	},
	getListenKey: () => {
		options.url = url.parse(URL + USER_DATA_STREAM_PATH);
		options.method = 'POST';
		options.headers['X-MBX-APIKEY'] = API_KEY;

		return call(options);
	},
	keepAliveListenKey: (listenKey) => {
		options.url = url.parse(URL + USER_DATA_STREAM_PATH + '?listenKey=' + listenKey);
		options.method = 'PUT';
		options.headers['X-MBX-APIKEY'] = API_KEY;

		return call(options);		
	},
	closeListenKey: (listenKey) => {
		options.url = url.parse(URL + USER_DATA_STREAM_PATH + '?listenKey=' + listenKey);
		options.method = 'DELETE';
		options.headers['X-MBX-APIKEY'] = API_KEY;

		return call(options);				
	},
	accountInfo: () => {
		let params = 'timestamp=' + Date.now();

		let signature = crypto.createHmac('sha256', SECRET_KEY).update(params).digest('hex');
		params = params.concat('&signature=' + signature);

		options.url = url.parse(URL + ACCOUNT_INFO_PATH + '?' + params);
		options.headers['X-MBX-APIKEY'] = API_KEY;
		
		return call(options);		
	},
	order: (symbol, side, type, timeInForce, quantity, price) => {
		let params = 'symbol=' + symbol + '&side=' + side + '&type=' + type + '&timeInForce=' + timeInForce  + '&quantity=' + quantity +
								 '&price=' + price + '&recvWindow=' + 100000000 + '&timestamp=' + Date.now();

		let signature = crypto.createHmac('sha256', SECRET_KEY).update(params).digest('hex');
		params = params.concat('&signature=' + signature);

		options.url = url.parse(URL + ORDER_PATH + '?' + params);
		options.method = 'POST';
		options.headers['X-MBX-APIKEY'] = API_KEY;
		
		return call(options);
	},
	cancelOrder: (symbol, orderId, origClientOrderId) => {
		var params = 'symbol=' + symbol + '&orderId' + orderId + '&origClientOrderId' + origClientOrderId + '&timestamp=' + Date.now();

		var signature = crypto.createHmac('sha256', SECRET_KEY).update(params).digest('hex');
		params = params.concat('&signature=' + signature);

		options.url = url.parse(URL + ORDER_PATH + '?' + params);
		options.method = 'DELETE';
		options.headers['X-MBX-APIKEY'] = API_KEY;
		
		return call(options);
	},
	getOpenOrders: (symbol) => {
		var params = 'symbol=' + symbol + '&timestamp=' + Date.now();

		var signature = crypto.createHmac('sha256', SECRET_KEY).update(params).digest('hex');
		params = params.concat('&signature=' + signature);

		options.url = url.parse(URL + ORDER_PATH + '?' + params);
		options.method = 'GET';
		options.headers['X-MBX-APIKEY'] = API_KEY;
		
		return call(options);
	},
	testOrder: (symbol, side, type, timeInForce, quantity, price) => {
		var params = 'symbol=' + symbol + '&side=' + side + '&type=' + type + '&timeInForce=' + timeInForce  + '&quantity=' + quantity + 
								 '&price=' + price + '&timestamp=' + Date.now();

		var signature = crypto.createHmac('sha256', SECRET_KEY).update(params).digest('hex');
		params = params.concat('&signature=' + signature);

		options.url = url.parse(URL + TEST_ORDER_PATH + '?' + params);
		options.method = 'POST';
		options.headers['X-MBX-APIKEY'] = API_KEY;
		
		return call(options);
	},
	ORDER_TYPE: {
		LIMIT: 'LIMIT',
		MARKET: 'MARKET',
		STOP_LOSS: 'STOP_LOSS',
		STOP_LOSS_LIMIT: 'STOP_LOSS',
		TAKE_PROFIT: 'TAKE_PROFIT',
		TAKE_PROFIT_LIMIT: 'TAKE_PROFIT_LIMIT',
		LIMIT_MAKER: 'LIMIT_MAKER'
	},
	ORDER_SIDE: {
		BUY: 'BUY',
		SELL: 'SELL'
	},
	ORDER_STATUS: {
		NEW: 'NEW',
		PARTIALLY_FILLED: 'PARTIALLY_FILLED',
		FILLED: 'FILLED',
		CANCELED: 'CANCELED',
		REJECTED: 'REJECTED',
		EXPIRED: 'EXPIRED'
	},
	TIME_IN_FORCE: {
		GTC: 'GTC',
		IOC: 'IOC',
		FOK: 'FOK'
	}
};
