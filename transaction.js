var promise = require('promise');

const binance = require('./exchange/binance.js');

var pair = 'XMRBTC';

var makeTransaction = (pair, orderSide, orderType, quantity, price) => {
	return binance.order(pair, orderSide, orderType, binance.TIME_IN_FORCE.GTC, quantity, price);
};

binance.bookTicker(pair)
.then((ticker) => {
	console.log('price:', ticker.bidPrice, 'qty:', 0.134);
	var start = Date.now();
	makeTransaction(pair, binance.ORDER_SIDE.SELL, binance.ORDER_TYPE.LIMIT, 0.134, ticker.bidPrice)
	.then((res) => {
		console.log(Date.now() - start + ' ms');
		console.log(res);
	});
});
