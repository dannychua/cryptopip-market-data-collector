const Queue = require('bull');

// Connect to redis
const queue = new Queue('ohlcv', {redis: {
    host: 'localhost',
    port: 6379,
    password: 'cryptopippass'
}});

(async () => {

    let jobs = await queue.getJobCounts();

    console.log(`\n[ Before Emptying ]`);
    console.log(`Waiting: \t${jobs.waiting}`);
    console.log(`Active: \t${jobs.active}`);
    console.log(`Completed: \t${jobs.completed}`);
    console.log(`Failed: \t${jobs.failed}`);
    console.log(`Delayed: \t${jobs.delayed}`);

    // Empty queue completely
    await queue.pause();
    await queue.clean(0, 'wait');
    await queue.clean(0, 'active');
    await queue.clean(0, 'completed');
    await queue.clean(0, 'failed');
    await queue.clean(0, 'delayed');
    await queue.empty();


    jobs = await queue.getJobCounts();
    console.log(`\n[ After Cleaning + Emptying ]`)
    console.log(`Waiting: \t${jobs.waiting}`)
    console.log(`Active: \t${jobs.active}`)
    console.log(`Completed: \t${jobs.completed}`)
    console.log(`Failed: \t${jobs.failed}`)
    console.log(`Delayed: \t${jobs.delayed}`)

    queue.close();
})();

