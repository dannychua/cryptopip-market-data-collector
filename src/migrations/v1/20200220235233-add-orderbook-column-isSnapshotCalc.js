'use strict';

const { getAllTables } = require('../lib/db');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all orderbook tables
    let tableNames = await getAllTables('datalake');
    tableNames = tableNames.filter(tableName => tableName.endsWith('_orderbook'));

    // Add column to all _orderbook tables
    for (const tableName of tableNames) {
      try {
        await queryInterface.addColumn(
          tableName,
          'isSnapshotCalc',
          {
            type: Sequelize.BOOLEAN,
          }
        );
        console.log(tableName)
      } catch (e) {
        // return Promise.reject(e)
        console.log(`WARNING: ${e}`)
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Get all orderbook tables
    let tableNames = await getAllTables('datalake');
    tableNames = tableNames.filter(tableName => tableName.endsWith('_orderbook'));

    // Add column to all _orderbook tables
    for (const tableName of tableNames) {
      try {
        await queryInterface.removeColumn(tableName, 'isSnapshotCalc');
        console.log(tableName)
      } catch (e) {
        return Promise.reject(e)
        // console.log(`WARNING: ${e}`)
      }
    }

    
  }
};
