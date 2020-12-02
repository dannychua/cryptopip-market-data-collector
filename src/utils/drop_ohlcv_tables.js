/**
 * Drops all datalake tables ending with `_ohlcv'
 */

const { datalakeKnex, appKnex } = require('../config/db');
const { getAllTables } = require('../lib/db');

(async () => {
    const tableNames = await getAllTables('datalake');
    for (const tableName of tableNames) {
        if (tableName.endsWith('_ohlcv')) {
            await datalakeKnex.schema.dropTableIfExists(tableName);
            console.log(`Dropped table: ${tableName}`);
        }
    }
})();
