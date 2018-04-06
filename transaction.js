const moment = require('moment');

const binance = require('./exchange/binance.js');
const db = require('./db/db.js');

let baseSymbolsQty = {};

binance.accountInfo().then((res) => {
    res.balances.forEach((item) => {
		if (item.asset === 'BTC') {
			baseSymbolsQty['BTC'] = item.free;
		}
	});
});

const makeTransaction = (pair, orderSide, orderType, quantity, price) => {
    console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']', pair, orderSide, quantity, price);
    return binance.order(pair, orderSide, orderType, binance.TIME_IN_FORCE.GTC, quantity, price);
};

const makeTransactions = (path, index) => {
    if (index === undefined) index = 0;
	if(index < path.length) {
		let pairInPath = path[index];
		let start = Date.now();
		makeTransaction(pairInPath.pair.pair, pairInPath.type === 'ask' ? binance.ORDER_SIDE.BUY : binance.ORDER_SIDE.SELL, binance.ORDER_TYPE.LIMIT, pairInPath.type === 'ask' ? pairInPath.tradeQty : pairInPath.neededQty, pairInPath[pairInPath.type])
		.then((res) => {
		    console.log('Request time:', Date.now() - start, 'ms');
			console.log(res);
			if(res.status === binance.ORDER_STATUS.FILLED) {
				makeTransactions(path, index + 1);
			} else {
				// console.log(res);
			}
		});
	}
};

module.exports = {
    makeTransactions: makeTransactions,
	getBaseSymbolsQty: () => baseSymbolsQty,
	setBaseSymbolsQty: (newBaseSymbolsQty) => {
    	baseSymbolsQty = newBaseSymbolsQty;
	}
};