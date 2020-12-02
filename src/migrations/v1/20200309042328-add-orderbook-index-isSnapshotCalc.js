'use strict';

const { getAllTables } = require('../lib/db');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let tableNames = await getAllTables('datalake');
    tableNames = tableNames.filter(tableName => tableName.endsWith('_orderbook'));

    for (const tableName of tableNames) {
      try {
        await queryInterface.addIndex(tableName, ['isSnapshotCalc']);
        console.log(tableName)
      } catch(e) {
        console.log(`Error adding index to ${tableName}: ${e}`)
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    let tableNames = await getAllTables('datalake');
    tableNames = tableNames.filter(tableName => tableName.endsWith('_orderbook'));

    for (const tableName of tableNames) {
      try{
        await queryInterface.removeIndex(tableName, ['isSnapshotCalc']);
        console.log(tableName)
      } catch (e) {
        console.log(`Error removing index from ${tableName}: ${e}`)
      }
    }
  }
};
