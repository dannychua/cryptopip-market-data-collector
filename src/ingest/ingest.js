const ccxtpro = require('ccxt.pro');
const _ = require('lodash');
const program = require('commander');

const { sleep } = require('../lib');
const { saveTradesToDatalake, saveOrderbooksToDatalake } = require('../lib/db');
const { HeartbeatClient } = require('../heartbeat/client');

BUFFER_FLUSH_INTERVAL_MS = {
    TRADES: 5000,
    ORDERBOOKS: 1000
};
ORDERBOOK_DIFF_CALC_INTERVAL_MS = BUFFER_FLUSH_INTERVAL_MS['ORDERBOOKS'];
MARKET_CHECK_INTERVAL_MS = 60 * 60 * 1000;      // 1 hour



class Exchange {
    constructor(exchangeId) {
        this.exchangeId = exchangeId;
        this.ccxtExchange = new ccxtpro[exchangeId]({
            enableRateLimit: true,
            options: {
                tradesLimit: 1
            }
        });
        this.symbols = undefined;
        this.buffer = {
            trades: [],
            orderbooks: []
        };
        this.flushers = [];
        this.stopTradeWatcher = [];        // if symbol is found by watcher, watcher stops and symbol is removed from this list
        this.stopOrderbookWatcher = [];
        
        this.heartbeatClient = new HeartbeatClient(this.exchangeId);
    }

    /**
     * Start a watcher for a symbol that listens to new trades and inserts them to the trades buffer
     * @param {string} symbol 
     */
    async addTradeWatcher(symbol) {
        const market = this.ccxtExchange.markets[symbol];
        const exchangeSymbol = `${this.ccxtExchange.id.toLowerCase()}_${market.base.toLowerCase()}_${market.quote.toLowerCase()}`;
        let isFirstUpdate = true;
        while (true) {
            if (this.stopTradeWatcher.includes(symbol)) {
                _.pull(this.stopTradeWatcher, symbol);
                break;
            }

            try {
                const trades = await this.ccxtExchange.watchTrades(symbol);
                const serverTimestamp = new Date().toISOString();

                if (isFirstUpdate) {
                    this.heartbeatClient.ingestStarted(exchangeSymbol, 'trades')
                    isFirstUpdate = false;
                }

                for (const trade of trades) {   // in case there is more than 1 trade returned
                    // Ignore trade when no `id` is given
                    // Bitfinex: 
                    //      - first trade object is a snapshot trade with no 'id', ok to skip
                    //      - trade of type 'tu' has no 'id', ok to skip
                    if (trade.id == undefined) {
                        continue
                    }

                    const payload = {
                        tradeId: trade.id,
                        serverTimestamp: serverTimestamp,
                        exchangeTimestamp: new Date(parseInt(trade.timestamp)).toISOString(),
                        symbol: exchangeSymbol,
                        takerOrMaker: trade.takerOrMaker,
                        side: trade.side,
                        price: trade.price,
                        amount: trade.amount,
                    }
                    this.buffer.trades.push(payload);
                }
            } catch (e) {
                console.error(`${exchangeSymbol} | Error during trade processing: ${e}`);
                this.heartbeatClient.ingestStopped(exchangeSymbol, 'trades', e.name, e.message);
            }
        }
        console.log(`${exchangeSymbol} | tradeWatcher stopped`);
        this.heartbeatClient.ingestStopped(exchangeSymbol, 'trades', 'stopped', null);
    }

    /**
     * Process CCXT orderbook snapshot by converting ask/bids to an array of objects
     * @param {*} ccxtSnapshot CCXT orderbook snapshot
     */
    _processSnapshot(ccxtSnapshot) {
        let snapshot = JSON.parse(JSON.stringify(ccxtSnapshot));    // avoid mutating original CCXT snapshot object
        let asks = {};
        let bids = {};
        for (const level of snapshot.asks) {
            asks[level[0]] = level[1];
        }
        for (const level of snapshot.bids) {
            bids[level[0]] = level[1];
        }

        snapshot.asks = asks;
        snapshot.bids = bids;
        return snapshot;
    }

