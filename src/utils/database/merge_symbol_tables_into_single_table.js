const _ = require('lodash');
const moment = require('moment');
const PLimit = require('p-limit');
const perfy = require('perfy');

const { dateToStringUtc } = require('../../lib');
const { getAllTables } = require('../../lib/db');
const { datalakeKnex, appKnex } = require('../../config/db');

const pLimit = PLimit(8);

const createQuotationTables = async () => {
    
    // Create tables
    if (await datalakeKnex.schema.hasTable('trades')) {
        console.log('Table already exist: trades')
    } else {
        await datalakeKnex.schema.createTable('trades', table => {
            table.increments()
            table.timestamp('serverTimestamp')
            table.timestamp('exchangeTimestamp')
            table.string('symbol', 64).notNullable()
            table.string('tradeId', 64)
            table.specificType('side', 'char(4)').notNullable()
            table.specificType('price', 'double precision').notNullable()
            table.specificType('amount', 'double precision').notNullable()
            table.string('buyOrderId', 64)
            table.string('sellOrderId', 64)
            table.dropPrimary()     // drop primary key 'id'
            table.primary(['exchangeTimestamp', 'symbol', 'id'])
        });
    }

    if (await datalakeKnex.schema.hasTable('orderbooks')) {
        console.log('Table already exist: orderbooks')
    } else {
        await datalakeKnex.schema.createTable('orderbooks', table => {
            table.increments()
            table.timestamp('serverTimestamp')
            table.timestamp('exchangeTimestamp')
            table.string('symbol', 64).notNullable()
            table.specificType('sequenceId', 'integer').unsigned()
            table.specificType('lastSequenceId', 'integer').unsigned()
            table.text('asks')
            table.text('bids')
            table.boolean('isSnapshot').defaultTo(false).notNullable()
            table.boolean('isSnapshotCalc').defaultTo(false).notNullable()
            table.dropPrimary()     // drop primary key 'id'
            table.primary(['exchangeTimestamp', 'symbol', 'id'])
            table.index('isSnapshotCalc')
        });
    }

    if (await datalakeKnex.schema.hasTable('ohlcv')) {
        console.log('Table already exist: ohlcv')
    } else {
        await datalakeKnex.schema.createTable('ohlcv', table => {
            table.increments()
            table.timestamp('exchangeTimestamp')
            table.string('symbol', 64).notNullable()
            table.string('interval', 6)
            table.specificType('open', 'double precision')
            table.specificType('high', 'double precision')
            table.specificType('low', 'double precision')
            table.specificType('close', 'double precision')
            table.specificType('volume', 'double precision')
            table.dropPrimary()     // drop primary key 'id'
            table.primary(['exchangeTimestamp', 'id'])
            table.index('symbol')
        });
    }

    // Create hypertable
    try {
        await datalakeKnex.schema.raw(`SELECT create_hypertable('trades', 'exchangeTimestamp', chunk_time_interval => interval '1 day');`);
        console.log('Created hypertable: trades');
    } catch (e) {
        console.log('Hypertable already exists: trades')
    }

    try {
        await datalakeKnex.schema.raw(`SELECT create_hypertable('orderbooks', 'exchangeTimestamp', chunk_time_interval => interval '1 day');`);
        console.log('Created hypertable: orderbooks');
    } catch (e) {
        console.log('Hypertable already exists: orderbooks')
    }

    try {
        await datalakeKnex.schema.raw(`SELECT create_hypertable('ohlcv', 'exchangeTimestamp', chunk_time_interval => interval '1 month');`);
        console.log('Created hypertable: ohlcv');
    } catch (e) {
        console.log('Hypertable already exists: ohlcv')
    }

    // Enable native compression
    try {
        await datalakeKnex.raw(`ALTER TABLE trades SET (
            timescaledb.compress, 
            timescaledb.compress_segmentby = '"symbol"',
            timescaledb.compress_orderby = '"serverTimestamp", id DESC'
        )`);
    } catch (e) {
        console.log(`Error enabling native compression: trades: ${e}`);
    }

    try {
        await datalakeKnex.raw(`ALTER TABLE orderbooks SET (
            timescaledb.compress, 
            timescaledb.compress_segmentby = '"symbol"',
            timescaledb.compress_orderby = '"serverTimestamp", id DESC'
        )`);
    } catch (e) {
        console.log(`Error enabling native compression: orderbooks: ${e}`);
    }

    try {
        await datalakeKnex.raw(`ALTER TABLE ohlcv SET (
            timescaledb.compress, 
            timescaledb.compress_segmentby = '"symbol"',
            timescaledb.compress_orderby = '"exchangeTimestamp", id DESC'
        )`);
    } catch (e) {
        console.log(`Error enabling native compression: ohlcv: ${e}`);
    }
}

const combineSymbolTables = async (smallTableNames, largeTableName) => {
    const combinePromises = smallTableNames.map(
        tableName => pLimit(() =>combineSymbolTable(tableName, largeTableName))
    )
    const combineResults = await Promise
                                    .all(combinePromises)
                                    .catch(e => console.log(`Error in combining tables: ${e}`));
}

