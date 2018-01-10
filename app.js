var moment = require('moment');
var _ = require('lodash');
var fs = require('fs');

const binance = require('node-binance-api');
// const MongoClient = require('mongodb').MongoClient;

const USDT_SYMBOL = 'USDT';
const BTC_SYMBOL = 'BTC';
const MIN_PROFIT = 1;
const INTERVAL_TIMER = 10000;

const BASE_SYMBOLS = [USDT_SYMBOL];
var tradingDataList = [];

binance.prices((ticker) => {
	var allPairs = _.keys(ticker);
	BASE_SYMBOLS.forEach((symbol) => {
			tradingDataList.push(initTradingData(symbol, allPairs));
	});

	setInterval(() => {
		console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']', 'LOOP START');
		binance.prices((ticker) => {
			tradingDataList.forEach((tradeData) => {
				lookForTrade(tradeData, ticker);
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

	return { baseSymbol: baseSymbol, allTradeSymbols: allSymbols, baseSymbolPairs: baseSymbolPairs, tradePairs: tradePairs };
};

var lookForTrade = (tradeData, prices) => {
	tradeData.baseSymbolPairs.forEach((pair) => {
		var symbol = pair.replace(tradeData.baseSymbol, '');
		var symbolPairs = _.filter(tradeData.tradePairs, (tradePair) => { return tradePair.indexOf(symbol) !== -1 && tradePair.indexOf(USDT_SYMBOL) === -1; });
		
		symbolPairs.forEach((symbolPair) => {
			var path = [pair, symbolPair];
			var secondSymbol = symbolPair.replace(symbol, '');
			path.push(_.find(tradeData.baseSymbolPairs, (pair) => { return pair.indexOf(secondSymbol) !== -1; }));

			var currentSymbolQuantity, finalBaseSymbolQuantity;
			path.forEach((pairInPath, index) => {
				var price = prices[pairInPath];
				if(index === 0) {
					currentSymbolQuantity = 1 / price;
				} else if(index === path.length - 1) {
					finalBaseSymbolQuantity = currentSymbolQuantity * price;
				} else {
					currentSymbolQuantity = (pairInPath.indexOf(symbol) === 0) ? (currentSymbolQuantity * price) : (currentSymbolQuantity / price);
				}
			});
			var profit = (finalBaseSymbolQuantity - 1) * 100;
			if(profit >= MIN_PROFIT) {
				console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']', path[0], '-', path[1], '-', path[2], profit, '%');
			}
		});
	});
};