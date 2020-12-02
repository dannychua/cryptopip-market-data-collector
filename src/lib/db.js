const _ = require('lodash');

const { datalakeKnex, appKnex, ingesterKnex } = require('../config/db');
const { generateTableName } = require('.');

BULK_INSERT_CHUNK_SIZE = 1000

/**
 * Get an array of all tables in the datalake database, except SequelizeMeta
 * @returns {array}
 */
exports.getAllTables = async (databaseName) => {
    let knex;
    if (databaseName == 'app') {
        knex = appKnex
    } else if (databaseName == 'datalake') {
        knex = datalakeKnex
    } else {
        throw new Error(`Please pass a valid 'databaseName. Given: ${databaseName} `);
    }

    let q;
    try {
        let tableNames = [];
        q = `SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema='public'
                    AND table_type='BASE TABLE'
                    AND table_name != 'SequelizeMeta';`
        const result = await knex.schema.raw(q);
        for (const r of result.rows) {
            tableNames.push(r['table_name'])
        }
        return tableNames;
    } catch (err) {
        err.message += `\nFull SQL Query: ${q}`;      // add the full query statement to the error object
        throw new Error(err);
    }
}

/**
 * Get an array of all unique symbols in the datalake database
 * @returns {array}
 */
exports.getAllSymbols = async (databaseName) => {
    const tableNames = await module.exports.getAllTables('datalake');
    let symbols = [];
    for (const tableName of tableNames) {
        const lastIdx = tableName.lastIndexOf('_');
        symbols.push(tableName.substring(0, lastIdx));
    }
    return _.uniq(symbols)
}

exports.createTablesForSymbol = async (symbol) => {
    let tableName = `${symbol}_ohlcv`

    // Check if table already exists
    let tableExists
    try {
        tableExists = await datalakeKnex.schema.hasTable(tableName)
    } catch (e) {
        throw new Error(`Error checking if table '${tableName}' exists: ${e}`)
    }
    if (tableExists) {
        console.log(`${symbol.split('_')[0]} | ${tableName} already exits`)
        return
    }

    // Create table
    await datalakeKnex.schema.createTable(tableName, table => {
        table.timestamp('exchangeTimestamp')
        table.string('interval', 6)
        table.specificType('open', 'double precision')
        table.specificType('high', 'double precision')
        table.specificType('low', 'double precision')
        table.specificType('close', 'double precision')
        table.specificType('volume', 'double precision')
        table.primary(['exchangeTimestamp', 'interval'])
    });

    // Create hypertable
    await datalakeKnex.schema.raw(`SELECT create_hypertable('"${symbol}_ohlcv"', 'exchangeTimestamp', chunk_time_interval => interval '1 year');`);

    console.log(`${symbol} | Created table: \t${tableName}`)
}

/**
 * Get unix timestamp (in milliseconds) of the most recent record in table
 * @param {str} exchangeName CCXT name of exchange
 * @param {str} symbol 
 * @param {str} interval 
 * @returns {int} Unix timestamp (in milliseconds)
 */
exports.getLatestTimestamp = async (exchangeName, symbol, interval) => {
    const latestRecord = await datalakeKnex(generateTableName(exchangeName, symbol, 'ohlcv'))
            .select('exchangeTimestamp')
            .where('interval', interval)
            .orderBy('exchangeTimestamp', 'DESC')
            .first();

    if (latestRecord) {
        return latestRecord['exchangeTimestamp'].getTime();
    } else {
        return null
    }
    
} 

/**
 * Get timestamp (as JS date object) of the most recent record in table
 * @param {str} tableName Name of database table
 * @returns {date} Javascript Date object
 */
exports.getLatestTimestampByTablename = async (tableName) => {
    let timestampColname;
    if (tableName.endsWith('_orderbook')) {
        timestampColname = 'serverTimestamp';
    } else {
        timestampColname = 'exchangeTimestamp';
    }
    const r = await datalakeKnex(tableName)
                                .max(timestampColname, {as: 'latestTimestamp'})
                                .first()
    return r.latestTimestamp;
}

/**
 * Inserts an array of OHLCV bar data into the datalake database.
 * Insert by chunks to avoid errors like "bind message supplies 47078 parameters, but prepared statement "" requires 9353190"
 * @param {str} exchangeName CCXT name of exchange
 * @param {str} symbol Name of symbol
 * @param {str} interval Bar interval ['1m' | '1h' | ...]
 * @param {*} bars Array of OHLCV bar objects
 */
exports.saveOhlcvToDatalake = async (exchangeName, symbol, interval, bars) => {
    const logger = require('./logger')(__filename);
    
    try {
        chunkedBars = _.chunk(bars, BULK_INSERT_CHUNK_SIZE);
        for (const chunk of chunkedBars) {
            console.log(`${exchangeName} | ${symbol} | Bulk insert: \t${chunk.length}`);
            logger.debug(`${exchangeName} | ${symbol} | Bulk insert: \t${chunk.length}`);
            await datalakeKnex(generateTableName(exchangeName, symbol, 'ohlcv')).insert(chunk)
        }
    } catch (e) {
        throw new Error(`Unable to bulk insert OHLCV bars into database: ${e}`);
    }
}

/**
 * Inserts an array of trades data by chunks into the datalake database.
 * @param {*} trades Array of trades objects
 */
exports.saveTradesToDatalake = async(trades) => {
    const logger = require('./logger')(__filename);

    try {
        chunked = _.chunk(trades, BULK_INSERT_CHUNK_SIZE);
        for (const chunk of chunked) {
            await datalakeKnex('trades').insert(chunk);
        }
    } catch (e) {
        throw new Error(`Unable to insert trades into database: ${e}`);
    }
}

/**
 * Inserts an array of orderbook data by chunks into the datalake database.
 * @param {*} trades Array of trades objects
 */
exports.saveOrderbooksToDatalake = async(trades) => {
    const logger = require('./logger')(__filename);

    try {
        chunked = _.chunk(trades, BULK_INSERT_CHUNK_SIZE);
        for (const chunk of chunked) {
            await datalakeKnex('orderbooks').insert(chunk);
        }
    } catch (e) {
        throw new Error(`Unable to insert orderbooks into database: ${e}`);
    }
}

/**
 * Inserts an array of trades data by chunks into the ingester database.
 * @param {*} trades Array of trades objects
 */
exports.saveTradesToIngesterDb = async(trades) => {
    // const logger = require('./logger')(__filename);

    try {
        chunked = _.chunk(trades, BULK_INSERT_CHUNK_SIZE);
        for (const chunk of chunked) {
            await ingesterKnex('trades').insert(chunk);
        }
    } catch (e) {
        throw new Error(`Unable to insert trades into database: ${e}`);
    }
}

/**
 * Inserts an array of orderbook data by chunks into the ingester database.
 * @param {*} trades Array of trades objects
 */
exports.saveOrderbooksToIngesterDb = async(trades) => {
    // const logger = require('./logger')(__filename);

    try {
        chunked = _.chunk(trades, BULK_INSERT_CHUNK_SIZE);
        for (const chunk of chunked) {
            await ingesterKnex('orderbooks').insert(chunk);
        }
    } catch (e) {
        throw new Error(`Unable to insert orderbooks into database: ${e}`);
    }
}

/**
 * Inserts a heartbeat event into the datalake database.
 * @param {*} heartbeat Heartbeat event object
 */
exports.saveHeartbeatEventToDb = async(heartbeat) => {
    try {
        await datalakeKnex('heartbeats').insert(heartbeat);
    } catch (e) {
        throw new Error(`Unable to insert heartbeat into database: ${e}`);
    }
}