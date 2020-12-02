/**
 * Downloads & dedupes collected data from multiple cryptopip ingester servers
 * Saves deduped data into data lake
 */

// Comment out if not using user-specified dates
// const USER_SPECIFIED_START_DATE = '2020-02-01 00:00:00+0000';
// const USER_SPECIFIED_END_DATE = '2020-02-03 00:00:00+0000';

const INCREMENT = '5';                  // Batch size
const INCREMENT_UNIT = 'day';          // Units of batch size

//********************************************************** */

const Sequelize = require('sequelize')
const env = process.env.NODE_ENV || 'development';
const dbConfig = require(__dirname + '/config/config.json')[env];
const _ = require('lodash');
const moment = require('moment');
const PLimit = require('p-limit');
const perfy = require('perfy');
const logger = require('./lib/logger')(__filename);
const { printLogo, dateToString, dateToStringUtc } = require('./lib');
const ingesters = require('./config/ingesters.json')

const BULK_INSERT_CHUNK_SIZE = 200000;      // 12 GB memory for Postgres is insufficient for 1M+ bulk insert
const INGESTER_RETRIVAL_CONCURRENCY = 5;
// const DAYS_PER_BATCH = 5;                   // Number of days to download & dedupe in every batch
const pLimit = PLimit(INGESTER_RETRIVAL_CONCURRENCY);


/**
 * Retrieves trades data from remote ingestors and de-duplicates them
 * @param {*} tableName String
 * @param {*} startDate String, YYYY-MM-DD HH:mm:ss (in UTC)
 * @param {*} endDate String, YYYY-MM-DD HH:mm:ss (in UTC)
 */
const retrieveAndDedupeTrades = async (tableName, startDate, endDate) => {

    // Check if rows already exist after current startDate
    const countQuery = `SELECT COUNT(*)
        FROM ${tableName}
        WHERE '${startDate}' < "serverTimestamp" 
        AND "serverTimestamp" < '${endDate}';`
    const countResult = await sequelizeInstances['db']
        .query(countQuery, { type: Sequelize.QueryTypes.SELECT })
        .catch(e => {
            console.log(`db | ${tableName}: Error getting data: ${e}`);
        });
    const count = countResult[0].count;

    // Find new startDate to begin downloading from if rows already exist
    if (count > 0) {
        console.log(`${tableName}|${startDate} ~ ${endDate}|db: \t${count} rows already exist`);

        // Find the most recent timestamp for current table
        const latestTimestampQuery = `SELECT *
            FROM ${tableName}
            WHERE '${startDate}' < "serverTimestamp" 
            AND "serverTimestamp" < '${endDate}'
            ORDER BY "serverTimestamp" DESC
            LIMIT 1`;
        const latestTimestampResult = await sequelizeInstances['db']
            .query(latestTimestampQuery, { type: Sequelize.QueryTypes.SELECT })
            .catch(e => {
                console.log(`db | ${tableName}: Error getting data: ${e}`);
            });
        startDate = latestTimestampResult[0]['serverTimestamp'];    // update with new startDate
        startDate = dateToStringUtc(Date.parse(startDate), false, ms=true);     // millisec accuracy is required here (sometimes)
        console.log(`${tableName}|${startDate} ~ ${endDate}|db: \tNew start date: ${startDate}`);
    }

    let stringBuffer = [];

    // Retrieve Data
    let trades = [];
    for (const ingester in ingesters) {
        let sequelize = sequelizeInstances[ingester];
        const q = `SELECT *
            FROM ${tableName}
            WHERE '${startDate}' < "serverTimestamp" 
            AND "serverTimestamp" < '${endDate}';`
        const result = await sequelize
            .query(q, { type: Sequelize.QueryTypes.SELECT })
            .catch(e => {
                stringBuffer.push(`${tableName}|${startDate} ~ ${endDate}|${ingester}: Error getting data: ${e}`);
            });

        if (typeof result !== 'undefined') {
            trades = _.concat(trades, result);
            stringBuffer.push(`${tableName}|${startDate} ~ ${endDate}|${ingester}: \t${result.length}`);
            // console.log(`${tableName}|${startDate} ~ ${endDate}|${ingester}: \t${result.length}`);
        } else {
        }
    }
    
    // Dedupe using `id` property
    if (trades.length) {
        trades = _.uniqBy(trades, t => t.id)
        stringBuffer.push(`${tableName}|${startDate} ~ ${endDate}|DEDUPED: \t${trades.length}`)
        // console.log(`${tableName}|DEDUPED: ${trades.length}`)
    }

    // TEMP: Populate 'exchangeTimestamp' column using 'unix' column
    if (trades.length) {
        for (const [i, trade] of trades.entries()) {
            // TODO: To be removed after ingester no longer has 'unix' column in their database
            if (trade.hasOwnProperty('unix')) {
                trades[i].exchangeTimestamp = new Date(parseInt(trade.unix)).toISOString()
                delete trades['unix'];
            }
        }
    }

    // Insert deduped data into local database
    if (trades.length) {
        const model = require('./models')[`${tableName}_model`];
        try {
            const hugeIndicator = (trades.length > 100000) ? '\tHUGE PAYLOAD' : '';
            chunkedTrades = _.chunk(trades, BULK_INSERT_CHUNK_SIZE);
            for (const chunk of chunkedTrades) {
                stringBuffer.push(`${tableName}|${startDate} ~ ${endDate}|Bulk insert: \t${chunk.length} ${hugeIndicator}`);
                await model.bulkCreate(chunk);
            }
        } catch (e) {
            stringBuffer.push(`${tableName}|${startDate} ~ ${endDate}|  Error bulk inserting ${trades.length} rows: ${e}`);
            // console.log(`${tableName} Error bulk inserting ${trades.length} rows: {e}`);
        }
    }

    // TODO: Delete data from remote ingester databases

    // Flush console.log buffer
    console.log(stringBuffer.join('\n'))
    console.log('\n') 
}


