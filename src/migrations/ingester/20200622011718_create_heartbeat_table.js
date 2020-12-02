
exports.up = async function(knex) {
    // Create tables
    if (await knex.schema.hasTable('heartbeats')) {
        console.log('Table already exist: heartbeats')
    } else {
        await knex.schema.createTable('heartbeats', table => {
            table.increments()
            table.timestamp('timestamp')
            table.timestamp('serverTimestamp')
            table.string('serverId', 64)
            table.string('event', 64)
            table.string('exchange', 64)
            table.string('symbol', 64)
            table.string('datatype', 64)
            table.string('exception', 64)
            table.text('msg')
            table.index(['serverId', 'serverTimestamp', 'event'])
        });
    }
};

exports.down = async function(knex) {
    await knex.schema.dropTable('heartbeats');
};
