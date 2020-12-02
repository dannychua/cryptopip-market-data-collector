/**
 * Explore the different ccxtpro trades object returned by various exchanges
 */

const ccxtpro = require('ccxt.pro');
const _ = require('lodash');

const exchanges = [
    'binance', 
    'binanceje',
    // 'binanceus',     // slow to get response due to low volume
    'bitfinex',
    'bitmex',
    'bitstamp',
    'bittrex',
    'coinbaseprime',
    'coinbasepro',
    'ftx',
    'gateio',
    'huobipro',
    'huobiru',
    'kraken',
    'kucoin',
    'okcoin',
    'okex',
    'poloniex',
    'upbit'
];

console.log(`Exchanges: \t${exchanges.length}`);
console.log(exchanges);

(async () => {
    for (const exchangeId of exchanges) {
        const exchange = new ccxtpro[exchangeId]({
            enableRateLimit: true,
            options: {
                tradesLimit: 1
            }
        });;
        await exchange.loadMarkets();

        let symbol;
        let pairs = [
            {base: 'ETH', quote: 'BTC'},
            {base: 'BTC', quote: 'USD'},
            {base: 'BTC', quote: 'USDT'},
            {base: 'BTC', quote: 'TUSD'},
            {base: 'BTC', quote: 'EUR'},
        ];
        for (const p of pairs) {
            const matches = _.filter(exchange.markets, {base: p.base, quote: p.quote});
            if (matches.length > 0) {
                symbol = matches[0].symbol;
                break;
            }
        }
        console.log('\n\n', exchangeId, symbol)
        
        const trades = await exchange.watchTrades(symbol);
        console.log(exchangeId, symbol, trades)
    }

    process.exit(0);
})();



