var moment = require('moment');
var _ = require('lodash');
var fs = require('fs');
var Datastore = require('nedb');

const binance = require('node-binance-api');

const USDT_SYMBOL = 'USDT';
const BTC_SYMBOL = 'BTC';
const MIN_PROFIT = 1;
const INTERVAL_TIMER = 5000;

const BASE_SYMBOLS = [USDT_SYMBOL, BTC_SYMBOL];
var tradingDataList = [];
var db = {};

console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']', 'Program started ...');
binance.prices((ticker) => {
	var allPairs = _.keys(ticker);
	BASE_SYMBOLS.forEach((symbol) => {
			tradingDataList.push(initTradingData(symbol, allPairs));
	});
	console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']', 'Trading data initialized ...');
	setInterval(() => {
		console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']', 'Looking for trades ...');
		binance.bookTickers((tickers) => {
			tradingDataList.forEach((tradeData) => {
				lookForTrade(tradeData, tickers);
			});
		});
	}, INTERVAL_TIMER);
});

var initTradingData = (baseSymbol, allPairs) => {
	var baseSymbolPairs = _.filter(allPairs, (pair) => { return pair.indexOf(baseSymbol) !== -1; });
	var allSymbols = [];
	baseSymbolPairs.forEach((pair) => {
		allSymbols.push(pair.replace(baseSymbol, ''));
	});

	var tradePairs = [];
	allSymbols.forEach((symbol, index) => {
		for(var i = index + 1; i < allSymbols.length; i++) {
			var secondSymbol = allSymbols[i];
			var tradePair = _.find(allPairs, (pair) => { return pair.indexOf(symbol) !== -1 && pair.indexOf(secondSymbol) !== -1; });
			if(tradePair) {
				tradePairs.push(tradePair);
			}
		}
	});
	db[baseSymbol] = new Datastore({ filename: './db/' + baseSymbol.toLowerCase() + '.db', autoload: true });
	return { baseSymbol: baseSymbol, allTradeSymbols: allSymbols, baseSymbolPairs: baseSymbolPairs, tradePairs: tradePairs };
};

var lookForTrade = (tradeData, tickers) => {
	var time = Date.now();
	tradeData.baseSymbolPairs.forEach((pair) => {
		var symbol = pair.replace(tradeData.baseSymbol, '');
		var symbolPairs = _.filter(tradeData.tradePairs, (tradePair) => { return tradePair.indexOf(symbol) !== -1 && tradePair.indexOf(USDT_SYMBOL) === -1; });
		
		symbolPairs.forEach((symbolPair) => {
			var path = [pair, symbolPair];
			var secondSymbol = symbolPair.replace(symbol, '');
			path.push(_.find(tradeData.baseSymbolPairs, (pair) => { return pair.indexOf(secondSymbol) !== -1; }));

			var currentSymbolQuantity, finalBaseSymbolQuantity;
			path.forEach((pairInPath, index) => {
				var ticker = tickers[pairInPath];
				if(index === 0) {
					currentSymbolQuantity = 1 / ticker.ask;
				} else if(index === path.length - 1) {
					finalBaseSymbolQuantity = currentSymbolQuantity * ticker.bid;
				} else {
					currentSymbolQuantity = (pairInPath.indexOf(symbol) === 0) ? (currentSymbolQuantity * ticker.bid) : (currentSymbolQuantity / ticker.ask);
				}
			});
			var profit = (finalBaseSymbolQuantity - 1) * 100;
			if(profit >= MIN_PROFIT) {
				db[tradeData.baseSymbol].insert({ path: path, profit: profit, time: time });
				console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']', path[0], '-', path[1], '-', path[2], profit, '%');
			}
		});
	});
};