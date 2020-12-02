
exports.up = async function(knex) {
    // Create tables
    if (await knex.schema.hasTable('trades')) {
        console.log('Table already exist: trades')
    } else {
        await knex.schema.createTable('trades', table => {
            table.increments()
            table.timestamp('serverTimestamp')
            table.timestamp('exchangeTimestamp')
            table.string('symbol', 64).notNullable()
            table.string('tradeId', 64)
            table.specificType('takerOrMaker', 'char(5)')
            table.specificType('side', 'char(4)').notNullable()
            table.specificType('price', 'double precision').notNullable()
            table.specificType('amount', 'double precision').notNullable()
            table.string('buyOrderId', 64)
            table.string('sellOrderId', 64)
            table.dropPrimary()     // drop primary key 'id'
            table.primary(['exchangeTimestamp', 'id'])
            table.index(['symbol', 'exchangeTimestamp'], 'trades_symbol_exchangeTimestamp')
        });
    }

    if (await knex.schema.hasTable('orderbooks')) {
        console.log('Table already exist: orderbooks')
    } else {
        await knex.schema.createTable('orderbooks', table => {
            table.increments()
            table.timestamp('exchangeTimestamp')
            table.timestamp('serverTimestamp')
            table.string('symbol', 64).notNullable()
            table.specificType('sequenceId', 'integer').unsigned()
            table.specificType('lastSequenceId', 'integer').unsigned()
            table.text('asks')
            table.text('bids')
            table.boolean('isSnapshot').defaultTo(false).notNullable()
            table.boolean('isSnapshotCalc').defaultTo(false).notNullable()
            table.dropPrimary()     // drop primary key 'id'
            table.primary(['serverTimestamp', 'id'])
            table.index(['symbol', 'isSnapshotCalc'], 'orderbooks_symbol_isSnapshotCalc')
            table.index(['symbol', 'serverTimestamp'], 'orderbooks_symbol_serverTimestamp')
        });
    }

    if (await knex.schema.hasTable('ohlcv')) {
        console.log('Table already exist: ohlcv')
    } else {
        await knex.schema.createTable('ohlcv', table => {
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
            table.index(['symbol', 'exchangeTimestamp'], 'ohlcv_symbol_exchangeTimestamp')
        });
    }

    // Create hypertable
    try {
        await knex.schema.raw(`SELECT create_hypertable('trades', 'exchangeTimestamp', chunk_time_interval => interval '1 day');`);
        console.log('Created hypertable: trades');
    } catch (e) {
        console.log('Hypertable already exists: trades')
    }

    try {
        await knex.schema.raw(`SELECT create_hypertable('orderbooks', 'serverTimestamp', chunk_time_interval => interval '1 day');`);
        console.log('Created hypertable: orderbooks');
    } catch (e) {
        console.log('Hypertable already exists: orderbooks')
    }

    try {
        await knex.schema.raw(`SELECT create_hypertable('ohlcv', 'exchangeTimestamp', chunk_time_interval => interval '1 month');`);
        console.log('Created hypertable: ohlcv');
    } catch (e) {
        console.log('Hypertable already exists: ohlcv')
    }

    // Enable native compression
    try {
        await knex.raw(`ALTER TABLE trades SET (
            timescaledb.compress, 
            timescaledb.compress_segmentby = '"symbol"',
            timescaledb.compress_orderby = '"serverTimestamp", id DESC'
        )`);
    } catch (e) {
        console.log(`Error enabling native compression: trades: ${e}`);
    }

    try {
        await knex.raw(`ALTER TABLE orderbooks SET (
            timescaledb.compress, 
            timescaledb.compress_segmentby = '"symbol"',
            timescaledb.compress_orderby = '"serverTimestamp", id DESC'
        )`);
    } catch (e) {
        console.log(`Error enabling native compression: orderbooks: ${e}`);
    }

    try {
        await knex.raw(`ALTER TABLE ohlcv SET (
            timescaledb.compress, 
            timescaledb.compress_segmentby = '"symbol"',
            timescaledb.compress_orderby = '"exchangeTimestamp", id DESC'
        )`);
    } catch (e) {
        console.log(`Error enabling native compression: ohlcv: ${e}`);
    }
};

exports.down = async function(knex) {
    await knex.schema.dropTable('trades');
    await knex.schema.dropTable('orderbooks');
    await knex.schema.dropTable('ohlcv');
};
