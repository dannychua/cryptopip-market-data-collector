const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const { parseTuple } = require('../lib');
const config = require(__dirname + '/../config/config.json')[env];

// Get all Sequelize models from the /models directory
modelsPath = path.join(__dirname, '..', 'models');
sequelize = new Sequelize(config.database, config.username, config.password, config);
db = {};
fs
    .readdirSync(modelsPath)
    .filter(file => {
        return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file.slice(-3) === '.js');
    })
    .forEach(file => {
        const model = sequelize['import'](path.join(modelsPath, file));
        db[model.name] = model;
    });

// Display each table's stats
(async function() {
    let totalTicks = 0;
    let totalOrderbookEntries = 0;
    let totalBytes = 0;
    for (const modelName in db) {
        const model = db[modelName];
        const tableName = modelName.replace('_model', '');
        const numRows = await model.count();
        const tableSizeQuery = ` SELECT hypertable_relation_size_pretty('${tableName}')`;
        let tableSize = await sequelize.query(tableSizeQuery, { type: Sequelize.QueryTypes.SELECT });
        tableSize = parseTuple(tableSize[0]['hypertable_relation_size_pretty'])
        tableSize = tableSize[3] ? tableSize[3] : 0;
        
        if (tableName.includes('_ticks')){
            totalTicks += numRows;
        } else if (tableName.includes('_orderbook')) {
            totalOrderbookEntries += numRows;
        }
        
        console.log(`${tableName} | ${numRows} | ${tableSize}`);
    }
    console.log(`\nTotal Ticks: ${totalTicks}`);
    console.log(`Total Orderbook Entries: ${totalOrderbookEntries}`);
})();
