const ccxt = require('ccxt');
const ccxws = require('ccxws');
const fs = require('fs');
const Sequelize = require('sequelize');
const squel = require('squel').useFlavour('postgres')
const _ = require('lodash');
const program = require('commander');

const { 
    convertExchangeNameCcxt2Ccxws, 
    getExchangeSpecificMarket, 
    sleep, 
    printLogo 
} = require('./lib');
const groups = require('./config/groups.json');
const universe = require('./config/universe.json');

const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/config/config.json')[env];
let sequelize = new Sequelize(config.database, config.username, config.password, config);

L2UPDATE_BUFFER_FLUSH_INTERVAL_MS = 1000;
SAME_EXCHANGE_CONNECTION_DELAY_MS = 120000  // 2 mins between creation of new Exchange instances
UNSUBSCRIBE_START_DELAY_MS = 60000;         // 1 min
UNSUBSCRIBE_QUEUE_INTERVAL_MS = 500;
UNSUBSCRIBE_BLACKLIST = ['binance', 'binanceje', 'binanceus'];



/**
 * Queue Unsubscribe requests to avoid spamming the exchange's API
 * Unsubscribes 1 market every `UNSUBSCRIBE_QUEUE_INTERVAL_MS` milliseconds
 * For use by individual Exchange instance
 */
class Unsubscriber {
    constructor(exchangeWs) {
        this.exchangeWs = exchangeWs;  // ccxsws object
        this.queue = [];
    }

    start() {
        setInterval(() => {
            if (this.queue.length) {
                const market = this.queue.shift();
                console.log(`[${this.exchangeWs._name}] [${market.base}_${market.quote}] \tUnsubscribing L2 Snapshots`);
                this.exchangeWs.unsubscribeLevel2Snapshots(getExchangeSpecificMarket(this.exchangeWs._name, market));
            }
        }, UNSUBSCRIBE_QUEUE_INTERVAL_MS);
    }

    enqueue(market) {
        this.queue.push(market);
    }
}


class Orderbook {
    constructor(snapshot) {
        this.exchange = snapshot.exchange;
        this.base = snapshot.base;
        this.quote = snapshot.quote;
        this.sequenceId = snapshot.sequenceId;
        this.asks = snapshot.asks;
        this.bids = snapshot.bids;
        this.updatesBuffer = {
            asks: {},
            bids: {},
            lastFlush: Date.now()
        };
        this.tableName = `${this.exchange}_${this.base}_${this.quote}_orderbook`.toLowerCase();
        this.id = `${this.exchange}-${this.base}-${this.quote}`;
        this._ignoreL2Snapshots = false;        // whether to handle l2snapshot events
    }

    _applySnapshot(snapshot) {
        // Removed: Convert bids/asks to hashmap and update this.bids, this.asks

        // Prepare database payload
        let asks = {},
            bids = {};
        snapshot.asks.forEach(p => {
            asks[p.price] = parseFloat(p.size);
        })
        snapshot.bids.forEach(p => {
            bids[p.price] = parseFloat(p.size);
        })
        snapshot.asks = JSON.stringify(asks);
        snapshot.bids = JSON.stringify(bids);
        delete snapshot['exchange'];
        delete snapshot['base'];
        delete snapshot['quote'];

        // Write to database
        try {
            let q = squel.insert({
                            autoQuoteFieldNames: true,
                            autoQuoteTableNames: true,
                            nameQuoteCharacter: '"',
                            tableAliasQuoteCharacter: '"',
                            fieldAliasQuoteCharacter: '"'
                        })
                        .into(this.tableName)
                        .setFields(snapshot)
                        .toString();
            sequelize.query(q, { type: Sequelize.QueryTypes.INSERT });
            const totalUpdates = Object.keys(snapshot.asks).length + Object.keys(snapshot.bids).length;
            console.log(`[${this.exchange}] [${this.base}_${this.quote}] \tFlushing to database: ${totalUpdates} updates`)
        } catch (e) {
            console.log(`ERROR: Error inserting orderbook row for ${this.exchange}_${this.base}_${this.quote}: ${e}`);
        }
    }