    /**
     * Calculate the delta between one sides of 2 orderbook snapshots's 
     * @param {*} prev Previous snapshot
     * @param {*} curr Current snapshot
     */
    _diffSnapshots(prev, curr) {
        let diff = {};

        // Check for price changes
        for (const [price, amount] of Object.entries(curr)) {
            
            if (prev.hasOwnProperty(price)) {
                if (prev[price] != curr[price]) {
                    diff[price] = amount;
                }
            } else {
                diff[price] = amount;
            }
        }

        // Check for price level removals
        for (const [price, amount] of Object.entries(prev)) {
            if (!curr.hasOwnProperty(price)) {
                diff[price] = 0;
            }
        }

        return diff;
    }

    /**
     * Start a watcher for a symbol that listens to orderbook changes, calculates and inserts deltas to the orderbooks buffer
     * @param {str} symbol 
     */
    async addOrderbookWatcher(symbol) {
        const market = this.ccxtExchange.markets[symbol];
        const exchangeSymbol = `${this.ccxtExchange.id.toLowerCase()}_${market.base.toLowerCase()}_${market.quote.toLowerCase()}`;
        let prevSnapshot;
        let isFirstUpdate = true;

        while (true) {
            if (this.stopOrderbookWatcher.includes(symbol)) {
                _.pull(this.stopOrderbookWatcher, symbol);
                break;
            }

            try {
                const snapshot = this._processSnapshot(await this.ccxtExchange.watchOrderBook(symbol));
                const serverTimestamp = new Date().toISOString();
                let isSnapshot = false;

                if (isFirstUpdate) {
                    this.heartbeatClient.ingestStarted(exchangeSymbol, 'orderbook')
                    isFirstUpdate = false;
                }

                // Calculate snapshot diffs
                let delta;
                if (prevSnapshot) {
                    delta = {
                        asks: this._diffSnapshots(prevSnapshot.asks, snapshot.asks),
                        bids: this._diffSnapshots(prevSnapshot.bids, snapshot.bids)
                    }
                    // console.log(delta)
                } else {
                    delta = {
                        asks: snapshot.asks,
                        bids: snapshot.bids
                    };
                    isSnapshot = true;
                }

                // Continue only if delta is detected
                if (Object.keys(delta.asks).length | Object.keys(delta.bids).length | isSnapshot) {

                    // Use serverTimestamp as exchangeTimestamp if not available
                    let exchangeTimestamp;
                    if (snapshot.timestamp) {
                        exchangeTimestamp = new Date(parseInt(snapshot.timestamp)).toISOString();
                    } else {
                        exchangeTimestamp = serverTimestamp;
                    }

                    // Insert delta to buffer
                    const payload = {
                        serverTimestamp: serverTimestamp,
                        exchangeTimestamp: exchangeTimestamp,
                        symbol: exchangeSymbol,
                        asks: delta.asks,
                        bids: delta.bids,
                        isSnapshot: isSnapshot
                    };
                    this.buffer.orderbooks.push(payload);
    
                    prevSnapshot = JSON.parse(JSON.stringify(snapshot));

                }

            } catch (e) {
                console.error(`${exchangeSymbol} | Error during orderbook processing: ${e}`);
                this.heartbeatClient.ingestStopped(exchangeSymbol, 'orderbook', e.name, e.message);
            }

            await sleep(ORDERBOOK_DIFF_CALC_INTERVAL_MS);
        }
        console.log(`${exchangeSymbol} | orderbookWatcher stopped`);
        this.heartbeatClient.ingestStopped(exchangeSymbol, 'orderbook', 'stopped', null);
    }

