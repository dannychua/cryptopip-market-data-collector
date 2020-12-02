'use strict';

const PLimit = require('p-limit');

// Load markets
const universe = require('../config/universe.json');

// Create both regular table and hypertable for an exchange's market
const createTableAndHypertable = async (queryInterface, Sequelize, tableNamePrefix) => {
  // Orderbook table
  const tableNameOrderbook = tableNamePrefix + '_orderbook';

  try {
    await queryInterface.createTable(tableNameOrderbook, {
      id: {
        // allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sequenceId: {
        type: Sequelize.INTEGER
      },
      lastSequenceId: {
        type: Sequelize.INTEGER
      },
      asks: {
        type: Sequelize.TEXT
      },
      bids: {
        type: Sequelize.TEXT
      },
      isSnapshot: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      timestampMs: {
        type: Sequelize.BIGINT
      },
      serverTimestamp: {
        type: Sequelize.DATE(6),
        primaryKey: true,
        allowNull: false,
      }
    });
  } catch(e) {
    return Promise.reject(e);
  }

  // Orderbook hypertable
  try {
    await queryInterface.sequelize.query(`SELECT create_hypertable('"${tableNameOrderbook}"', 'serverTimestamp', chunk_time_interval => interval '1 day');`);
  } catch(e) {
    return Promise.reject(e);
  }

  // Tick table
  const tableNameTick = tableNamePrefix + '_ticks';

  try {
    await queryInterface.createTable(tableNameTick, {
      id: {
        // allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      tradeId: {
        type: Sequelize.STRING
      },
      unix: {
        type: Sequelize.BIGINT
      },
      side: {
        type: Sequelize.STRING
      },
      price: {
        type: Sequelize.DOUBLE
      },
      amount: {
        type: Sequelize.DOUBLE
      },
      buyOrderId: {
        type: Sequelize.STRING
      },
      sellOrderId: {
        type: Sequelize.STRING
      },
      serverTimestamp: {
        type: Sequelize.DATE(6),
        primaryKey: true,
        allowNull: false,
      }
    });
  } catch(e) {
    return Promise.reject(e);
  }

  // Tick hypertable
  try {
    await queryInterface.sequelize.query(`SELECT create_hypertable('"${tableNameTick}"', 'serverTimestamp', chunk_time_interval => interval '1 day');`);
    return Promise.resolve();
  } catch(e) {
    return Promise.reject(e);
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const DATABASE_ONCURRENCY = 50
    const pLimit = PLimit(DATABASE_ONCURRENCY);

    try {
      for (let exchange in universe) {
        console.log('\n', exchange)
        const promises = universe[exchange].map(market => pLimit(() => {
          const tableName = `${exchange}_${market}`.toLowerCase();
          console.log('\t', tableName);
          return createTableAndHypertable(queryInterface, Sequelize, tableName);
        }));
        await Promise.all(promises);
      };
      // for (let exchange in universe) {
      //   for (const market of universe[exchange]) {
      //     const tableName = `${exchange}_${market}`.toLowerCase();
      //     console.log('\t', tableName)
      //     await createTableAndHypertable(queryInterface, Sequelize, tableName);
      //   };
      // };
      return Promise.resolve();
    } catch(e) {
      return Promise.reject(e);
    }
  },
  down: async (queryInterface, Sequelize) => {
    try {
      for (let exchange in universe) {
        for (const market of universe[exchange]) {
          const tableName = `${exchange}_${market}`.toLowerCase();
          await queryInterface.dropTable(tableName + '_ticks');
          await queryInterface.dropTable(tableName + '_orderbook');
          console.log('Dropped: ', tableName);
        };
      };
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }
};