    // _applyUpdate(sideName, updates) {
    //     // console.log(`[${this.exchange}] [${this.base.toUpperCase()}_${this.quote.toUpperCase()}] \tApplying ${updates.length} ${sideName} updates`)

    //     let side;
    //     if (sideName == 'asks') {
    //         side = this.asks;
    //     } else {
    //         side = this.bids;
    //     }

    //     // Update local orderbook
    //     updates.forEach(u => {
    //         u.size = parseFloat(u.size);

    //         if (u.size == 0) {
    //             // Remove price level
    //             // // 1. Local orderbook
    //             // delete side[u.price];
    //             // 2. Update buffer
    //             delete this.updatesBuffer[sideName][u.price];

    //         } else {
    //             // Update price level
    //             // // 1. Local orderbook
    //             // side[u.price] = u.size
    //             // 2. Update buffer
    //             this.updatesBuffer[sideName][u.price] = u.size;
    //         }
    //     });
    // }

    _applyUpdate(update) {
        // console.log(`[${this.exchange}] [${this.base.toUpperCase()}_${this.quote.toUpperCase()}] \tApplying ${updates.length} ${sideName} updates`)

        // Update buffer
        ['asks', 'bids'].forEach(sideName => {
            update[sideName].forEach(u => {
                u.size = parseFloat(u.size);
                if (u.size == 0) {
                    // Remove price level
                    delete this.updatesBuffer[sideName][u.price];
                } else {
                    // Update price level
                    this.updatesBuffer[sideName][u.price] = u.size;
                }
            });
        });

        // Flush buffer to database, if needed
        if (Date.now() - this.updatesBuffer.lastFlush > L2UPDATE_BUFFER_FLUSH_INTERVAL_MS) {
            // Check if any data exists to flush
            if (Object.keys(this.updatesBuffer.asks).length || Object.keys(this.updatesBuffer.bids).length) {
                // Prepare payload
                const flushTime = new Date();
                const payload = {
                    asks: JSON.stringify(this.updatesBuffer.asks),
                    bids: JSON.stringify(this.updatesBuffer.bids),
                    isSnapshot: false,
                    serverTimestamp: flushTime.toISOString()
                };

                // Clear buffer
                this.updatesBuffer.asks = {};
                this.updatesBuffer.bids = {};
                this.updatesBuffer.lastFlush = flushTime;

                // Write to database
                try {
                    let q = squel.insert({
                                    autoQuoteFieldNames: true,
                                    autoQuoteTableNames: true,
                                    nameQuoteCharacter: '"',
                                    tableAliasQuoteCharacter: '"',
                                    fieldAliasQuoteCharacter: '"'
                                })
                                .into(this.tableName)
                                .setFields(payload)
                                .toString();
                        sequelize.query(q, { type: Sequelize.QueryTypes.INSERT });
                    const totalUpdates = Object.keys(payload.asks).length + Object.keys(payload.bids).length;
                    console.log(`[${this.exchange}] [${this.base}_${this.quote}] \tFlushing to database: ${totalUpdates} updates`)
                } catch (e) {
                    console.log(`ERROR: Error inserting orderbook row for ${this.exchange}_${this.base}_${this.quote}: ${e}`);
                }
            }
        }
    }

    apply(data, market, isSnapshot) {
        if (isSnapshot) {
            data.isSnapshot = true;
            this._applySnapshot(data);
        } else {
            data.isSnapshot = false;
            this._applyUpdate(data);
            // this._applyUpdate('asks', data.asks);
            // this._applyUpdate('bids', data.bids);
        }
    }

    _flush(flushTime) {

    }
}


class Exchange {
    constructor(exchangeName, watchedMarkets) {
        this.exchangeName = exchangeName;
        this.watchedMarkets = watchedMarkets;
        this.orderbooks = {};
        this.listeners = {
            'trade': null,
            'l2snapshot': null,
            'l2update': null
        };
        this.unsubscriber = null;
    }

    start() {
        // Start subscribing to websocket data feeds and ingesting to DB
        this._init_exchangeWs();
    }

