const winston = require('winston');
require('winston-daily-rotate-file');
// const ElasticsearchWinston = require('winston-elasticsearch');
const os = require('os');
const path = require('path');
const moment = require('moment');
const env = process.env.NODE_ENV || 'development';
const { sleep } = require('.');

const options = {
    file: {
        level: 'debug',
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.align(),
            winston.format.printf(info => {
                info.timestamp = moment.utc(info.timestamp).local().format('YYYY-MM-DD HH:mm:ss ZZ')
                return `${info.timestamp} ${info.hostname} ${info.service} ${info.level}: ${info.message}`
            })
        ),
        datePattern: 'YYYY-MM-DD',
        filename: `${__dirname}/../../logs/%DATE%-${env}.log`,
        maxSize: '20m',
        maxFiles: '1095d'       // 3 years
    },
    console: {
        level: 'debug',
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.align(),
            winston.format.printf(info => {
                info.timestamp = moment.utc(info.timestamp).local().format('YYYY-MM-DD HH:mm:ss ZZ')
                return `${info.timestamp} ${info.level}: ${info.message}`
            })
        )
    },
    elasticsearch: {
        level: 'debug',
        clientOpts: {
            node: 'http://elk.dannychua.io:9200',
            maxRetries: 5,
            requestTimeout: 60000,
            sniffOnStart: false,
            auth: {
                username: 'elastic',
                password: 'Elastic1!'
            }
        }
    }
}

// /**
//  * Program does not exit if winston-elasticsearch is used
//  * USAGE:
//  *      logger.info('my message)
//  *      logger.end()        // call this for logger to flush and for program to end !!!!!
//  * This workaround allows program to exit after flushing write queue
//  * https://github.com/vanthome/winston-elasticsearch/issues/17#issuecomment-479679866
//  */
// ElasticsearchWinston.prototype.end = async function() {
//     const bulkWriter = this.bulkWriter;
//     bulkWriter.stop();
  
//     while(bulkWriter.bulk.length > 0) {
//         await bulkWriter.flush();
//         await sleep(50)
//     }
  
//     this.emit('finish');
// };

let logger = winston.createLogger({
    exitOnError: false,
    transports: [
        new (winston.transports.DailyRotateFile)(options.file),
        new winston.transports.Console(options.console),
        // new ElasticsearchWinston(options.elasticsearch)
    ]
});

module.exports = (__filename) => {
    return logger.child({
        service: path.parse(__filename).name,
        hostname: os.hostname(),
        environment: env
    });
}

