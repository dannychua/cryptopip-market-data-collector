/**
 * Compares the update speed of watchTrades and watchOHLCV
 * Conclusion:
 *  - About 2 second delay for watchOHLCV with Binance ETH/BTC
 *  - Delay is due to exchange side, not ccxtpro/client side
 *  - For realtime bars, best to manually construct them from watchTrades
 */

const ccxtpro = require('ccxt.pro');

const watchOhlcv = async (exchange, symbolName) => {
    let lastUpdate = Date.now();
    while (true) {
        try {
            const bars = await exchange.watchOHLCV(symbolName, '15m', undefined, 1);
            const lastBar = bars[bars.length-1];
            console.log(`${Date.now()} | OHLCV ${lastBar[0]} ${lastBar[4]} \t${Date.now() - lastUpdate}ms since last bar update`);   //  bar open timestamp, bar current close price
            lastUpdate = Date.now();
        } catch (e) {
            console.log(e)
        }
    }
}

const watchTrades = async (exchange, symbolName) => {
    while (true) {
        try {
            const trades = await exchange.watchTrades(symbolName, undefined, 1);
            const lastTrade = trades[trades.length-1];
            console.log(`${Date.now()} | Trade ${lastTrade.timestamp} ${lastTrade.price}`)  // trade timestamp, trade price
        } catch (e) {
            console.log(e)
        }
    }
}


const symbolName = 'ETH/BTC';
const exchange = new ccxtpro['binance']({ enableRateLimit: true, verbose: false });
watchTrades(exchange, symbolName);
watchOhlcv(exchange, symbolName);




// 1589851248413 | OHLCV 1589850900000 0.021999 	2879ms since last bar update
// 1589851250305 | Trade 1589851250192 0.022001
// 1589851252419 | OHLCV 1589850900000 0.022001 	4005ms since last bar update
// 1589851254257 | Trade 1589851254147 0.022
// 1589851254394 | Trade 1589851254277 0.021999
// 1589851254435 | Trade 1589851254319 0.021999
// 1589851255962 | Trade 1589851255752 0.021995
// 1589851255963 | Trade 1589851255752 0.021994
// 1589851255964 | OHLCV 1589850900000 0.021995 	3545ms since last bar update
// 1589851256292 | Trade 1589851256193 0.021995
// 1589851258443 | OHLCV 1589850900000 0.021995 	2479ms since last bar update
// 1589851259685 | Trade 1589851259585 0.021994
// 1589851260352 | Trade 1589851260235 0.021997
// 1589851260443 | Trade 1589851260346 0.021997
// 1589851260443 | OHLCV 1589850900000 0.021997 	2000ms since last bar update
// 1589851262223 | Trade 1589851262123 0.021996
// 1589851263028 | Trade 1589851262900 0.021995
// 1589851263030 | OHLCV 1589850900000 0.021995 	2587ms since last bar update
// 1589851264973 | Trade 1589851264823 0.021994
// 1589851264973 | Trade 1589851264823 0.02199
// 1589851267442 | Trade 1589851267337 0.021994
// 1589851267443 | Trade 1589851267337 0.021994
// 1589851267443 | Trade 1589851267337 0.021995
// 1589851267444 | OHLCV 1589850900000 0.021994 	4414ms since last bar update
// 1589851268950 | Trade 1589851268850 0.021991
// 1589851268951 | Trade 1589851268850 0.02199
// 1589851269498 | OHLCV 1589850900000 0.02199 	2054ms since last bar update
// 1589851270940 | Trade 1589851270841 0.021991
// 1589851270941 | Trade 1589851270841 0.021991
// 1589851272243 | Trade 1589851271861 0.021991
// 1589851272244 | OHLCV 1589850900000 0.021991 	2746ms since last bar update
// 1589851273973 | Trade 1589851273873 0.021991
// 1589851273974 | OHLCV 1589850900000 0.021991 	1729ms since last bar update
// 1589851277015 | Trade 1589851276884 0.02199
// 1589851277015 | OHLCV 1589850900000 0.02199 	3041ms since last bar update
// 1589851277732 | Trade 1589851277607 0.021991
// 1589851280542 | OHLCV 1589850900000 0.021991 	3527ms since last bar update
// 1589851282262 | Trade 1589851282161 0.02199
