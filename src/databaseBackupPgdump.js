const moment = require('moment');
const perfy = require('perfy');

const { execPromise, dateToString } = require('./lib');
const logger = require('./lib/logger')(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/config/config.json')[env];

const TARGET_DBNAMES = ['app_development', 'datalake_development'];
const BACKUP_BASE_DIR = '/mnt/cryptopip-db-backups'     // network-mounted drive
const dateStamp = moment().format('YYYY-MM-DD');

(async () => {
    // Get IP address of TimescaleDB docker container
    const dbHostCmd = `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' cryptopip-timescaledb`
    let dbHost = await execPromise(dbHostCmd);
    dbHost = dbHost.trim();     // string returned by dbHostcmd includes a new line
    logger.info(`Backing up TimescaleDB databases at ${dbHost}`)

    // pg_dump entire database to a .gz file
    perfy.start('pg_dump')
    for (const dbname of TARGET_DBNAMES) {
        perfy.start(`pg_dump_${dbname}`)
        const backupFilepath = `${BACKUP_BASE_DIR}/${dbname}_${dateStamp}.gz`
        const cmd = `PGPASSWORD=${config.password} pg_dump -h ${dbHost} -p 5432 -U postgres -Z0 -Fc ${dbname} | pigz --rsyncable > ${backupFilepath}`
        await execPromise(cmd)
        logger.info(`Completed backup (pg_dump) of ${dbname} to ${backupFilepath} (${perfy.end(`pg_dump_${dbname}`).time} secs)`)
    }
    logger.info(`Completed backup (pg_dump) of ${TARGET_DBNAMES.length} databases to ${BACKUP_BASE_DIR} (${perfy.end('pg_dump').time} secs)`)

    logger.end();
    process.exit();
})();
