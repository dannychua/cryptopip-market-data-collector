const Queue = require('bull');

const universe = require('../../config/universe.json');
const { generateTableName, getExchangeSymbols } = require('../../lib');

// Connect to redis
const queue = new Queue('ohlcv', {redis: {
    host: 'localhost',
    port: 6379,
    password: 'cryptopippass'
}});

(async () => {
    // // // // TODO: Testing only
    // await queue.pause()
    // await queue.clean(0, 'completed')
    // await queue.clean(0, 'active')
    // await queue.clean(0, 'delayed')
    // await queue.clean(0, 'failed')
    // await queue.empty();
    
    // Add all exchange's markets as jobs
    for (const exchangeName in universe) {
        if (exchangeName !== 'binance') {
            continue
        }
        console.log(`\n${exchangeName}`);

        const marketNames = await getExchangeSymbols(exchangeName, reload=true);
        for (const marketName of marketNames) {
            await queue.add({exchange: exchangeName, market: marketName})

            const symbol = generateTableName(exchangeName, marketName, 'prefix');
            console.log(`\t${symbol}`);
        }
    }

    const jobs = await queue.getJobs('queued')
    console.log(`\nTotal queued jobs: ${jobs.length}`)
    queue.close();
})();

