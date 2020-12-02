/**
 * Displays the latest data timestamp for every table in the datalake database
 */

const PLimit = require('p-limit');

const { datalakeKnex } = require('../config/db');
const { dateToStringUtc } = require('../lib')
const { getAllTables, getLatestTimestampByTablename } = require('../lib/db');

const DB_QUERY_CONCURRENCY = 10;

const displayLatestTimestamp = async (tableName) => {
    const latest = await getLatestTimestampByTablename(tableName)
    console.log(`${tableName}: \t${dateToStringUtc(latest)}`)
}

(async () => {
    const pLimit = PLimit(DB_QUERY_CONCURRENCY);

    // Get the full list of table names
    const tableNames = await getAllTables('datalake');
    console.log(`Tables in datalake: \t${tableNames.length}`)
    
    // Perform concurrent database queries
    const promises = tableNames.map(tableName => pLimit(() => displayLatestTimestamp(tableName)));
    const results = await Promise
                            .all(promises)
                            .catch(e => console.log(`Error in Promise.all(): ${e}`));

    datalakeKnex.destroy();
})();

