const ccxtpro = require('ccxt.pro');

(async () => {
    const exchange = new ccxtpro['kraken']({
        enableRateLimit: true,
        options: {
            tradesLimit: 1
        }
    });

    // numTicks = 0;
    while(true) {
        const trades = await exchange.watchTrades('ETH/BTC');
        console.log(trades)

        // numTicks += 1;
        // if (numTicks > 20) {
        //     break;
        // }
    }

    process.exit(0);
})();