const combineSymbolTable = async (smallTableName, largeTableName) => {
    perfy.start('combine');

    const symbol = getSymbolFromTableName(smallTableName);

    // Get earliest date from source table
    let earliestRow 
    let latestRow
    if (largeTableName == 'ohlcv') {
        earliestRow = await datalakeKnex(smallTableName).select().orderBy('exchangeTimestamp', 'asc').first();
        latestRow = await datalakeKnex(smallTableName).select().orderBy('exchangeTimestamp', 'desc').first();    
    } else {
        earliestRow = await datalakeKnex(smallTableName).select().orderBy('serverTimestamp', 'asc').first();
        latestRow = await datalakeKnex(smallTableName).select().orderBy('serverTimestamp', 'desc').first();    

    }

    // Skip if no rows in this table
    if (typeof earliestRow == undefined) {
        return
    }

    let earliestTimestamp;
    let latestTimestamp;
    if (largeTableName == 'ohlcv') {
        earliestTimestamp = earliestRow.exchangeTimestamp;
        latestTimestamp = latestRow.exchangeTimestamp;
    } else {
        earliestTimestamp = earliestRow.serverTimestamp;
        latestTimestamp = latestRow.serverTimestamp;
    }
    let currentTimestampStart = moment(earliestTimestamp);
    let currentTimestampEnd = currentTimestampStart.clone().add(1, 'day');

    // // Resume logic: Check for existing row with this symbol
    // const existingLatestRow = await datalakeKnex(largeTableName).select().where('symbol', symbol).orderBy('serverTimestamp', 'desc').first();
    // if (typeof existingLatestRow !== undefined) {
    //     currentTimestampStart = moment(existingLatestRow.serverTimestamp);
    //     currentTimestampStart.add(1, 'second');    // To avoid inserting the latet existing row

    //     // Skip symbol if already done
    //     if (currentTimestampStart.diff(moment(latestTimestamp)) >= 0) {
    //         console.log(`${symbol} | No new rows left to transfer. Skipping...`)
    //         return
    //     }
    //     console.log(`${symbol} | Existing rows found, resume at ${currentTimestampStart}`)
    // }

    let numRows = 0;

    while (true) {
        let rows;
        if (largeTableName == 'ohlcv') {
            rows = await datalakeKnex(smallTableName)
                                    .select()
                                    .where('exchangeTimestamp', '>=', dateToStringUtc(currentTimestampStart.toDate()))
                                    .andWhere('exchangeTimestamp', '<', dateToStringUtc(currentTimestampEnd.toDate()))
                                    .orderBy('exchangeTimestamp', 'desc');
        } else {
            rows = await datalakeKnex(smallTableName)
                                    .select()
                                    .where('serverTimestamp', '>=', dateToStringUtc(currentTimestampStart.toDate()))
                                    .andWhere('serverTimestamp', '<', dateToStringUtc(currentTimestampEnd.toDate()))
                                    .orderBy('serverTimestamp', 'desc');
        }
        for (const r of rows) {
            delete r.id;        // let it be autogenerated by new table

            r.symbol = symbol;
            r.exchangeTimestamp = dateToStringUtc(new Date(r.exchangeTimestamp));
            if (r.serverTimestamp) {
                r.serverTimestamp = dateToStringUtc(new Date(r.serverTimestamp));
            }
            
            if (largeTableName == 'trades') {
                if (r.buyOrderId == 'undefined') {
                    delete r.buyOrderId
                }
                if (r.sellOrderId == 'undefined') {
                    delete r.sellOrderId
                }
                delete r.unix;          // some rows still contain this field
            } else if (largeTableName == 'orderbooks') {
                if (!r.isSnapshot) {
                    r.isSnapshot = false;
                }
                if (!r.isSnapshotCalc) {
                    r.isSnapshotCalc = false;
                }
                if (!r.exchangeTimestamp || (Date.parse(r.exchangeTimestamp) == 0)) {
                    r.exchangeTimestamp = dateToStringUtc(new Date(r.serverTimestamp));
                }
            }
        }
        if (rows.length > 0) {
            numRows += rows.length;
            for (const chunk of _.chunk(rows, 1000)) {
                try {
                    await datalakeKnex(largeTableName).insert(chunk);
                } catch (e) {
                    console.log(`Error chunk inserting from table ${smallTableName}: ${e}`)
                    // console.log(`Error chunk inserting from table ${smallTableName}: ${symbol} ${rows[0]} ${rows[rows.length-1]} ${dateToStringUtc(currentTimestampStart.toDate())} ${dateToStringUtc(currentTimestampEnd.toDate())}`)
                }
            }
        }

        // Update start & end timetamps for next loop iteration
        currentTimestampStart = currentTimestampEnd;
        currentTimestampEnd = currentTimestampStart.clone().add(1, 'day')
        if (currentTimestampStart > latestTimestamp) {
            break;
        }
    }
    
    try {
        console.log(`${smallTableName} | ${numRows} | ${perfy.end('combine').time} secs`)
    } catch (e) {
        console.log(`${smallTableName} | ${numRows} | With strange error: ${e}`)
    }
    
}

const getSymbolFromTableName = (tableName) => {
    let x = tableName.split('_');
    x.pop();
    return x.join('_')
}

(async () => {

    // // Drop tables
    // // await datalakeKnex.schema.dropTable('trades');
    // // await datalakeKnex.schema.dropTable('orderbooks');
    // await datalakeKnex.schema.dropTable('ohlcv');
    // process.exit(0);



    // // Create new tables
    //await createQuotationTables();

    // Combine small symbol tables into large tables
    const tableNames = await getAllTables('datalake');
    tradesTableNames = tableNames.filter(x => x.endsWith('_ticks'));
    orderbookTableNames = tableNames.filter(x => x.endsWith('_orderbook'));
    ohlcvTableNames = tableNames.filter(x => x.endsWith('_ohlcv'));
    perfy.start('combineAll');
    // await combineSymbolTables(tradesTableNames, 'trades');
    await combineSymbolTables(orderbookTableNames, 'orderbooks');
    await combineSymbolTables(ohlcvTableNames, 'ohlcv');
    console.log(`\nTime taken: ${perfy.end('combineAll').time} secs`)

    process.exit(0);
})();
