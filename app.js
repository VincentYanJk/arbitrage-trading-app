const moment = require('moment');
const _ = require('lodash');
const Decimal = require('decimal.js');

const binance = require('./exchange/binance.js');
const ws = require('./ws/ws.js');
const transaction = require('./transaction.js');

const USDT_SYMBOL = 'USDT';
const BTC_SYMBOL = 'BTC';
const ETH_SYMBOL = 'ETH';
const BNB_SYMBOL = 'BNB';

const MIN_PROFIT = 0.00001;
const INTERVAL_TIMER = 4000;

const BASE_SYMBOLS = [BTC_SYMBOL/*, USDT_SYMBOL, ETH_SYMBOL, BNB_SYMBOL*/];
let tradingDataList = [];
let pairsInfo = {};

// MAIN APPLICATION CODE
console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']', 'Program started ...');
binance.info().then((info) => {
    info.symbols.forEach((symbol) => {
        let info = {};
        symbol.filters.forEach((filter) => {
            if (filter.filterType === 'LOT_SIZE') {
                info.step = filter.stepSize;
                info.min = filter.minQty;
                info.base = symbol.baseAsset;
                info.quote = symbol.quoteAsset;
            } else if (filter.filterType === 'PRICE_FILTER') {
                info.tick = filter.tickSize;
            }
        });
        pairsInfo[symbol.symbol] = info;
    });
    console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']', 'Pairs info initialized ...');

    BASE_SYMBOLS.forEach((symbol) => tradingDataList.push(initTradingData(symbol, _.keys(pairsInfo))));
    console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']', 'Trading data initialized ...');

    setInterval(() => {
        console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']', 'Looking for trades ...');
        tradingDataList.forEach((tradeData) => lookForTrade(tradeData, ws.getActualTradeData()));
    }, INTERVAL_TIMER);
});

