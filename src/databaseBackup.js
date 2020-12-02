const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/config/config.json')[env];
const logger = require('./lib/logger')(__filename);
const { execPromise } = require('./lib');
const moment = require('moment');
const perfy = require('perfy');

const BACKUP_DIR_BASE_PATH = `${__dirname}/backups`
const sequelize = new Sequelize(config.database, config.username, config.password, config);

// Date calculations
let yesterday = moment().startOf('day').subtract(1, 'd').toDate();
const month = yesterday.getMonth() + 1;         // Month number starts at 0
const year = yesterday.getFullYear();
const subdirName = `${year}-${month.toString().padStart(2,0)}`;

(async () => {
    // Get all tables names in database
    perfy.start('getTablenames')
    let tableNames = [];
    const q = `SELECT table_name
                FROM information_schema.tables
                WHERE table_schema='public'
                AND table_type='BASE TABLE'
                AND table_name != 'SequelizeMeta';`
    const result = await sequelize
        .query(q, { type: Sequelize.QueryTypes.SELECT })
        .catch(e => {
            logger.error(`Error getting a list of all tables: ${e}`);
        });
        for (const r of result) {
            tableNames.push(r['table_name']);
        }
    logger.info(`Loaded ${tableNames.length} tables (${perfy.end('getTablenames').time} secs)`);
    
    // Extract current month's data from every table as CSV, compress and save to a .csv.gz file in a directory with format YYYY-mm
    perfy.start('backup');
    for (const tableName of tableNames) {
        perfy.start('backupTable')
        const backupDirpath = `${BACKUP_DIR_BASE_PATH}/${subdirName}`;
        const ensureDirCmd = `mkdir -p ${backupDirpath}`
        const ensureDirOutput = await execPromise(ensureDirCmd)
        const start = moment(yesterday).startOf('month').format('YYYY-MM-DD')
        const end = moment(yesterday).endOf('month').format('YYYY-MM-DD')
        let subquery = `SELECT * FROM \\"${tableName}\\" 
            WHERE '${start}' <= \\"serverTimestamp\\"
            AND \\"serverTimestamp\\" < '${end}'`;
        let query = `Copy (${subquery}) To stdout With CSV DELIMITER ','`;
        const cmd = `PGPASSWORD=${config.password} psql -h 127.0.0.1 -U ${config.username} -d ${config.database} -c "${query}" | pigz --rsyncable > ${backupDirpath}/${tableName.split(' ').join('-')}.csv.gz`
        // const cmd = `PGPASSWORD=${config.password} psql -h 127.0.0.1 -U ${config.username} -d ${config.database} -c "${query}" > ${backupDirpath}/${tableName.split(' ').join('-')}.csv`
        const output = await execPromise(cmd);
        if (output.length) {
            logger.debug(output.toString());
        }
        logger.debug(`Backed up to ${backupDirpath}/${tableName}.csv.gz (${perfy.end('backupTable').time} secs)`);
    }
    logger.info(`Backed up ${tableNames.length} tables to ${BACKUP_DIR_BASE_PATH}/${subdirName} (${perfy.end('backup').time} secs)`);

    sequelize.close();

    // Compress the entire directory
    logger.info(`Compressing backup directory ${BACKUP_DIR_BASE_PATH}/${subdirName}`);
    perfy.start('tar');
    const compressCmd = `tar -I pigz -cvf ${BACKUP_DIR_BASE_PATH}/${subdirName}.tar.gz ${BACKUP_DIR_BASE_PATH}/${subdirName}`;
    const compressOutput = await execPromise(compressCmd);
    logger.info(`Saved to ${BACKUP_DIR_BASE_PATH}/${subdirName}.tar.gz (${perfy.end('tar').time} secs)`);

    // rclone to Google drive
    logger.info('Rclone sync to Google drive...');
    perfy.start('rclone');
    const rcloneCmd = `rclone sync ${BACKUP_DIR_BASE_PATH} gdrive_cryptopip_db:/cryptopip-db --filter '+ *.tar.gz' --filter '- *' --delete-excluded --fast-list --drive-chunk-size=32M --skip-links --log-file ~/cryptopip/logs/rclone.log`;
    const rcloneOutput = await execPromise(rcloneCmd);
    if (rcloneOutput.length) {
        console.log(rcloneOutput.toString());
    }
    logger.info(`Rclone sync completed (${perfy.end('rclone').time} secs)`);
    
    logger.end();
})();
