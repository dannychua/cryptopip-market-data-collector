const { getSortedMarkets } = require('../lib');

(async function () {

    const exchanges = [
        'binance',
        'binanceus', 
        'binanceje', 
        'bitfinex', 
        // 'bitmex',            // not in CMC, LCC, strange markets with XXX quotes
        'bitstamp', 
        'bittrex', 
        // 'cex',               // require KYC registration for API keys
        'coinbasepro', 
        'coinex',
        // 'ethfinex',          // delisted by ccxt
        'gateio',
        'gemini',
        'hitbtc2',
        // 'huobipro',          // only L2 orderbook snapshots, no L2 updates
        'kraken', 
        'okex3', 
        'poloniex',
    ];
    const universe = await getSortedMarkets(exchanges)

    // Display stats
    let total = {
        exchanges: 0,
        markets: 0
    };
    for (const exchangeName in universe) {
        const sortedMarkets = universe[exchangeName];
        let numMarketsInExchange = 0;
        let bufferedText = '';

        for (const quote in sortedMarkets) {
            bufferedText += `\t${quote}: ${sortedMarkets[quote].length} markets\n`;
            numMarketsInExchange += sortedMarkets[quote].length;
        }

        console.log(`\n${exchangeName.toUpperCase()}`);
        console.log(`Number of Quotes: ${Object.keys(sortedMarkets).length}`)
        console.log(`Number of Markets: ${numMarketsInExchange}`);
        console.log(bufferedText);

        total.exchanges += 1;
        total.markets += numMarketsInExchange;
    }

    console.log(`\nTotal exchanges: ${total.exchanges}`);
    console.log(`Total markets: ${total.markets}`);


})();