    async _init_exchangeWs() {
        this.exchangeWs = new ccxws[convertExchangeNameCcxt2Ccxws(this.exchangeName)];

        // Create and start Unsubscriber
        this.unsubscriber = new Unsubscriber(this.exchangeWs);
        setTimeout(() => {
            this.unsubscriber.start();
        }, UNSUBSCRIBE_START_DELAY_MS);
        
        
        // 'connect' event handler
        // Gemini
        if (this.exchangeName == 'gemini') {
            this.exchangeWs.on('connected', (new_remote_id) => {
                this.exchangeWs._subscriptions.forEach( (subscription, remote_id) => {
                    if (new_remote_id == remote_id ) {
                        console.log(`[${this.exchangeName}] \tConnected to exchange ${this.exchangeWs._name} [${subscription.wss._wssPath}]`);
                    }
                });

                // Initialize trade/l2 event listeners
                this._init_trade_handlers();
                this._init_l2_orderbook_handlers();
            });
        } 
        // ccxws.MultiClient
        else if (this.exchangeName == 'coinex') {
            this.exchangeWs.on('connected', async (market) => {
                for (const [marketId, client] of this.exchangeWs._clients) {
                    if (market.id  == marketId) {
                        const awaitedClient = await client;
                        console.log(`[${this.exchangeName}] \tConnected to exchange ${awaitedClient._name} [${market.id}] [${awaitedClient._wssPath}]`);
                    }
                }

                // Initialize trade/l2 event listeners
                this._init_trade_handlers();
                this._init_l2_orderbook_handlers();
            })
        }
         // All other exchanges
         else {  
            this.exchangeWs.on('connected', () => {
                console.log(`[${this.exchangeName}] \tConnected to exchange ${this.exchangeWs._name} [${this.exchangeWs._wss._wssPath}]`);

                // Initialize trade/l2 event listeners
                this._init_trade_handlers();
                this._init_l2_orderbook_handlers();
            });
        }
        
        // Subscribe to WS feeds
        for (const market of this.watchedMarkets) {
            // Rate limit for gemini
            if (this.exchangeName == 'gemini') {
                await new Promise(r => setTimeout(r, 1000));
            }

            if (this.exchangeWs.hasTrades) {
                console.log(`[${this.exchangeName}] [${market.id}] \tSubscribing to Trades`);
                this.exchangeWs.subscribeTrades(getExchangeSpecificMarket(this.exchangeName, market));
            }
            if (this.exchangeWs.hasLevel2Snapshots) {
                console.log(`[${this.exchangeName}] [${market.id}] \tSubscribing to L2 snapshots`);
                this.exchangeWs.subscribeLevel2Snapshots(getExchangeSpecificMarket(this.exchangeName, market));
            }
            if (this.exchangeWs.hasLevel2Updates) {
                console.log(`[${this.exchangeName}] [${market.id}] \tSubscribing to L2 updates`);
                this.exchangeWs.subscribeLevel2Updates(getExchangeSpecificMarket(this.exchangeName, market));
            }
        };
    }

    _init_trade_handlers() {
        this.listeners['trade'] = async (trade, market) => {
            setImmediate(() => {
                trade.serverTimestamp = new Date().toISOString();
                trade.exchangeTimestamp = new Date(parseInt(trade.unix)).toISOString();
                delete trade['unix'];
                delete trade['exchange'];
                delete trade['base'];
                delete trade['quote'];
    
                try {
                    // console.log(`[${this.exchangeName}] [${market.id}] \tNew trade: ${market.id}, ${trade.tradeId}`);
                    const tradesTableName = `${this.exchangeName}_${market.base}_${market.quote}_ticks`.toLowerCase();
                    const q = squel.insert({
                                    autoQuoteFieldNames: true,
                                    autoQuoteTableNames: true,
                                    nameQuoteCharacter: '"',
                                    tableAliasQuoteCharacter: '"',
                                    fieldAliasQuoteCharacter: '"'
                                })
                                .into(tradesTableName)
                                .setFields(trade)
                                .toString();
                    sequelize
                        .query(q, { type: Sequelize.QueryTypes.INSERT })
                        .catch(e => {
                            console.log(`[${this.exchangeName}] [${market.id}] \tERROR: Error inserting trade: ${e} \n\tSQL: \t${q} \n\ttrade: \t`, trade);
                        });
                } catch (e) {
                    console.log(`[${this.exchangeName}] [${market.id}] \tERROR: Error inserting trade: ${trade}: ${e}`);
                }
            });
        };
        
        this.exchangeWs.on('trade', this.listeners['trade']);
        console.log(`[${this.exchangeName}] Initialized Trade listeners`);
    }