const initTradingData = (baseSymbol, allPairs) => {
    let allSymbols = [];
    let baseSymbolPairs = _.filter(allPairs, (pair) => pair.startsWith(baseSymbol) || pair.endsWith(baseSymbol));
    baseSymbolPairs = _.map(baseSymbolPairs, (pair) => {
        let mainSymbol, secondSymbol;
        if (pair.endsWith(baseSymbol)) {
            mainSymbol = baseSymbol;
            secondSymbol = pair.replace(baseSymbol, '');
            allSymbols.push(secondSymbol);
        } else if (pair.startsWith(baseSymbol)) {
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

    let tradePairs = [];
    allSymbols.forEach((symbol, index) => {
        for (var i = index + 1; i < allSymbols.length; i++) {
            var secondSymbol = allSymbols[i];
            var tradePair = _.find(allPairs, (pair) => {
                return ((pair.startsWith(symbol) && pair.endsWith(secondSymbol)) || (pair.startsWith(secondSymbol) && pair.endsWith(symbol)))
                    && pair.length === (symbol.length + secondSymbol.length);
            });
            if (tradePair) {
                var mainSymbol, secondPairSymbol;
                if (tradePair.endsWith(symbol)) {
                    mainSymbol = symbol;
                    secondPairSymbol = secondSymbol;
                } else if (tradePair.startsWith(symbol)) {
                    mainSymbol = secondSymbol;
                    secondPairSymbol = symbol;
                }
                tradePairs.push({pair: tradePair, mainSymbol: mainSymbol, secondSymbol: secondPairSymbol});
            }
        }
    });
    // db[baseSymbol] = new Datastore({ filename: './db/' + baseSymbol.toLowerCase() + '.db', autoload: true });
    return {
        baseSymbol: baseSymbol,
        allTradeSymbols: allSymbols,
        baseSymbolPairs: baseSymbolPairs,
        tradePairs: tradePairs
    };
};

const lookForTrade = (tradeData, tickers) => {
    let time = Date.now();
    let profitableTrades = [];
    tradeData.baseSymbolPairs.forEach((pair) => {
        let symbol = (tradeData.baseSymbol === pair.mainSymbol) ? pair.secondSymbol : pair.mainSymbol;
        let symbolPairs = _.filter(tradeData.tradePairs, (tradePair) => {
            return tradePair.mainSymbol === symbol || tradePair.secondSymbol === symbol;
        });

        symbolPairs.forEach((symbolPair) => {
            let path = [{pair: pair}, {pair: symbolPair}];
            let secondSymbol = (symbol !== symbolPair.mainSymbol) ? symbolPair.mainSymbol : symbolPair.secondSymbol;
            path.push({
                pair: _.find(tradeData.baseSymbolPairs, (pair) => {
                    return pair.mainSymbol === secondSymbol || pair.secondSymbol === secondSymbol;
                })
            });

            calculateTradeDataForPath(path, tickers, tradeData.baseSymbol, transaction.getBaseSymbolsQty()['BTC']);
            // console.log(path[0].pair.pair, path[0].neededQty, path[0].tradeQty, path[1].pair.pair, path[1].neededQty, path[1].tradeQty, path[2].pair.pair, path[2].neededQty, path[2].tradeQty);

            if (path.status) {
                let neededQty = new Decimal(path[0].neededQty);
                let tradeQty = new Decimal(path[path.length - 1].tradeQty);
                path.percentageProfit = tradeQty.sub(neededQty).div(neededQty).mul(100).toDecimalPlaces(2).toNumber();
                path.currencyProfit = tradeQty.sub(neededQty).toNumber();
                if (path.currencyProfit >= MIN_PROFIT) {
                    profitableTrades.push(path);
                    console.log('[' + moment().format('DD.MM.YYYY HH:mm:ss') + ']', path[0].pair.pair, '-', path[1].pair.pair, '-', path[2].pair.pair, path.percentageProfit, '%', path.currencyProfit, tradeData.baseSymbol);
                    // console.log(path[0].pair.pair, path[0].neededQty, path[0].tradeQty, path[1].pair.pair, path[1].neededQty, path[1].tradeQty, path[2].pair.pair, path[2].neededQty, path[2].tradeQty);
                }
            }
        });
    });
    if (profitableTrades.length > 0) {
        let mostProfitablePath = _.maxBy(profitableTrades, (trade) => trade.currencyProfit);
        console.log("MOST PROFITABLE TRADE:", mostProfitablePath.currencyProfit, mostProfitablePath.percentageProfit);
        console.log(mostProfitablePath);
        transaction.makeTransactions(mostProfitablePath);
    }
    console.log(`[${tradeData.baseSymbol}] Found`, profitableTrades.length, `trades in`, Date.now() - time, 'ms');
};

const calculateTradeDataForPath = (path, tickers, baseSymbol, baseSymbolQty) => {
    let tradeQty = new Decimal(baseSymbolQty), neededQty,
        currentSymbol = baseSymbol;

    path.status = true;
    for (let i = 0; i < path.length; i++) {
        let pairInPath = path[i];
        let ticker = tickers[pairInPath.pair.pair];

        if (!ticker) {
            path.status = false;
            break;
        }

        let bid = new Decimal(ticker.b), bidQty = new Decimal(ticker.B), ask = new Decimal(ticker.a),
            askQty = new Decimal(ticker.A), info = pairsInfo[pairInPath.pair.pair],
            step = new Decimal(info.step), min = new Decimal(info.min), tick = new Decimal(info.tick);

        if (currentSymbol === info.quote) {
            neededQty = askQty.mul(ask);
            neededQty = tradeQty.lt(neededQty) ? tradeQty : neededQty;
            neededQty = neededQty.divToInt(tick).mul(tick);
            if (neededQty.lt(min)) {
                tradeQty = new Decimal(baseSymbolQty);
                path.status = false;
                break;
            }
            tradeQty = neededQty.div(ask).divToInt(step).mul(step);
            pairInPath.type = 'ask';
            currentSymbol = info.base;
        } else if (currentSymbol === info.base) {
            neededQty = tradeQty.lt(bidQty) ? tradeQty : bidQty;
            neededQty = neededQty.divToInt(step).mul(step);
            if (neededQty.lt(min)) {
                tradeQty = new Decimal(baseSymbolQty);
                path.status = false;
                break;
            }
            tradeQty = neededQty.mul(bid).divToInt(tick).mul(tick);
            pairInPath.type = 'bid';
            currentSymbol = info.quote;
        } else {
            tradeQty = baseSymbolQty;
            break;
        }

        pairInPath.neededQty = neededQty.toNumber();
        pairInPath.tradeQty = tradeQty.toNumber();

        for (let j = i - 1; j > -1; j--) {
            let currentPair = path[j + 1], prevPair = path[j],
                currentPairNeededQty = new Decimal(currentPair.neededQty),
                prevPairTradeQty = new Decimal(prevPair.tradeQty),
                prevPairTypePrice = new Decimal(prevPair[prevPair.type]),
                prevPairTick = new Decimal(prevPair.info.tick),
                prevPairStep = new Decimal(prevPair.info.step);

            if (currentPairNeededQty.lessThan(prevPairTradeQty)) {
                path[j].tradeQty = currentPairNeededQty.toNumber();
                path[j].neededQty = (prevPair.type === 'ask' ? currentPairNeededQty.mul(prevPairTypePrice) : currentPairNeededQty.div(prevPairTypePrice)).divToInt(prevPair.type === 'ask' ? prevPairTick : prevPairStep).mul(prevPair.type === 'ask' ? prevPairTick : prevPairStep).toNumber();
                if (path[j].neededQty === 0) {
                    path.status = false;
                    break;
                }
            }
        }

        pairInPath.bid = bid.toNumber();
        pairInPath.ask = ask.toNumber();
        pairInPath.bidQty = bidQty.toNumber();
        pairInPath.askQty = askQty.toNumber();
        pairInPath.info = info;
    }

    if (path.status) {
        tradeQty = new Decimal(path[0].neededQty);
        for (let i = 0; i < path.length; i++) {
            let pairInPath = path[i];

            let pairNeededQty = new Decimal(pairInPath.neededQty), pairTradeQty = new Decimal(pairInPath.tradeQty);

            if (tradeQty.lt(pairNeededQty)) {

            }

            if (pairInPath.type === 'ask') {

            } else if (pairInPath.type === 'bid') {

            }
        }
    }
};
