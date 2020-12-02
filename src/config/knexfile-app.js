// Update with your config settings.

module.exports = {
    development: {
      client: 'postgresql',
      connection: {
        host: 'localhost',
        database: 'app_development',
        user:     'postgres',
        password: 'PASSWORD'
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        tableName: 'knex_migrations'
      }
    },
  
    staging: {
      client: 'postgresql',
      connection: {
        host: 'localhost',
        database: 'app_staging',
        user:     'postgres',
        password: 'PASSWORD'
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        tableName: 'knex_migrations'
      }
    },
  
    production: {
      client: 'postgresql',
      connection: {
        host: 'localhost',
        database: 'app_production',
        user:     'postgres',
        password: 'PASSWORD'
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        tableName: 'knex_migrations'
      }
    }
  };
  