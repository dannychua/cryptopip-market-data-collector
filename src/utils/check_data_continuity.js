/**
 * Counts the number of rows in each hour between 2 dates.
 * This helps to check for time intervals (with hourly resolution) where data is missing.
 */

 // Comment out if not using user-specified dates
 const USER_SPECIFIED_START_DATE = '2020-01-19 00:00:00';
 const USER_SPECIFIED_END_DATE = '2020-01-20 00:00:00';
 
 //********************************************************** */
 
 const Sequelize = require('sequelize');
 const env = process.env.NODE_ENV || 'development';
 const config = require(__dirname + '/../config/config.json')[env];
 const moment = require('moment');
 const { dateToString, enumerateBetweenDates } = require('../lib');
 const logger = require('../lib/logger')(__filename);
 
 const INCREMENT_UNIT = 'hours'
 const TABLE_NAMES = ['binance_btc_usdt_ticks', 'binance_btc_usdt_orderbook'];     // use this table to check for data continuity
 const sequelize = new Sequelize(config.database, config.username, config.password, config);  // local database
 
 (async () => {
 
     let startDate = null;
     let endDate = null;
 
     if ((typeof USER_SPECIFIED_START_DATE !== 'undefined') || (typeof USER_SPECIFIED_END_DATE !== 'undefined')) {
 
         // Check between the user-specified dates
         startDate = new Date(USER_SPECIFIED_START_DATE);
         endDate = new Date(USER_SPECIFIED_END_DATE);
         logger.debug(`Checking Between User-Specified Dates: ${dateToString(startDate)} - ${dateToString(endDate)}`);
 
     } else {
         // Check the entire history in local database (Skipping first day)
         // Get oldest and latest timestamp available on local database
         const q = `SELECT MIN("serverTimestamp") as start, MAX("serverTimestamp") as end,
             pg_size_pretty( pg_database_size('database_development') ) as size
             FROM ${TABLE_NAMES[0]}`
         const result = await sequelize
             .query(q, { type: Sequelize.QueryTypes.SELECT })
             .catch(e => {
                 console.log(`Error getting timestamp of latest trade data: ${e}`);
             }); 
 
         const oldestTimestamp = result[0].start;
         const latestTimestamp = result[0].end;
         startDate = moment(oldestTimestamp).add(1, 'd').startOf('day').toDate();     // Skip the oldest date
         endDate = moment(latestTimestamp).startOf('day').startOf('day').toDate();
         logger.debug(`Available Historical Data: ${dateToString(startDate)} - ${dateToString(endDate)}`);
     }
     
     // Start checking on every time increment
     for (let t of enumerateBetweenDates(startDate, endDate, INCREMENT_UNIT)) {
         const start = moment(t);
         const end = moment(t).add(1, INCREMENT_UNIT);
         for (const tableName of TABLE_NAMES) {
             const q = `SELECT COUNT(*) FROM ${tableName}
                 WHERE \'${start.format('YYYY-MM-DD HH:mm:ss')}\' <= \"serverTimestamp\"
                 AND \"serverTimestamp\" < \'${end.format('YYYY-MM-DD HH:mm:ss')}\';`
             const result = await sequelize
                 .query(q, { type: Sequelize.QueryTypes.SELECT })
                 .catch(e => {
                     console.log(`Error count of rows: ${e}`);
                 }); 
             const count = result[0].count;
             if (count == 0) {
                 logger.debug(`${tableName} | Missing data on ${start.format('YYYY-MM-DD HH:mm:ss')}`)
             } else {
                 console.log(`${start.format('YYYY-MM-DD HH:mm:ss')} | ${tableName}: \t${count}`)
             }
         }
     }
 
     logger.end();
 })();