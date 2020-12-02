/**
 * Calculates and displays the summary statistics of datalake tables
 */

const _ = require('lodash');
const perfy = require('perfy');
const columnify = require('columnify');

const { datalakeKnex } = require('../../config/db');
const { getAllTables } = require('../../lib/db');

/**
 * Get the estimated row count of all hypertables in a TimescaleDB database
 */
const getEstimatedRowCountOfAllTables = async () => {
    const q = `SELECT h.schema_name,
            h.table_name,
            h.id AS table_id,
            h.associated_table_prefix,
            row_estimate.row_estimate
        FROM _timescaledb_catalog.hypertable h
            CROSS JOIN LATERAL ( SELECT sum(cl.reltuples) AS row_estimate
            FROM _timescaledb_catalog.chunk c
                JOIN pg_class cl ON cl.relname = c.table_name
            WHERE c.hypertable_id = h.id
            GROUP BY h.schema_name, h.table_name) row_estimate
        ORDER BY schema_name, table_name;`
    const results = await datalakeKnex.schema.raw(q);
    return results.rows
}

/**
 * Display a summary of all the hypertables in the datalake (TimescaleDB) database
 * 
 * Example output:
 * 
 * TABLETYPE  COUNT TOTALSIZE INDEXSIZE TABLESIZE ROWCOUNT 
 * _ohlcv     742   71.74 GB  32.43 GB  39.31 GB  446221129
 * _ticks     2413  82.57 GB  32.46 GB  49.79 GB  178584133
 * _orderbook 2413  213.63 GB 62.87 GB  150.47 GB 450183210
 */
const displayTableStats = async () => {
    const tableNames = await getAllTables('datalake');
    const tableSuffixes = ['_ohlcv', '_ticks', '_orderbook'];
    let data = [];

    // Get estimated row counts (~30 secs)
    console.log('Estimating row counts for all tables...')
    perfy.start('estimateRowCount');
    const rowCounts = await getEstimatedRowCountOfAllTables();
    console.log(`Time taken: \t${perfy.end('estimateRowCount').time} secs`)

    for (const suffix of tableSuffixes) {
        perfy.start('tableSizes')
        const filteredTableNames = _.filter(tableNames, tableName => tableName.endsWith(suffix));

        let sizes = {
            total: 0,
            index: 0,
            table: 0
        };
        console.log(`\nCalculating sizes for ${filteredTableNames.length} ${suffix} tables...`)
        for (const tableName of filteredTableNames) {
            const q = `SELECT * FROM hypertable_relation_size('${tableName}') `;
            let results;
            try {
                results = await datalakeKnex.schema.raw(q);
            } catch (e) {
                console.log(`Error selecting hypertable sizes for ${tableName}`);
                continue
            }
            // Skip if empty table
            if (results.rows[0]['total_bytes'] === null) {
                continue
            }
            // Accumulate sizes in bytes
            sizes.total += parseInt(results.rows[0]['total_bytes']);
            sizes.index += parseInt(results.rows[0]['index_bytes']);
            sizes.table += parseInt(results.rows[0]['table_bytes']);
        }

        // Calculate total row counts
        let totalRowCount = 0;
        const filteredCounts = _.filter(rowCounts, rowCount => rowCount.table_name.endsWith(suffix));
        for (const count of filteredCounts) {
            totalRowCount += parseInt(count.row_estimate);
        }

        data.push({
            tableType: suffix,
            count: filteredTableNames.length,
            totalSize: `${parseFloat(sizes.total / 1073741824).toFixed(2)} GB`,
            indexSize: `${parseFloat(sizes.index / 1073741824).toFixed(2)} GB`,
            tableSize: `${parseFloat(sizes.table / 1073741824).toFixed(2)} GB`,
            rowCount: `${totalRowCount}`
        });
        console.log(`Time taken: \t${perfy.end('tableSizes').time} secs`)
    }

    // Display data
    console.log(columnify(data));
}



(async() => {
    await displayTableStats();

    datalakeKnex.destroy();
})();