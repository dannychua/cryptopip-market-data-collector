const _ = require('lodash');
const moment = require('moment');
const ccxt = require('ccxt');

const { sleep, dateToStringUtc, generateTableName, getExchangeSymbols } = require('./lib');
const { getAllTables, getAllSymbols, createTablesForSymbol, getLatestTimestamp, saveOhlcvToDatalake } = require('./lib/db');
const logger = require('./lib/logger')(__filename);



/**
 * Query the exchange API to download the OHLCV bars, starting from 'startTimestamp'
 * @param {str} exchange Name of exchange used in CCXT
 * @param {str} symbol  Name of market symbol
 * @param {int} interval Bar interval ['1m' | '1h' | ...]
 * @param {int} limit Number of bars to fetch
 * @param {int} startTimestamp Unix time (in milliseconds) to start downloading from
 */
const fetchOhlcv = async (exchange, symbol, interval, limit=100000, startTimestamp) => {
    const client = new ccxt[exchange];
    if (!client.has.fetchOHLCV) {
        // console.log(`Exchange ${exchange} does not provide OHLCV. Skipping...`)
        logger.info(`Exchange ${exchange} does not provide OHLCV. Skipping...`)
        return
    }
    return await client.fetchOHLCV(symbol, interval, startTimestamp, limit);
}


/**
 * Query the exchange API to download the OHLCV bars, starting from most recent bar in database.
 * Download all bars until 'endTimestamp'
 * @param {str} exchange Name of exchange used in CCXT
 * @param {str} symbol Name of market stmbol
 * @param {int} interval Bar interval ['1m' | '1h' | ...]
 * @param {int} limit Number of bars to fetch
 * @param {int} endTimestamp Unix time (in milliseconds) to download till
 * @returns {array} Array of objects with database column name as keys. Ready for inserting into database
 */
const fetchOhlcvUntil = async (exchange, symbol, interval, limit=100000, endTimestamp=Date.now()) => {
    // Get most recent timestamp available in database
    let latestTimestamp = await getLatestTimestamp(exchange, symbol, interval);
    latestTimestamp = latestTimestamp || Date.parse('2010-01-01');
    // latestTimestamp = latestTimestamp || Date.parse('2020-02-10');

    let data = [];
    // Keep fetching new OHLCV bars until current time
    do {
        // Add 1 second to latestTimestamp to avoid downloading the same bar that aleady exists in database/'data' array
        latestTimestamp = moment(latestTimestamp).add(1, 's').valueOf();

        const bars = await fetchOhlcv(exchange, symbol, interval, limit, latestTimestamp);
        if (bars.length <= 1) {                 // no trades during this time period
            const intervalUnits = `1${interval[interval.length-1]}`;
            const numIntervals = parseInt(interval.slice(0, interval.length-1));
            latestTimestamp +=  moment(latestTimestamp).add(numIntervals, intervalUnits).valueOf();  // proceed to next time interval
            continue
        }
        data = [...data, ...bars];
        const latestBar = bars[bars.length-1]
        latestTimestamp = latestBar[0]

        // console.log(`${exchange} | ${symbol} | ${interval} | Latest OHLCV bar: \t${dateToStringUtc(new Date(latestTimestamp))}`)
        logger.debug(`${exchange} | ${symbol} | ${interval} | Latest OHLCV bar: \t${dateToStringUtc(new Date(latestTimestamp))}`)

        await sleep(2500);
    } 
    while (latestTimestamp <= endTimestamp);

    // Format data from an array of arrays to an array of object
    let formattedData = [];
    for (const bar of data) {
        formattedData.push({
            'exchangeTimestamp': new Date(bar[0]),
            'interval': interval,
            'open': bar[1],
            'high': bar[2],
            'low': bar[3],
            'close': bar[4],
            'volume': bar[5]
        });
    }

    // Ensure records with unique 'exchangeTimestamp', especially at timestamps where API results join at
    formattedData = _.uniqBy(formattedData, (e) => {
        return e.exchangeTimestamp.getTime()
    });
    formattedData = _.sortBy(formattedData, 'exchangeTimestamp');

    return formattedData
}

/**
 * Create tables for exchange markets that do not exist in local database
 * @param {str} exchangeName CCXT name of exchange
 */
const ensureTablesForExchangeSymbols = async (exchangeName) => {
    // Get lists of symbols
    const apiSymbols = await getExchangeSymbols(exchangeName)
    let exchangeSymbols = [];
    for (const symbol of apiSymbols) {
        exchangeSymbols.push(generateTableName(exchangeName, symbol, 'prefix'));
    }
    const datalakeSymbols = await getAllSymbols();

    // Determine symbols in exchange that are not in datalake database
    const newSymbols = _.difference(exchangeSymbols, datalakeSymbols)
    // console.log(`${exchangeName} | ${newSymbols.length} new symbols: \t${newSymbols}`)
    logger.info(`${exchangeName} | ${newSymbols.length} new symbols: \t${newSymbols}`)

    // Create tables (_ticks, _orderbook, _ohlcv) for new symbols
    for (const symbol of newSymbols) {
        createTablesForSymbol(symbol);
    }
}

/**
 * Download new OHLCV bars for a market in the exchange and save to datalake database
 * @param {str} exchangeName CCXT name of exchange
 * @param {str} marketName Name of trading market
 */
const downloadNewOhlcv = async (exchangeName, marketName) => {
    await createTablesForSymbol(generateTableName(exchangeName, marketName, 'prefix'));
    const bars = await fetchOhlcvUntil(exchangeName, marketName, '1m', 100000, Date.now());
    await saveOhlcvToDatalake(exchangeName, marketName, '1m', bars);
    await sleep(2500);
}

// /**
//  * Entry point of this script
//  */
// (async () => {
//     // TODO: Read from universe.json or Job queue instead of being hard-coded
//     const exchanges = ['binance'];
//     for (const exchangeName of exchanges) {
//         // await ensureTablesForExchangeSymbols(exchangeName);

//         // Get an updated list of symbols from the exchange
//         const symbols = await getExchangeSymbols(exchangeName);

//         // Long loop that updates all the symbols' OHLCV bars
//         for (const symbol of symbols) {
//             await downloadNewOhlcv(exchangeName, symbol);
//         }
//     }
// })();

// Export for use in ohlcv_worker
exports.downloadNewOhlcv = downloadNewOhlcv;