    /**
     * Start flushing the buffer to the database at regular intervals
     * @param {str} bufferType 
     */
    async startFlusher(bufferType) {
        let flushInterval;

        while (true) {
            if (this.buffer[bufferType].length) {
                const payload = this.buffer[bufferType];
                this.buffer[bufferType] = [];

                // Insert to datalake
                console.log(`${this.exchangeId} | ${bufferType}: ${payload.length}`);
                if (bufferType == 'trades') {
                    saveTradesToDatalake(payload);
                } else if (bufferType == 'orderbooks') {
                    saveOrderbooksToDatalake(payload);
                } else {
                    console.log(`ERROR: buffertype "${bufferType}" not supported.`);
                }
            }

            await sleep(BUFFER_FLUSH_INTERVAL_MS[bufferType.toUpperCase()]);
        }
    }

    /**
     * Detect listing/delisting of new symbols and start watching their trades and orderbooks
     */
    async startMarketWatcher() {
        await sleep(MARKET_CHECK_INTERVAL_MS);    // initial delay before the first check
        while (true) {
            const prevSymbols = this.symbols;
            await this.ccxtExchange.loadMarkets(true);

            const newSymbols = _.difference(this.symbols, prevSymbols);
            const delistedSymbols = _.difference(prevSymbols, this.symbols);

            if (newSymbols.length > 0) {
                console.log(`${this.exchangeId} | New symbol(s) detected: ${newSymbols}`);
                for (const symbol of newSymbols) {
                    this.addTradeWatcher(symbol);
                    this.addOrderbookWatcher(symbol);
                }
            }
            
            if (delistedSymbols.length > 0) {
                console.log(`${this.exchangeId} | Symbol(s) delisting detected: ${delistedSymbols}`);
                for (const symbol of delistedSymbols) {
                    this.stopTradeWatcher.push(symbol);
                    this.stopOrderbookWatcher.push(symbol);
                }
            }

            if ((newSymbols.length == 0) && (delistedSymbols.length == 0)) {
                console.log(`${this.exchangeId} | No market listing/delisting detected`);
            }

            await sleep(MARKET_CHECK_INTERVAL_MS);
        }
    }

    notifySubscriptionsCompleted(numSymbols) {
        if (this.ccxtExchange.enableRateLimit) {
            setTimeout(() => {
                console.log(`\n${this.exchangeId} | All symbols have (most likely) been subscribed to!`)
            }, this.ccxtExchange.rateLimit * numSymbols * 2);   // *2 for both trades and orderbooks
            console.log('Enabled notification when all queued symbol subscriptions are subscribed to.')
        }
    }

    /**
     * Start listening & saving trades and orderbook snapshots/deltas to database
     */
    async start() {
        await this.ccxtExchange.loadMarkets();
        this.symbols = this.ccxtExchange.symbols;

        // Start buffer flushers
        this.startFlusher('trades');
        this.startFlusher('orderbooks');

        // Start watching for new symbols listing
        this.startMarketWatcher();

        // Start subscribing and listening to trades/orderbooks
        const symbolsSubLimit = this.ccxtExchange.symbols.length;
        let subscribedSymbols = [];
        console.log(`Exchange: \t\t${this.ccxtExchange.id}`);
        console.log(`Symbols (Total): \t${this.ccxtExchange.symbols.length}`);
        for (const symbol of this.ccxtExchange.symbols) {
            this.addTradeWatcher(symbol);
            this.addOrderbookWatcher(symbol);
            subscribedSymbols.push(symbol);
        }
        console.log(`Symbols (Subscribed): \t${subscribedSymbols.length}`);
        console.log(subscribedSymbols);
        this.notifySubscriptionsCompleted(subscribedSymbols.length);
    }
}



/*********************************
 * Main Process
 *********************************/

 // CLI Arguments
program
    .option('-e, --exchange <type>', 'exchange id')
program.parse(process.argv);

// Catch undefined exchange id
if (typeof program.exchange == 'undefined') {
    console.log('\ERROR: Please specify an exchange id.');
    process.exit(1);
}

// Catch invalid exchange id
if (!ccxtpro.exchanges.includes(program.exchange)) {
    console.log('\nPlease enter a valid exchange id.');
    process.exit(1);
}

(async () => {
    new Exchange(program.exchange).start();
})();