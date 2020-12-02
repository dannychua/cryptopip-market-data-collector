const ccxtpro = require('ccxt.pro');

(async () => {
    const exchange = new ccxtpro['bitfinex']({
        enableRateLimit: true,
        options: {
            tradesLimit: 1
        }
    });

    // numTicks = 0;
    while(true) {
        const trades = await exchange.watchTrades('ETH/BTC');
        console.log(trades)

        // numTicks += 1;
        // if (numTicks > 20) {
        //     break;
        // }
    }

    process.exit(0);
})();



/**
 * OUTPUT
 * 
 * [
  {
    info: [ null, 1586126703, 0.021092, -1.01565924 ],
    timestamp: 1586126703000,
    datetime: '2020-04-05T22:45:03.000Z',
    symbol: 'ETH/BTC',
    id: undefined,
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'sell',
    price: 0.021092,
    amount: 1.01565924,
    cost: 0.02142228469008,
    fee: undefined
  }
]
[
  {
    info: [
      145438,
      'tu',
      '17549085-ETHBTC',
      433108716,
      1586127571,
      0.021085,
      0.02
    ],
    timestamp: 1586127571000,
    datetime: '2020-04-05T22:59:31.000Z',
    symbol: 'ETH/BTC',
    id: '433108716',
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'buy',
    price: 0.021085,
    amount: 0.02,
    cost: 0.0004217,
    fee: undefined
  }
]
[
  {
    info: [
      145438,
      'tu',
      '17549086-ETHBTC',
      433108717,
      1586127593,
      0.021083,
      0.02
    ],
    timestamp: 1586127593000,
    datetime: '2020-04-05T22:59:53.000Z',
    symbol: 'ETH/BTC',
    id: '433108717',
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'buy',
    price: 0.021083,
    amount: 0.02,
    cost: 0.00042166,
    fee: undefined
  }
]
[
  {
    info: [
      145438,
      'tu',
      '17549087-ETHBTC',
      433108754,
      1586127649,
      0.021093,
      0.96
    ],
    timestamp: 1586127649000,
    datetime: '2020-04-05T23:00:49.000Z',
    symbol: 'ETH/BTC',
    id: '433108754',
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'buy',
    price: 0.021093,
    amount: 0.96,
    cost: 0.02024928,
    fee: undefined
  }
]
[
  {
    info: [
      145438,
      'tu',
      '17549088-ETHBTC',
      433108762,
      1586127703,
      0.021093,
      0.02
    ],
    timestamp: 1586127703000,
    datetime: '2020-04-05T23:01:43.000Z',
    symbol: 'ETH/BTC',
    id: '433108762',
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'buy',
    price: 0.021093,
    amount: 0.02,
    cost: 0.00042186000000000003,
    fee: undefined
  }
]
[
  {
    info: [
      145438,
      'tu',
      '17549089-ETHBTC',
      433108764,
      1586127714,
      0.021082,
      0.02
    ],
    timestamp: 1586127714000,
    datetime: '2020-04-05T23:01:54.000Z',
    symbol: 'ETH/BTC',
    id: '433108764',
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'buy',
    price: 0.021082,
    amount: 0.02,
    cost: 0.00042164000000000004,
    fee: undefined
  }
]

 */