const moment = require('moment');

const { datalakeKnex } = require('../config/db');
const { dateToStringUtc } = require('../lib');
const { getAllTables } = require('../lib/db');
const Orderbook = require('../lib/orderbook');

const SNAPSHOT_CALC_INTERVAL_UNIT_AMOUNT = 1
const SNAPSHOT_CALC_INTERVAL_UNIT = 'day'


const calc_periodic_snapshots = async (tableName, calcFromBeginning=false) => {
    let newestSnapshot;
    let newestSnapshotMoment;

    // Ignore problematic table names (eg. spaces)
    if (tableName.indexOf(' ') > -1) {
        console.log(`${tableName} | Skipping problematic table name`)
        return
    }

    // If running for the first time (i.e. calcFromBeginning=true), use oldest L2 snapshot
    if (calcFromBeginning) {
        // Get oldest L2 snapshot (despite calling it newestSnapshot)
        newestSnapshot = await datalakeKnex(tableName)
                                        .select()
                                        .where('isSnapshot', true)
                                        .orderBy('serverTimestamp', 'asc')
                                        .first();
        newestSnapshotMoment = moment(newestSnapshot.serverTimestamp);
        console.log(`${tableName} | Oldest L2 snapshot: \t\t${dateToStringUtc(newestSnapshot.serverTimestamp)}`);
    } else {
        // Get newest L2 snapshot
        newestSnapshot = await datalakeKnex(tableName)
                                        .select()
                                        .where('isSnapshot', true)
                                        .orderBy('serverTimestamp', 'desc')
                                        .first();
        if (newestSnapshot == undefined) {
            console.log(`${tableName} | No snapshot. Skipping...`);
            return
        }
        newestSnapshotMoment = moment(newestSnapshot.serverTimestamp);
        console.log(`${tableName} | Newest L2 snapshot: \t\t${dateToStringUtc(newestSnapshot.serverTimestamp)}`);    
    }

    // Get newest calculated L2 snapshot
    const newestCalcSnapshot = await datalakeKnex(tableName)
                                    .select()
                                    .where('isSnapshotCalc', true)
                                    .orderBy('serverTimestamp', 'desc')
                                    .first();
    if (newestCalcSnapshot) {
        const newestCalcSnapshotMoment = moment(newestCalcSnapshot.serverTimestamp);
        console.log(`${tableName} | Newest calculated L2 snapshot: \t${dateToStringUtc(newestCalcSnapshot.serverTimestamp)}`);
    } else {
        console.log(`${tableName} | Newest calculated L2 snapshot: \tDoes not exist!`);
    }
    
    // Get newest L2 update
    const newestUpdate = await datalakeKnex(tableName)
                                    .select()
                                    .where('isSnapshot', false)
                                    .orderBy('serverTimestamp', 'desc')
                                    .first();
    if (newestUpdate === undefined) {   // Nothing to do if there's no L2 updates
        console.log(`${tableName} | No L2 updates: Skipping...`);
        return
    }
    const newestUpdateMoment = moment(newestUpdate.serverTimestamp);
    console.log(`${tableName} | Newest L2 update: \t\t\t${dateToStringUtc(newestUpdate.serverTimestamp)}`);

    let startMoment;
    var orderbook;
    if (newestCalcSnapshot) {
        startMoment = moment(newestCalcSnapshot.serverTimestamp).utc();
        orderbook = new Orderbook(newestCalcSnapshot);
    } else {
        startMoment = moment(newestSnapshot.serverTimestamp).utc();
        orderbook = new Orderbook(newestSnapshot);
    }

    while (true) {
        console.log('\n')
        // Determine the time of snapshot calculation
        endMoment = startMoment
                        .clone()
                        .add(SNAPSHOT_CALC_INTERVAL_UNIT_AMOUNT, SNAPSHOT_CALC_INTERVAL_UNIT)
                        .startOf(SNAPSHOT_CALC_INTERVAL_UNIT)

        // Stop when snapshot calculation are up to latest L2 update
        if (endMoment > newestUpdateMoment) {
            break;
        }

        if (startMoment == endMoment) {
            console.log('skipping...')
            continue;
        }

        // Skip if calculated snapshot already exist
        const existingCalcSnapshot = await datalakeKnex(tableName)
                                            .select()
                                            .where('serverTimestamp', endMoment.toDate())
                                            .where('isSnapshotCalc', true);
        if (existingCalcSnapshot.length) {
            console.log(`${tableName} | Calculated snapshot already exists on ${dateToStringUtc(endMoment.toDate())}`);
            startMoment = endMoment;
            continue
        }

        // Calculate the snapshot
        console.log(`${tableName} | Calculate snapshot ${endMoment.utc()}`)
        const updates = await datalakeKnex(tableName)
                                .select()
                                .where('serverTimestamp', '>', startMoment.toDate())
                                .andWhere('serverTimestamp', '<', endMoment.toDate())
        if (updates.length) {
            console.log(`${tableName} | L2 updates: \t${updates.length}`)
            for (const u of updates) {
                if (u.isSnapshot) {
                    orderbook.apply(u, true);
                } else {
                    orderbook.apply(u, false);
                }
            }
        } else {
            console.log(`${tableName} | No L2 updates`)
        }

        // Save calculated snapshot to database
        const calcSnapshot = {
            asks: JSON.stringify(orderbook.asks),
            bids: JSON.stringify(orderbook.bids),
            serverTimestamp: endMoment.toDate(),
            isSnapshot: false,
            isSnapshotCalc: true
        }
        await datalakeKnex(tableName).insert(calcSnapshot);
        console.log(`${tableName} | Inserted to database`);

        // Update startMoment
        startMoment = endMoment;
    }

}

(async () => {
    let tableNames = await getAllTables('datalake');
    tableNames = tableNames.filter(tableName => tableName.endsWith('_orderbook'));
    for (const tableName of tableNames) {
      console.log(`\Calculating periodic snapshots for ${tableName}...`);
      await calc_periodic_snapshots(tableName)
    }
})();
