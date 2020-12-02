const Queue = require('bull');
const perfy = require('perfy');

const { sleep, generateTableName } = require('../../lib');
const { downloadNewOhlcv } = require('../../getOhlcv');
const logger = require('../../lib/logger')(__filename);

// Connect to redis
const queue = new Queue('ohlcv', {redis: {
    host: 'localhost',
    // host: '192.198.84.34',
    port: 6379,
    password: 'cryptopippass'
}});

queue.process(async (job, done) => {
    perfy.start('downloadNewOhlcv')
    await downloadNewOhlcv(job.data.exchange, job.data.market);
    logger.info(`jobId ${job.id} | ${generateTableName(job.data.exchange, job.data.market)} | Completed (${perfy.end('downloadNewOhlcv').time} secs)`)

    const completed = await queue.getJobs('completed');
    const waiting = await queue.getJobs('waiting');
    const active = await queue.getJobs('active');
    const delayed = await queue.getJobs('delayed');
    const failed = await queue.getJobs('failed');
    logger.info(`QHLCV Queue | Completed: ${completed.length} | Waiting: ${waiting.length} | Active: ${active.length} | Delayed: ${delayed.length} | Failed: ${failed.length} |`)

    await sleep(2500);
    done()
});