/**

OUTPUT:

Exchanges: 	18
[
  'binance',       'binanceje',
  'bitfinex',      'bitmex',
  'bitstamp',      'bittrex',
  'coinbaseprime', 'coinbasepro',
  'ftx',           'gateio',
  'huobipro',      'huobiru',
  'kraken',        'kucoin',
  'okcoin',        'okex',
  'poloniex',      'upbit'
]


 binance ETH/BTC
binance ETH/BTC [
  {
    info: {
      e: 'trade',
      E: 1586122458303,
      s: 'ETHBTC',
      t: 171260575,
      p: '0.02108300',
      q: '0.15000000',
      b: 674224864,
      a: 674224878,
      T: 1586122458301,
      m: true,
      M: true
    },
    timestamp: 1586122458301,
    datetime: '2020-04-05T21:34:18.301Z',
    symbol: 'ETH/BTC',
    id: '171260575',
    order: undefined,
    type: undefined,
    takerOrMaker: 'maker',
    side: 'sell',
    price: 0.021083,
    amount: 0.15,
    cost: 0.0031624500000000002,
    fee: undefined
  }
]


 binanceje BTC/EUR
binanceje BTC/EUR [
  {
    info: {
      e: 'trade',
      E: 1586122488782,
      s: 'BTCEUR',
      t: 148181,
      p: '6254.86',
      q: '0.03930000',
      b: 26207459,
      a: 26207451,
      T: 1586122488781,
      m: false,
      M: true
    },
    timestamp: 1586122488781,
    datetime: '2020-04-05T21:34:48.781Z',
    symbol: 'BTC/EUR',
    id: '148181',
    order: undefined,
    type: undefined,
    takerOrMaker: 'taker',
    side: 'buy',
    price: 6254.86,
    amount: 0.0393,
    cost: 245.815998,
    fee: undefined
  }
]


 bitfinex ETH/BTC
bitfinex ETH/BTC [
  {
    info: [ null, 1586122369, 0.021098, 0.46 ],
    timestamp: 1586122369000,
    datetime: '2020-04-05T21:32:49.000Z',
    symbol: 'ETH/BTC',
    id: undefined,
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'buy',
    price: 0.021098,
    amount: 0.46,
    cost: 0.00970508,
    fee: undefined
  }
]


 bitmex .BETHXBT
bitmex .BETHXBT [
  {
    info: {
      timestamp: '2020-04-05T21:34:00.000Z',
      symbol: '.BETHXBT',
      side: 'Buy',
      size: 0,
      price: 0.02109,
      tickDirection: 'ZeroPlusTick',
      trdMatchID: '00000000-0000-0000-0000-000000000000',
      grossValue: null,
      homeNotional: null,
      foreignNotional: null
    },
    timestamp: 1586122440000,
    datetime: '2020-04-05T21:34:00.000Z',
    symbol: '.BETHXBT',
    id: '00000000-0000-0000-0000-000000000000',
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'buy',
    price: 0.02109,
    cost: undefined,
    amount: 0,
    fee: undefined
  }
]


 bitstamp ETH/BTC
bitstamp ETH/BTC [
  {
    info: {
      buy_order_id: 1217689887727616,
      amount_str: '0.07112600',
      timestamp: '1586122544',
      microtimestamp: '1586122544903000',
      id: 110047267,
      amount: 0.071126,
      sell_order_id: 1217689885835264,
      price_str: '0.02110815',
      type: 0,
      price: 0.02110815
    },
    timestamp: 1586122544903,
    datetime: '2020-04-05T21:35:44.903Z',
    symbol: 'ETH/BTC',
    id: '110047267',
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'buy',
    price: 0.02110815,
    amount: 0.071126,
    cost: 0.0015013382768999997,
    fee: undefined
  }
]


 bittrex ETH/BTC
bittrex ETH/BTC [
  {
    info: {
      FI: 59170248,
      OT: 'BUY',
      R: 0.02108443,
      Q: 0.13524039,
      T: 1586122563310
    },
    timestamp: 1586122563310,
    datetime: '2020-04-05T21:36:03.310Z',
    symbol: 'ETH/BTC',
    id: '59170248',
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'buy',
    price: 0.02108443,
    amount: 0.13524039,
    cost: 0.0028514665361277,
    fee: undefined
  }
]


 coinbaseprime ETH/BTC
coinbaseprime ETH/BTC [
  {
    id: '9262357',
    order: undefined,
    info: {
      type: 'match',
      trade_id: 9262357,
      maker_order_id: '5d9d5e7c-c9ef-4980-8a85-4b48cd0ef35b',
      taker_order_id: 'fbafe7c8-25d0-48a4-8c4d-21dad620c46c',
      side: 'sell',
      size: '0.0175',
      price: '0.02109',
      product_id: 'ETH-BTC',
      sequence: 2032815435,
      time: '2020-04-05T21:36:55.816856Z'
    },
    timestamp: 1586122615816,
    datetime: '2020-04-05T21:36:55.816Z',
    symbol: 'ETH/BTC',
    type: undefined,
    takerOrMaker: undefined,
    side: 'buy',
    price: 0.02109,
    amount: 0.0175,
    fee: { cost: undefined, currency: 'BTC', rate: undefined },
    cost: 0.00036907500000000007
  }
]


 coinbasepro ETH/BTC
coinbasepro ETH/BTC [
  {
    id: '9262359',
    order: undefined,
    info: {
      type: 'match',
      trade_id: 9262359,
      maker_order_id: '07825145-5fab-4cf4-a03e-8acabebf7aea',
      taker_order_id: '76b90f92-6635-42ca-b3aa-4c0e916719ec',
      side: 'buy',
      size: '3.76143954',
      price: '0.02108',
      product_id: 'ETH-BTC',
      sequence: 2032815525,
      time: '2020-04-05T21:37:25.493795Z'
    },
    timestamp: 1586122645493,
    datetime: '2020-04-05T21:37:25.493Z',
    symbol: 'ETH/BTC',
    type: undefined,
    takerOrMaker: undefined,
    side: 'sell',
    price: 0.02108,
    amount: 3.76143954,
    fee: { cost: undefined, currency: 'BTC', rate: undefined },
    cost: 0.0792911455032
  }
]


 ftx BTC-PERP
ftx BTC-PERP [
  {
    info: {
      id: 34160899,
      price: 6765,
      size: 0.0015,
      side: 'buy',
      liquidation: false,
      time: '2020-04-05T21:37:39.448017+00:00'
    },
    timestamp: 1586122659448,
    datetime: '2020-04-05T21:37:39.448Z',
    symbol: 'BTC-PERP',
    id: '34160899',
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'buy',
    price: 6765,
    amount: 0.0015,
    cost: 10.1475,
    fee: undefined
  }
]


 gateio ETH/BTC
gateio ETH/BTC [
  {
    id: '242077742',
    info: {
      id: 242077742,
      time: 1586122019.284867,
      price: '0.021096',
      amount: '0.023',
      type: 'sell'
    },
    timestamp: 1586122019284,
    datetime: '2020-04-05T21:26:59.284Z',
    symbol: 'ETH/BTC',
    order: undefined,
    type: undefined,
    side: 'sell',
    takerOrMaker: undefined,
    price: 0.021096,
    amount: 0.023,
    cost: 0.000485208,
    fee: undefined
  }
]


 huobipro ETH/BTC
huobipro ETH/BTC [
  {
    id: '1.0219141128079014e+22',
    info: {
      id: 1.0219141128079014e+22,
      ts: 1586122624211,
      tradeId: 100969774628,
      amount: 1.2887,
      price: 0.021086,
      direction: 'buy'
    },
    order: undefined,
    timestamp: 1586122624211,
    datetime: '2020-04-05T21:37:04.211Z',
    symbol: 'ETH/BTC',
    type: undefined,
    side: 'buy',
    takerOrMaker: undefined,
    price: 0.021086,
    amount: 1.2887,
    cost: 0.0271735282,
    fee: undefined
  }
]


 huobiru ETH/BTC
huobiru ETH/BTC [
  {
    id: '1.0219141128079014e+22',
    info: {
      id: 1.0219141128079014e+22,
      ts: 1586122624211,
      tradeId: 100969774628,
      amount: 1.2887,
      price: 0.021086,
      direction: 'buy'
    },
    order: undefined,
    timestamp: 1586122624211,
    datetime: '2020-04-05T21:37:04.211Z',
    symbol: 'ETH/BTC',
    type: undefined,
    side: 'buy',
    takerOrMaker: undefined,
    price: 0.021086,
    amount: 1.2887,
    cost: 0.0271735282,
    fee: undefined
  }
]


 kraken ETH/BTC
kraken ETH/BTC [
  {
    id: undefined,
    order: undefined,
    info: [ '0.021100', '0.08865474', '1586122895.648995', 'b', 'm', '' ],
    timestamp: 1586122895648,
    datetime: '2020-04-05T21:41:35.648Z',
    symbol: 'ETH/BTC',
    type: 'market',
    side: 'buy',
    takerOrMaker: undefined,
    price: 0.0211,
    amount: 0.08865474,
    cost: 0.001870615014,
    fee: undefined
  }
]


 kucoin ETH/BTC
kucoin ETH/BTC [
  {
    info: {
      sequence: '1583215023359',
      symbol: 'ETH-BTC',
      side: 'sell',
      size: '0.2350478',
      price: '0.021082',
      takerOrderId: '5e8a5092c757a30009475619',
      time: '1586122898914367623',
      type: 'match',
      makerOrderId: '5e8a5092cd266700090b6f51',
      tradeId: '5e8a5092eefabd30641182ab'
    },
    id: '5e8a5092eefabd30641182ab',
    order: undefined,
    timestamp: 1586122898914,
    datetime: '2020-04-05T21:41:38.914Z',
    symbol: 'ETH/BTC',
    type: 'match',
    takerOrMaker: undefined,
    side: 'sell',
    price: 0.021082,
    amount: 0.2350478,
    cost: 0.0049552777196,
    fee: undefined
  }
]


 okcoin BTC/USD
okcoin BTC/USD [
  {
    info: {
      side: 'buy',
      trade_id: '1237505',
      price: '6771.12',
      size: '0.018',
      instrument_id: 'BTC-USD',
      timestamp: '2020-04-05T21:41:38.872Z'
    },
    timestamp: 1586122898872,
    datetime: '2020-04-05T21:41:38.872Z',
    symbol: 'BTC/USD',
    id: '1237505',
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'buy',
    price: 6771.12,
    amount: 0.018,
    cost: 121.88015999999999,
    fee: undefined
  }
]


 okex ETH/BTC
okex ETH/BTC [
  {
    info: {
      side: 'sell',
      trade_id: '3622847',
      price: '0.02108',
      size: '0.047414',
      instrument_id: 'ETH-BTC',
      timestamp: '2020-04-05T21:41:03.380Z'
    },
    timestamp: 1586122863380,
    datetime: '2020-04-05T21:41:03.380Z',
    symbol: 'ETH/BTC',
    id: '3622847',
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'sell',
    price: 0.02108,
    amount: 0.047414,
    cost: 0.00099948712,
    fee: undefined
  }
]


 poloniex ETH/BTC
poloniex ETH/BTC [
  {
    info: [ 't', '49864754', 0, '0.02107470', '0.00060736', 1586123039 ],
    timestamp: 1586123039000,
    datetime: '2020-04-05T21:43:59.000Z',
    symbol: 'ETH/BTC',
    id: '49864754',
    order: undefined,
    type: undefined,
    takerOrMaker: undefined,
    side: 'sell',
    price: 0.0210747,
    amount: 0.00060736,
    cost: 0.000012799929792,
    fee: undefined
  }
]


 upbit ETH/BTC
upbit ETH/BTC [
  {
    id: '15861049420000000',
    info: {
      type: 'trade',
      code: 'BTC-ETH',
      timestamp: 1586104942702,
      trade_date: '2020-04-05',
      trade_time: '16:42:22',
      trade_timestamp: 1586104942000,
      trade_price: 0.02080617,
      trade_volume: 7.71586655,
      ask_bid: 'BID',
      prev_closing_price: 0.02080089,
      change: 'RISE',
      change_price: 0.00000528,
      sequential_id: 15861049420000000,
      stream_type: 'SNAPSHOT'
    },
    order: undefined,
    timestamp: 1586104942702,
    datetime: '2020-04-05T16:42:22.702Z',
    symbol: 'ETH/BTC',
    type: 'limit',
    side: 'buy',
    takerOrMaker: undefined,
    price: 0.02080617,
    amount: 7.71586655,
    cost: 0.16053763113661348,
    fee: undefined
  }
]


*/