/**
 * Retrieves orderbook data from remote ingestors and de-duplicates them
 * De-duplication strategy 
 *  - Groups L2 updates into 1-hour groups
 *  - Use L2 data from the ingester with the most L2 updates in the hour
 * @param {*} tableName 
 * @param {*} startDate 
 * @param {*} endDate 
 */
const retrieveAndDedupeOrderbook = async (tableName, startDate, endDate) => {

    // Check if rows already exist after current startDate
    const countQuery = `SELECT COUNT(*)
        FROM ${tableName}
        WHERE '${startDate}' <= "serverTimestamp" 
        AND "serverTimestamp" < '${endDate}';`
    const countResult = await sequelizeInstances['db']
        .query(countQuery, { type: Sequelize.QueryTypes.SELECT })
        .catch(e => {
            console.log(`db | ${tableName}: Error getting data: ${e}`);
        });
    const count = countResult[0].count;

    // Find new startDate to begin downloading from if rows already exist
    if (count > 0) {
        console.log(`${tableName}|${startDate}_${endDate}|db: \t${count} rows already exist`);

        // Find the most recent timestamp for current table
        const latestTimestampQuery = `SELECT *
            FROM ${tableName}
            WHERE '${startDate}' < "serverTimestamp" 
            AND "serverTimestamp" < '${endDate}'
            ORDER BY "serverTimestamp" DESC
            LIMIT 1`;
        const latestTimestampResult = await sequelizeInstances['db']
            .query(latestTimestampQuery, { type: Sequelize.QueryTypes.SELECT })
            .catch(e => {
                console.log(`db | ${tableName}: Error getting data: ${e}`);
            });
            startDate = latestTimestampResult[0]['serverTimestamp'];    // update with new startDate
            startDate = dateToStringUtc(startDate, false, ms=true);     // millisec accuracy is required here (sometimes)
            console.log(`${tableName}|${startDate} ~ ${endDate}|db: \tNew start date: ${startDate}`);
        }
    
    let stringBuffer = [];

    // Retrieve data from remote ingesters
    // results = [
    //     {asks: ..., bids: ..., ingester: ..., serverTimestamp: ...},
    // ]
    let results = []
    for (const ingester in ingesters) {
        const config = ingesters[ingester];
        let sequelize = sequelizeInstances[ingester];
        const q = `SELECT *
            FROM ${tableName}
            WHERE '${startDate}' < "serverTimestamp" 
            AND "serverTimestamp" < '${endDate}';`
        const result = await sequelize
            .query(q, { type: Sequelize.QueryTypes.SELECT })
            .catch(e => {
                stringBuffer.push(`${tableName}|${startDate} ~ ${endDate}|${ingester}: Error getting data: ${e}`);
            });

        if (typeof result !== 'undefined') {

            // Label each data with ingester
            result.forEach(r => {
                r.ingester = ingester
            });
            
            results = _.concat(results, result);

            stringBuffer.push(`${tableName}|${startDate} ~ ${endDate}|${ingester}: \t${result.length}`);
            // console.log(`${tableName}|${ingester}: ${result.length}`);
        }
    }

    // Group orderbook data into 1-hour groups
    // grouped = {
    //     hourlyTimestamp: [
    //         {asks: ..., bids: ..., ingester: ..., serverTimestamp: ...},
    //     ]
    // }
    let hourlyGroups = _.groupBy(results, r => {
        return moment(r['serverTimestamp']).startOf('hour').toDate();
    });

    // Sort group in chronological order (oldest -> newest)
    let sortedGroups = {};
    Object.keys(hourlyGroups).sort((a, b) => {
        return moment(Date.parse(a)).toDate() - moment(Date.parse(b)).toDate()
    }).forEach(key => {
        sortedGroups[key] = hourlyGroups[key];
    });
    hourlyGroups = sortedGroups;

    // Sort within hourly time group (Not necessary, only for visual checks during testing)
    for (const hourlyTimestamp in hourlyGroups) {
        sorted = _.sortBy(hourlyGroups[hourlyTimestamp], 'serverTimestamp')
        hourlyGroups[hourlyTimestamp] = sorted;
    }

    // For every 1-hour group, select one data stream to represent the entire period
    // This chosen data stream has the most number of updates
    let dedupedGroups = {};
    for (const timestamp in hourlyGroups) {
        const group = hourlyGroups[timestamp];

        // Counts the number of L2 updates for each ingester
        let counts = {};
        for (const ingester in ingesters) {
            counts[ingester] = 0;
            // console.log('group:', group)
            const updates = _.filter(group, {ingester: ingester});
            for (const u of updates) {
                counts[ingester] += Object.keys(JSON.parse(u.asks)).length + Object.keys(JSON.parse(u.bids)).length;
            }
        }

        // Identify the leader ingester
        const leader = _.maxBy(Object.keys(counts), ingester => counts[ingester]);
        // console.log('\n\n@@', timestamp, counts, leader)

        // Add to dedupedGroups
        dedupedGroups[timestamp] = _.filter(group, {ingester: leader}).reverse(); // oldest -> newest
    }
    hourlyGroups = dedupedGroups;

    // Flatten out the 1-hour groups
    // ungrouped = [
    //     {asks: ..., bids: ..., ingester: ..., serverTimestamp: ...},
    // ]
    let updates = [];
    for (const hourlyTimestamp in hourlyGroups) {
        for(const key in hourlyGroups[hourlyTimestamp]) {
            updates.push(hourlyGroups[hourlyTimestamp][key])
        }
    }
    updates = updates.reverse();
    stringBuffer.push(`${tableName}|${startDate} ~ ${endDate}| DEDUPED: \t${updates.length}`)

    // // Group orderbook data into 1-second groups
    // //
    // // grouped = {
    // //     secondlyTimestamp: [
    // //         {asks: ..., bids: ..., ingester: ..., serverTimestamp: ...},
    // //     ]
    // // }
    // let secondlyGroups = _.groupBy(updates, r => {
    //     return moment(r['serverTimestamp']).startOf('second').toDate();
    // });

    // for (const timestamp in secondlyGroups) {
    //     if (secondlyGroups[timestamp].length > 0) {
    //         console.log(timestamp, secondlyGroups[timestamp])
    //     }
    // }

    // TEMP: Populate 'exchangeTimestamp' column using 'timestampMs' column
    if (updates.length) {
        for (const [i, update] of updates.entries()) {
            // TODO: To be removed after ingester no longer has 'timestampMs' column in their database
            if (update.hasOwnProperty('timestampMs') && (update.timestampMs !== null)) {
                updates[i].exchangeTimestamp = new Date(update.timestampMs).toISOString();
                delete updates['timestampMs'];
            }
        }
    }

    // Insert deduped data into local database
    if (updates.length) {
        const model = require('./models')[`${tableName}_model`];
        try {
            const hugeIndicator = (updates.length > 100000) ? '\tHUGE PAYLOAD' : '';
            chunkedUpdates = _.chunk(updates, BULK_INSERT_CHUNK_SIZE);
            for (const chunk of chunkedUpdates) {
                stringBuffer.push(`${tableName}|${startDate} ~ ${endDate}| Bulk insert: \t${chunk.length} ${hugeIndicator}`);
                await model.bulkCreate(chunk);
            }
        } catch (e) {
            stringBuffer.push(`${tableName}|${startDate} ~ ${endDate}| Error bulk inserting ${updates.length} rows: ${e}`);
            // console.log(`${tableName} Error bulk inserting ${updates.length} rows: {e}`);
        }
    }

    // TODO: Delete data from remote ingester databases

    // Flush console.log buffer
    console.log(stringBuffer.join('\n'))
    console.log('\n') 
}




