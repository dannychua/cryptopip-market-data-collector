'use strict';

const get_all_tables = async (queryInterface, Sequelize) => {
  const tableNames = [];
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
    tableNames.push(r['table_name']);
    // if (r['table_name'].endsWith('_ticks')) {
    //   tableNames.push(r['table_name']);
    // }
  }
  return tableNames
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let tableNames;
    try {
      tableNames = await get_all_tables(queryInterface, Sequelize);
    } catch (e) {
      return Promise.reject(e)
    }
    
    // For all tables, add column and update its value
    for (const tableName of tableNames) {
      // Add column
      try {
        await queryInterface.addColumn(
          tableName,
          'exchangeTimestamp',
          {
            type: Sequelize.DATE(6),
          }
        );
      } catch (e) {
        // return Promise.reject(e)
        console.log(`WARNING: ${e}`)
      }

      // Update column with timestamp converted from 'unix' column or 'timestampMs' column
      try{
        if (tableName.endsWith('_ticks')) {               // Trades table
          await queryInterface
                  .sequelize
                  .query(`UPDATE "${tableName}" SET "exchangeTimestamp" = to_timestamp(unix/1000.0)`);
        } else if (tableName.endsWith('_orderbook')) {    // Orderbook table
          await queryInterface
                  .sequelize
                  .query(`UPDATE "${tableName}" SET "exchangeTimestamp" = to_timestamp("timestampMs"/1000.0)`);
        } else {
          return Promise.reject(e);
        }
        console.log(tableName)
      } catch (e) {
        return Promise.reject(e);
        // console.log(`WARNING: ${e}`)
      }
    }

    return Promise.resolve();
    
  },

  down: async (queryInterface, Sequelize) => {
    let tableNames;
    try {
      tableNames = await get_all_tables(queryInterface, Sequelize);
    } catch (e) {
      return Promise.reject(e)
    }
    
    // Remove column from all tables
    for (const tableName of tableNames) {
      try {
        await queryInterface.removeColumn(tableName, 'exchangeTimestamp');
        console.log(tableName)
      } catch (e) {
        return Promise.reject(e)
      }
    }

    
  }
};
