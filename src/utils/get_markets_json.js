const { getSortedMarkets } = require('../lib');

const watchedExchanges = [
    'binance', 
    'binanceus', 
    'binanceje', 
    'bitfinex', 
    'bitstamp',
    'bittrex',
    'coinbasepro',
    'coinex',
    'gateio',
    'gemini'
];

(async function() {
    const universe = await getSortedMarkets(watchedExchanges);
    const universeSorted = {}

    for (const exchangeName of watchedExchanges) {
        let exchangeGrouped = [];
        let exchangeFlattened = [];

        // Generate list of trading pairs and append to exchangeGrouped[]
        const markets = universe[exchangeName];
        for (const quote in markets) {
            for (const base of markets[quote]) {
                exchangeGrouped[quote] = exchangeGrouped[quote] || [];
                exchangeGrouped[quote].push(`${base}_${quote}`.toUpperCase());
            }
        }

        // Flatten exchangeGrouped to exchangeFlat, preserving the grouping order
        for (const quote in exchangeGrouped) {
            for (const base of exchangeGrouped[quote]) {
                exchangeFlattened.push(`${base}`)
            }
        }

        universeSorted[exchangeName] = exchangeFlattened;
    };

    // Output prettified valid JSON for 'universe.json'
    console.log(JSON.stringify(universeSorted, null, '\t'));
})();