    _init_l2_orderbook_handlers() {
        // l2snapshot event listener
        this.listeners['l2snapshot'] = (snapshot, market) => {

            setImmediate(() => {
                const orderbook = this.orderbooks[market.id]
                
                snapshot.serverTimestamp = new Date().toISOString();
                if (snapshot.hasOwnProperty('timestampMs') && snapshot.timestampMs !== null) {
                    snapshot.exchangeTimestamp = new Date(parseInt(snapshot.timestampMs)).toISOString();
                }
                delete snapshot['timestampMs'];

                if (orderbook == null) {
                    // Use snapshot
                    console.log(`[${this.exchangeName}] [${market.id}] \tOrderbook snapshot used!`)
                    this.orderbooks[market.id] = new Orderbook(snapshot);
                    const orderbook = this.orderbooks[market.id]
                    orderbook.apply(snapshot, market, true);
                    
                    // Ignore 'l2snapshot' events for this market
                    // Continue to unsubscribe market from feed, if not in UNSUBSCRIBE_BLACKLIST
                    orderbook._ignoreL2Snapshots = true;
                    console.log(`[${this.exchangeName}] [${market.id}] \tStop listening to L2 snapshots`);

                    // Queue unsubscribe requests with delays to avoid spamming API
                    // Exchanges in blacklist will disconnect when unsub request is sent
                    if (UNSUBSCRIBE_BLACKLIST.indexOf(this.exchangeName) == -1) {     
                        this.unsubscriber.enqueue(market);
                    }
                    
                } else {
                    // Ignore, if needed
                    if (orderbook._ignoreL2Snapshots) {
                        return
                    }

                    // Unsubscribe request may not have finished processing
                    // - Overwriting existing snapshot if newer snapshot received
                    if ((snapshot.sequenceId > orderbook.sequenceId) || (typeof snapshot.sequenceId === 'undefined')) {
                        console.log(`[${this.exchangeName}] [${market.id}]  Newer orderbook snapshot used!`);
                        this.orderbooks[market.id] = new Orderbook(snapshot);
                        this.orderbooks[market.id].apply(snapshot, market, true);
                    } else {
                        console.log(`[${this.exchangeName}] [${market.id}]: \tIgnoring stale snapshot (sequenceId: ${snapshot.sequenceId})...`);
                    }
                }
            });
        };

        // l2update event listener
        this.listeners['l2update'] = (update, market) => { 

            setImmediate(() => {
                // console.log('update', update.sequenceId, update.lastSequenceId)
                
                const orderbook = this.orderbooks[market.id]
                update.serverTimestamp = new Date().toISOString();
                if (update.hasOwnProperty('timestampMs') && update.timestampMs !== null) {
                    update.exchangeTimestamp = new Date(parseInt(update.timestampMs)).toISOString();
                }
                delete update['timestampMs'];
                
                // Skip if no orderbook in memory (TODO: Handle this by buffering the l2updates)
                if (orderbook == null) {
                    console.log(`[${this.exchangeName}] [${market.id}] \tL2 Update received before Snapshot. Skipping...`)
                    return;
                }

                // Handle updates with no sequenceId (eg: coinbasepro)
                if (typeof update.sequenceId === 'undefined') {
                    orderbook.apply(update, market, false);
                    return;
                }

                // Drop any updates older than snapshot
                if ((update.sequenceId <= (orderbook.sequenceId + 1)) && ((orderbook.sequenceId + 1) <= update.lastSequenceId)) {
                    // console.log(`[${this.exchangeName}] [${market.id}] \tProcess update ${update.sequenceId}-${update.lastSequenceId}`);
                    orderbook.sequenceId = update.lastSequenceId;
                    orderbook.apply(update, market, false);

                } else if (update.lastSequenceId < (orderbook.sequenceId + 1)){
                    console.log(`[${this.exchangeName}] [${market.id}] \tDiscard stale update ${update.sequenceId}-${update.lastSequenceId}`);
                } else if ((orderbook.sequenceId + 1) < update.sequenceId) {
                    console.log(`[${this.exchangeName}] [${market.id}] \tOUT OF SYNC!!! orderbook.sequenceId=${orderbook.sequenceId}, update.sequenceId=${update.sequenceId}`);
                    this.orderbooks[market.id] = null;
                    orderbook._ignoreL2Snapshots = false;
                    // this.exchangeWs.subscribeLevel2Snapshots(market);
                }
            });

        };

        // Attach listener functions to events
        console.log(`[${this.exchangeName}] Initialized L2 orderbook listeners`);
        this.exchangeWs.on("l2snapshot", this.listeners['l2snapshot']);
        this.exchangeWs.on("l2update", this.listeners['l2update']);
    }
}



