/**
 * Checks whether the 'snapshotCalc' in _orderbook tables are calculated up-to-date
 */

const { datalakeKnex } = require('../../config/db');
const { getAllTables } = require('../../lib/db');
const { dateToStringUtc } = require('../../lib');

(async () => {
    const tableNames = await getAllTables('datalake');
    
    for (const tableName of tableNames) {
        if (tableName.endsWith('_orderbook')) {
            const newestSnapshot = await datalakeKnex(tableName)
                                    .select()
                                    .where('isSnapshotCalc', true)
                                    .orderBy('serverTimestamp', 'desc')
                                    .first();
            const oldestSnapshot = await datalakeKnex(tableName)
                                    .select()
                                    .where('isSnapshotCalc', true)
                                    .orderBy('serverTimestamp', 'asc')
                                    .first()
            if (newestSnapshot) {
                console.log(`${tableName} | ${dateToStringUtc(oldestSnapshot.serverTimestamp)} | ${dateToStringUtc(newestSnapshot.serverTimestamp)}`);
            } else {
                console.log(`${tableName} | No snapshotsCalc`)
            }
            
        }
    }


    process.exit();
})();