printLogo('cryptopip');
perfy.start('main');
logger.info(`Start downloading data from ${Object.keys(ingesters).length} ingesters`)

// Store Sequelize instances for reuse
let sequelizeInstances = {};
for (const ingester in ingesters) {
    const config = ingesters[ingester];
    let sequelize = new Sequelize(config.database, config.username, config.password, config);
    sequelizeInstances[ingester] = sequelize;
}
sequelizeInstances['db'] = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);  // local database

(async function() {
    // Get a unique list of table names
    let tableNames = [];
    for (const ingester in ingesters) {
        // Get all tables names in database
        let sequelize = sequelizeInstances[ingester];
        const q = `SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema='public'
                    AND table_type='BASE TABLE'
                    AND table_name != 'SequelizeMeta';`
        const result = await sequelize
            .query(q, { type: Sequelize.QueryTypes.SELECT })
            .catch(e => {
                console.log(`Error getting a list of all tables: ${e}`);
            });
        for (const r of result) {
            tableNames.push(r['table_name']);
        }
        console.log(`${ingester}: ${result.length} tables`)
    }
    tableNames = [...new Set(tableNames)];
    const tableNamesTrade = _.filter(tableNames, t => t.endsWith('_ticks'));
    const tableNamesOrderbook = _.filter(tableNames, t => t.endsWith('_orderbook'));
    tableNamesTrade.sort();
    tableNamesOrderbook.sort();
    logger.info(`Unique trade tables: ${tableNamesTrade.length}`)
    logger.info(`Unique orderbook tables: ${tableNamesOrderbook.length}\n`)
    // console.log(`Unique trade tables: ${tableNamesTrade.length}`)
    // console.log(`Unique orderbook tables: ${tableNamesOrderbook.length}\n`)

    // Get earliest timestamp available on Ingesters
    let earliestTimestamp = null;
    for (const ingester in ingesters) {
        let sequelize = sequelizeInstances[ingester];
        const q = `SELECT MIN("serverTimestamp") as start, MAX("serverTimestamp") as end,
            pg_size_pretty( pg_database_size('datalake_development') ) as size
            FROM binance_btc_usdt_ticks`
        const result = await sequelize
            .query(q, { type: Sequelize.QueryTypes.SELECT })
            .catch(e => {
                console.log(`Error getting timestamp of earliest trade data: ${e}`);
            });
            logger.info(`${ingester} | Earliest data: \t\t${dateToStringUtc(result[0].start)}`);
            logger.info(`${ingester} | Latest data: \t\t${dateToStringUtc(result[0].end)}`);
            logger.info(`${ingester} | Total Database Size: \t${result[0].size}`);
            // console.log(`${ingester} | Earliest data: \t\t${dateToStringUtc(result[0].start)}`);
            // console.log(`${ingester} | Latest data: \t\t${dateToStringUtc(result[0].end)}`);
            // console.log(`${ingester} | Total Database Size: \t${result[0].size}`);
        
        // Update with an earlier timestamp
        earliestTimestamp = earliestTimestamp || result[0].start;
        if (earliestTimestamp - result[0].start) {
            earliestTimestamp = result[0].start;
        }
    }
    logger.info(`ingester-* | Earliest timestamp: \t${dateToStringUtc(earliestTimestamp)}`);
    // console.log(`ingester-* | Earliest timestamp: \t${dateToStringUtc(earliestTimestamp)}`);

    // Get latest timestamp available on local database
    let sequelize = sequelizeInstances['db']
    const q1 = `SELECT MIN("serverTimestamp") as start, MAX("serverTimestamp") as end,
        pg_size_pretty( pg_database_size('${dbConfig.database}') ) as size
        FROM binance_btc_usdt_ticks`
    const result1 = await sequelize
        .query(q1, { type: Sequelize.QueryTypes.SELECT })
        .catch(e => {
            console.log(`Error getting timestamp of latest trade data: ${e}`);
        }); 
    const q2 = `SELECT MIN("serverTimestamp") as start, MAX("serverTimestamp") as end
        FROM binance_btc_usdt_orderbook`
    const result2 = await sequelize
        .query(q2, { type: Sequelize.QueryTypes.SELECT })
        .catch(e => {
            console.log(`Error getting timestamp of latest orderbook data: ${e}`);
        }); 
    console.log('\n')
    // console.log(`db | Latest data (Trades): \t${dateToStringUtc(result1[0].end)}`);
    // console.log(`db | Latest data (Orderbook): \t${dateToStringUtc(result2[0].end)}`);
    // console.log(`db | Total Database Size: \t${result1[0].size}`);
    logger.info(`db | Latest data (Trades): \t${dateToStringUtc(result1[0].end)}`);
    logger.info(`db | Latest data (Orderbook): \t${dateToStringUtc(result2[0].end)}`);
    logger.info(`db | Total Database Size: \t${result1[0].size}`);

    let startDate, thresholdDate;
    if ((typeof USER_SPECIFIED_START_DATE === 'undefined') || (typeof USER_SPECIFIED_END_DATE === 'undefined')) {
        // Determine startDate, assuming both trades and orderbooks startDate will be the same
        startDate = earliestTimestamp;
        if (result1[0].end !== null) {
            if (result1[0].end - startDate) {
                startDate = result1[0].end;
            }
        }

        // Data older that this date will be retrieved
        // thresholdDate = new Date(new Date().setHours(0, 0, 0, 0));x
        thresholdDate = moment().utc().startOf('day').toDate();
        logger.info(`\nStart On: \t${dateToStringUtc(startDate)}`)
        logger.info(`End Before: \t${dateToStringUtc(thresholdDate)}`)
        logger.info(`Increment: \t${INCREMENT} ${INCREMENT_UNIT}`)
        // console.log(`\nStart On: \t${dateToStringUtc(startDate)}`)
        // console.log(`End Before: \t${dateToStringUtc(thresholdDate)}`)
        // console.log(`Increment: \t${INCREMENT} ${INCREMENT_UNIT}`)
    } else {
        // Manually set the Start and End Dates (thresholdDate)
        startDate = new Date(USER_SPECIFIED_START_DATE)
        thresholdDate = new Date(USER_SPECIFIED_END_DATE)
        logger.info(`\nStart On: \t${startDate}`)
        logger.info(`End Before: \t${thresholdDate}`)
        logger.info(`Increment: \t${INCREMENT} ${INCREMENT_UNIT}`)
        // console.log(`\nStart On: \t${startDate}`)
        // console.log(`End Before: \t${thresholdDate}`)
        // console.log(`Increment: \t${INCREMENT} ${INCREMENT_UNIT}`)
    }


    // Process 1 increment unit at a time
    let currentDate = startDate;
    while (currentDate - thresholdDate < 0) {
        let currentThresholdDate = moment(currentDate).add(INCREMENT, INCREMENT_UNIT).toDate();
        if (currentThresholdDate - thresholdDate > 0) {
            currentThresholdDate = thresholdDate;   // ensure we don't go past thresholdDate
        }
        console.log(`\nCurrent Batch: \t${dateToStringUtc(currentDate)} => before ${dateToStringUtc(currentThresholdDate)} \n`);

        // Trades
        const tradePromises = tableNamesTrade.map(tableName => pLimit(() => retrieveAndDedupeTrades(tableName, dateToStringUtc(currentDate, false), dateToStringUtc(currentThresholdDate, false))));
        const tradeResults = await Promise
                                    .all(tradePromises)
                                    .catch(e => console.log(`Error in Promise.all(tradePromises): ${e}`)); // avoids exiting when an error is encountered in one of the Promises                                                                        

        // Orderbook
        const orderbookPromises = tableNamesOrderbook.map(tableName => pLimit(() => retrieveAndDedupeOrderbook(tableName, dateToStringUtc(currentDate, false), dateToStringUtc(currentThresholdDate, false))));
        const orderbookResults = await Promise
                                        .all(orderbookPromises)
                                        .catch(e => console.log(`Error in Promise.all(orderbookPromises): ${e}`)); // avoids exiting when an error is encountered in one of the Promises                                                                        

        // Update start date
        currentDate = currentThresholdDate;
    }

    logger.info(`Completed in ${perfy.end('pg_dump').time} secs`);
    console.log(`Completed`);
    
    logger.end();
    process.exit();
})().catch(e => console.log(`ERROR: ${e}`));
