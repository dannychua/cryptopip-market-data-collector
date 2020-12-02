const ccxtpro = require('ccxt.pro');

(async () => {
    const exchange = new ccxtpro['bitmex']({
        enableRateLimit: true,
        options: {
            tradesLimit: 1
        }
    });

    // await exchange.loadMarkets();
    // console.log(exchange.symbols)

    while(true) {
        // const trades = await exchange.watchTrades('BTC/USD');
        const trades = await exchange.watchTrades('.BETHXBT');
        console.log(trades)
    }

    process.exit(0);
})();
