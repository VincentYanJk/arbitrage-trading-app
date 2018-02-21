var moment = require('moment');
var _ = require('lodash');
var Datastore = require('nedb');

const binance = require('node-binance-api');

const USDT_SYMBOL = 'USDT';
const BTC_SYMBOL = 'BTC';
const ETH_SYMBOL = 'ETH';
const BNB_SYMBOL = 'BNB';

const MIN_PROFIT = 0;
const INTERVAL_TIMER = 5000;

const BASE_SYMBOLS = [BTC_SYMBOL];
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
	var allSymbols = [];
	var baseSymbolPairs = _.filter(allPairs, (pair) => { return pair.startsWith(baseSymbol) || pair.endsWith(baseSymbol); });
	baseSymbolPairs = _.map(baseSymbolPairs, (pair) => {
		var mainSymbol, secondSymbol;
		if(pair.endsWith(baseSymbol)) {
			mainSymbol = baseSymbol;
			secondSymbol = pair.replace(baseSymbol, '');
			allSymbols.push(secondSymbol);
		} else if(pair.startsWith(baseSymbol)) {
			mainSymbol = pair.replace(baseSymbol, '');
			secondSymbol = baseSymbol;
			allSymbols.push(mainSymbol);
		}
		return {
			pair: pair,
			mainSymbol: mainSymbol,
			secondSymbol: secondSymbol
		}
	});

	var tradePairs = [];
	allSymbols.forEach((symbol, index) => {
		for(var i = index + 1; i < allSymbols.length; i++) {
			var secondSymbol = allSymbols[i];
			var tradePair = _.find(allPairs, (pair) => { 
				return ((pair.startsWith(symbol) && pair.endsWith(secondSymbol)) || (pair.startsWith(secondSymbol) && pair.endsWith(symbol))) 
								&& pair.length === (symbol.length + secondSymbol.length); 
			});
			if(tradePair) {
				var mainSymbol, secondPairSymbol;
				if(tradePair.endsWith(symbol)) {
					mainSymbol = symbol;
					secondPairSymbol = secondSymbol;
				} else if(tradePair.startsWith(symbol)) {
					mainSymbol = secondSymbol;
					secondPairSymbol = symbol;
				}
				tradePairs.push({ pair: tradePair, mainSymbol: mainSymbol, secondSymbol: secondPairSymbol });
			}
		}
	});
	db[baseSymbol] = new Datastore({ filename: './db/' + baseSymbol.toLowerCase() + '.db', autoload: true });
	return { baseSymbol: baseSymbol, allTradeSymbols: allSymbols, baseSymbolPairs: baseSymbolPairs, tradePairs: tradePairs };
};

var lookForTrade = (tradeData, tickers) => {
	var time = Date.now();
	tradeData.baseSymbolPairs.forEach((pair) => {
		var symbol = (tradeData.baseSymbol === pair.mainSymbol) ? pair.secondSymbol : pair.mainSymbol;
		var symbolPairs = _.filter(tradeData.tradePairs, (tradePair) => { return tradePair.mainSymbol === symbol || tradePair.secondSymbol === symbol; });

		symbolPairs.forEach((symbolPair) => {
			var path = [{ pair: pair }, { pair: symbolPair }];
			var secondSymbol = (symbol !== symbolPair.mainSymbol) ? symbolPair.mainSymbol : symbolPair.secondSymbol;
			path.push({ pair: _.find(tradeData.baseSymbolPairs, (pair) => { return pair.mainSymbol === secondSymbol || pair.secondSymbol === secondSymbol; }) });

			var quantity = 1, currentSymbol = tradeData.baseSymbol;
			for(var i = 0; i < path.length; i++) {
				var pairInPath = path[i];
				var ticker = tickers[pairInPath.pair.pair];

				pairInPath.bid = ticker.bid;
				pairInPath.ask = ticker.ask;
				
				if(pairInPath.pair.mainSymbol === currentSymbol) {
					quantity = quantity / ticker.ask;
					currentSymbol = pairInPath.pair.secondSymbol;
				} else if(pairInPath.pair.secondSymbol === currentSymbol) {
					quantity = quantity * ticker.bid;
					currentSymbol = pairInPath.pair.mainSymbol;
				} else {
					quantity = 1;
					break;
				}
			};
			var profit = (quantity - 1) * 100;
			if(profit >= MIN_PROFIT) {
				db[tradeData.baseSymbol].insert({ path: path, profit: profit, time: time });
				console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']', path[0].pair.pair, '-', path[1].pair.pair, '-', path[2].pair.pair, profit, '%');
			}
		});
	});
};