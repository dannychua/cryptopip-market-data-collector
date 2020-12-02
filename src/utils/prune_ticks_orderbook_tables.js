/**
 * Prune all datalake tables ending with `_ticks' and '_orderbook'
 * Retains data from the most recent 10 days
 */

const { datalakeKnex, appKnex } = require('../config/db');
const { getAllTables } = require('../lib/db');
const { dateToStringUtc } = require('../lib');

const moment = require('moment');

(async () => {
    const endDate = moment(new Date()).subtract(10, 'days').toDate()

    const tableNames = await getAllTables('datalake');
    for (const tableName of tableNames) {
        if (tableName.endsWith('_ticks') || tableName.endsWith('_orderbook')) {
            try {
                await datalakeKnex(tableName)
                    .where('serverTimestamp', '<', dateToStringUtc(endDate, false))
                    .del()
            
                console.log(`Pruned table: ${tableName}`);
            } catch (e) {
                console.log(`Error pruning table: ${tableName}`)
            }
        }
    }
})();
