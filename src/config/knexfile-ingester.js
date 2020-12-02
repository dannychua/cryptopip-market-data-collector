// Update with your config settings.

module.exports = {
    development: {
      client: 'postgresql',
      connection: {
        // host: 'localhost',
        host: '10.0.0.204',
        port:     6432,   // pgbouncer
        database: 'ingester_development',
        user:     'postgres',
        password: 'PASSWORD'
      },
      pool: {
        min: 1,
        max: 2
      },
      migrations: {
        directory: __dirname + '/../migrations/ingester'
      }
    },
  
    staging: {
      client: 'postgresql',
      connection: {
        host: 'localhost',
        database: 'ingester_staging',
        user:     'postgres',
        password: 'PASSWORD'
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        directory: __dirname + '/../migrations/ingester'
      }
    },
  
    production: {
      client: 'postgresql',
      connection: {
        host: 'localhost',
        database: 'ingester_production',
        user:     'postgres',
        password: 'PASSWORD'
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        directory: __dirname + '/../migrations/ingester'
      }
    }
  }
  