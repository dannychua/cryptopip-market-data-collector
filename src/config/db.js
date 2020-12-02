const Knex = require('knex');
const appDbConfig = require('./knexfile-app');
const datalakeDbConfig = require('./knexfile-datalake');
const ingesterDbConfig = require('./knexfile-ingester');
const env = process.env.NODE_ENV || 'development';

exports.appKnex = Knex(appDbConfig[env]);
exports.datalakeKnex = Knex(datalakeDbConfig[env]);
exports.ingesterKnex = Knex(ingesterDbConfig[env]);