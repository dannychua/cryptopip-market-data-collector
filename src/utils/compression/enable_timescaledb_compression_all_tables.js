/**
 * Enable TimescaleDB native compression on all hypertables, segment by 'symbol'
 * Manually compress all hypertable chunks, to avoid waiting for scheduled compression jobs to start
 */

const PLimit = require('p-limit');
const perfy = require('perfy');

const { datalakeKnex, appKnex } = require('../../config/db');
const { getAllTables } = require('../../lib/db');

const COMPRESSION_POLICY_INTERVAL = '1 day';
const MANUAL_COMPRESSION_CONCURRENCY = 4;
const pLimit = PLimit(MANUAL_COMPRESSION_CONCURRENCY);

const enableCompression = async (tableName) => {
    console.log(`Enabling compression for: ${tableName}`)

    // Set compression options
    if (tableName.endsWith('_ticks') || tableName.endsWith('_orderbook')) {
        await datalakeKnex.raw(`ALTER TABLE ${tableName} SET (
            timescaledb.compress, 
            timescaledb.compress_orderby = '"serverTimestamp", id DESC'
        )`);
    } else if (tableName.endsWith('_ohlcv')) {
        await datalakeKnex.raw(`ALTER TABLE ${tableName} SET (
            timescaledb.compress, 
            timescaledb.compress_orderby = '"exchangeTimestamp", interval DESC'
        )`);
    }

    // Set automated compression policy
    await datalakeKnex.raw(`SELECT add_compress_chunks_policy('${tableName}', INTERVAL '${COMPRESSION_POLICY_INTERVAL}')`);
}

const manuallyCompressChunks = async (tableName) => {
    let chunks = await datalakeKnex.raw(`SELECT show_chunks('${tableName}', older_than => interval '${COMPRESSION_POLICY_INTERVAL}')`);
    chunks = chunks.rows.map(chunk => chunk.show_chunks);
    if (chunks.length > 0) {
        console.log(`Manually compressing ${tableName}: ${chunks.length} chunks`);
        for (const chunk of chunks) {
            await datalakeKnex.raw(`SELECT compress_chunk('${chunk}')`);
        }
    }
}

(async () => {
    const tableNames = await getAllTables('datalake');

    // Enable native compression
    perfy.start('enableCompression');
    const enableCompressionPromises = tableNames.map(
        tableName => pLimit(() => enableCompression(tableName))
    );
    const enableCompressionResults = await Promise
                                    .all(enableCompressionPromises)
                                    .catch(e => console.log(`Error in enabling compression: ${e}`));
    
    console.log(`\nEnabled TimescaleDB native compression for all ${tableNames.length} hypertables (${perfy.end('enableCompression').time} secs)`);

    // Manually compress chunks (avoid having to wait for automated compression jobs to run)
    perfy.start('manualCompress')
    const compressPromises = tableNames.map(
        tableName => pLimit(() => manuallyCompressChunks(tableName))
    );
    const compressResults = await Promise
                                    .all(compressPromises)
                                    .catch(e => console.log(`Error in compressing chunks: ${e}`));

    console.log(`\Finished manually compressing hypertable chunks (${perfy.end('manualCompress').time} secs)`);

})();