/*********************************
 * Main Process
 *********************************/

 // CLI Arguments
program
    .option('-g, --group <type>', 'exchange group number')
program.parse(process.argv);

// Display header & stats
printLogo('cryptopip');
printLogo('ingestor');
console.log(`\nENV:\t\t${env}`);
console.log(`Database:\t${config.host}`);
const revision = require('child_process')
    .execSync('git rev-parse HEAD')
    .toString().trim();
console.log(`\Revision:\t${revision}`);
console.log('\n');

// Catch undefined exchange group
if (typeof program.group == 'undefined') {
  console.log('\ERROR: Please specify an exchange group.');
  process.exit(1);
}

// Catch invalid exchange group
if (!groups.hasOwnProperty(program.group)) {
  console.log('\nPlease enter a valid exchange group number.');
  process.exit(1);
}

// Everything's good. Proceed to load exchange
let totalMarkets = 0;
let watchedExchanges = groups[program.group];
console.log(`Loading Exchanges from Group ${program.group}:`)
for (const group of watchedExchanges) {
  console.log(`\t- ${group} (${universe[group].length} markets)`);
  totalMarkets += universe[group].length;
}
console.log(`\nTotal Exchanges:\t${watchedExchanges.length}`);
console.log(`Total Markets:\t\t${totalMarkets}`);

(async function() {

    // watchedExchanges = [
    //     'binance', 
    //     'binanceus', 
    //     'binanceje', 
    //     'bitfinex', 
    //     'bitstamp',
    //     // 'bittrex',       // Some problems: undefined exchange * wwsurl, missing snaphots, only updates 
    //     'coinbasepro',
    //     // 'coinex',        // TODO: Test again, slow at creatig 400+ WS connections
    //     // 'gemini',        // TODO: Getting trades but not orderbook updates
    //     'gateio'
    // ];

    for (const exchangeName of watchedExchanges) {
        const exchangeCcxt = new ccxt[exchangeName];
        let markets = await exchangeCcxt.loadMarkets();    // may load new markets not in local database

        // Limit to 300 markets per 'Exchange' instance
        // Binance's 600+ markets will cause a WS URL that is too long
        // This results in a API error code 414
        const chunkSize = 300;
        const marketsArray = Object.keys(markets).map((k) => ({[k]: markets[k]}));
        let chunkedMarkets = marketsArray.reduce((resultArray, item, index) => { 
            const chunkIndex = Math.floor(index/chunkSize)
            if(!resultArray[chunkIndex]) {
                resultArray[chunkIndex] = {} // start a new chunk
              }
              Object.keys(item).forEach(key => {
                resultArray[chunkIndex][key] = item[key]
              })
              return resultArray
        }, []);

        // Create and start 'Exchange' instance
        for (const markets of chunkedMarkets) {
            let watchedMarkets = [];
            for (let name in markets) {
                watchedMarkets.push({
                    id: markets[name].id,
                    base: markets[name].base,
                    quote: markets[name].quote,
                });
            }
    
            // FOR TESTING: Limit number of markets
            // watchedMarkets = watchedMarkets.slice(0, 5);

            console.log(`\n[${exchangeName}] \t${watchedMarkets.length} markets`)
            
            // Start ingesting live exchange data
            const exchange = new Exchange(exchangeName, watchedMarkets);
            exchange.start();

            // Delay to avoid hitting API rate limits
            await sleep(SAME_EXCHANGE_CONNECTION_DELAY_MS);

            return // TODO: Remove after testing
        }
    };

})();
