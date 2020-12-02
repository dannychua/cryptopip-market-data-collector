'use strict';

const get_all_tables = async (queryInterface, Sequelize) => {
  const tableNames = {
    trades: [],
    orderbook: [],
    ohlcv: []
  };
  const q = `SELECT table_name
              FROM information_schema.tables
              WHERE table_schema='public'
              AND table_type='BASE TABLE'
              AND table_name != 'SequelizeMeta';`
  const result = await queryInterface.sequelize
      .query(q, { type: Sequelize.QueryTypes.SELECT })
      .catch(e => {
          console.log(`Error getting a list of all tables in the database ${sequelize.config.database}: ${e}`);
          return Promise.reject(e)
      });
  for (const r of result) {
    if (r['table_name'].endsWith('_ticks')) {
      tableNames.trades.push(r['table_name']);
    } else if (r['table_name'].endsWith('_orderbook')) {
      tableNames.orderbook.push(r['table_name']);
    } else if (r['table_name'].endsWith('_ohlcv')) {
      tableNames.ohlcv.push(r['table_name']);
    }
  }
  return tableNames
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all table names for Trades tables and Orderbook tables
    let tableNames;
    try {
      tableNames = await get_all_tables(queryInterface, Sequelize);
    } catch (e) {
      return Promise.reject(e)
    }

    // Remove column 'unix from all Trades tables
    for (const tableName of tableNames.trades) {
      try {
        await queryInterface.removeColumn(tableName, 'unix');
        console.log(tableName)
      } catch (e) {
        // console.log(`Error when removing column 'unix': ${e}`)
        return Promise.reject(e)
      }
    }

    // Remove column 'timestampMs from all Orderbook tables
    for (const tableName of tableNames.orderbook) {
      try {
        await queryInterface.removeColumn(tableName, 'timestampMs');
        console.log(tableName)
      } catch (e) {
        // console.log(`Error when removing column 'timestampMs': ${e}`)
        return Promise.reject(e)
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Get all table names for Trades tables and Orderbook tables
    let tableNames;
    try {
      tableNames = await get_all_tables(queryInterface, Sequelize);
    } catch (e) {
      return Promise.reject(e)
    }

    // Add column 'unix from all Trades tables
    for (const tableName of tableNames.trades) {
      try{
        await queryInterface.addColumn(
          tableName,
          'unix',
          {
            type: Sequelize.BIGINT,
          }
        );
        await queryInterface
                .sequelize
                .query(`UPDATE "${tableName}" SET "unix" = EXTRACT(EPOCH FROM "exchangeTimestamp") * 1000.0`);
      } catch (e) {
        return Promise.reject(e);
        // console.log(`WARNING: ${e}`)
      }
    }

    // Add column 'timestampMs from all Orderbook tables
    for (const tableName of tableNames.orderbook) {
      try{
        await queryInterface.addColumn(
          tableName,
          'timestampMs',
          {
            type: Sequelize.BIGINT,
          }
        );
        // timestampMs is usually null, so not needed to run this query
        // await queryInterface
        //         .sequelize
        //         .query(`UPDATE "${tableName}" SET "timestampMs" = EXTRACT(EPOCH FROM "exchangeTimestamp") * 1000.0`);
      } catch (e) {
        return Promise.reject(e);
        // console.log(`WARNING: ${e}`)
      }
    }
  }
};
