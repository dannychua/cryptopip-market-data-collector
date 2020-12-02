// Update with your config settings.

module.exports = {
    development: {
      client: 'postgresql',
      connection: {
        host: 'localhost',
        // host: '192.198.84.34',
        // host: '10.0.0.206',
        port:     6432,   // pgbouncer
        database: 'datalake_development',
        user:     'postgres',
        password: 'PASSWORD'
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        directory: __dirname + '/../migrations/datalake'
      }
    },
  
    staging: {
      client: 'postgresql',
      connection: {
        host: 'localhost',
        database: 'datalake_staging',
        user:     'postgres',
        password: 'PASSWORD'
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        directory: __dirname + '/../migrations/datalake'
      }
    },
  
    production: {
      client: 'postgresql',
      connection: {
        host: 'localhost',
        database: 'datalake_production',
        user:     'postgres',
        password: 'PASSWORD'
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        directory: __dirname + '/../migrations/datalake'
      }
    }
  }
  