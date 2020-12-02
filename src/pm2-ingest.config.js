const time = true;

module.exports = {
  apps : [
    {
      "name": "heartbeat-server",
      "script": "./heartbeat/server.js",
      "error_file": "../logs/heartbeat-server-error.log",
      "out_file": "../logs/heartbeat-server-out.log",
      "time": time
    },
    {
      "name": "ingester-binance",
      "script": "./ingest/ingest.js",
      "args": "-e binance",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-binance-error.log",
      "out_file": "../logs/ingester-binance-out.log",
      "time": time
    },
    {
      "name": "ingester-binanceje",
      "script": "./ingest/ingest.js",
      "args": "-e binanceje",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-binanceje-error.log",
      "out_file": "../logs/ingester-binanceje-out.log",
      "time": time
    },
    {
      "name": "ingester-binanceus",
      "script": "./ingest/ingest.js",
      "args": "-e binanceus",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-binanceus-error.log",
      "out_file": "../logs/ingester-binanceus-out.log",
      "time": time
    },
    {
      "name": "ingester-bitfinex",
      "script": "./ingest/ingest.js",
      "args": "-e bitfinex",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-bitfinex-error.log",
      "out_file": "../logs/ingester-bitfinex-out.log",
      "time": time
    },
    {
      "name": "ingester-bitvavo",
      "script": "./ingest/ingest.js",
      "args": "-e bitvavo",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-bitvavo-error.log",
      "out_file": "../logs/ingester-bitvavo-out.log",
      "time": time
    },
    {
      "name": "ingester-bitstamp",
      "script": "./ingest/ingest.js",
      "args": "-e bitstamp",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-bitstamp-error.log",
      "out_file": "../logs/ingester-bitstamp-out.log",
      "time": time
    },
    {
      "name": "ingester-bittrex",
      "script": "./ingest/ingest.js",
      "args": "-e bittrex",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-bittrex-error.log",
      "out_file": "../logs/ingester-bittrex-out.log",
      "time": time
    },
    {
      "name": "ingester-coinbaseprime",
      "script": "./ingest/ingest.js",
      "args": "-e coinbaseprime",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-coinbaseprime-error.log",
      "out_file": "../logs/ingester-coinbaseprime-out.log",
      "time": time
    },
    {
      "name": "ingester-coinbasepro",
      "script": "./ingest/ingest.js",
      "args": "-e coinbasepro",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-coinbasepro-error.log",
      "out_file": "../logs/ingester-coinbasepro-out.log",
      "time": time
    },
    {
      "name": "ingester-ftx",
      "script": "./ingest/ingest.js",
      "args": "-e ftx",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-ftx-error.log",
      "out_file": "../logs/ingester-ftx-out.log",
      "time": time
    },
    {
      "name": "ingester-gateio",
      "script": "./ingest/ingest.js",
      "args": "-e gateio",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-gateio-error.log",
      "out_file": "../logs/ingester-gateio-out.log",
      "time": time
    },
    {
      "name": "ingester-hitbtc",
      "script": "./ingest/ingest.js",
      "args": "-e hitbtc",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-hitbtc-error.log",
      "out_file": "../logs/ingester-hitbtc-out.log",
      "time": time
    },
    {
      "name": "ingester-huobipro",
      "script": "./ingest/ingest.js",
      "args": "-e huobipro",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-huobipro-error.log",
      "out_file": "../logs/ingester-huobipro-out.log",
      "time": time
    },
    {
      "name": "ingester-huobiru",
      "script": "./ingest/ingest.js",
      "args": "-e huobiru",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-huobiru-error.log",
      "out_file": "../logs/ingester-huobiru-out.log",
      "time": time
    },
    {
      "name": "ingester-kraken",
      "script": "./ingest/ingest.js",
      "args": "-e kraken",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-kraken-error.log",
      "out_file": "../logs/ingester-kraken-out.log",
      "time": time
    },
    {
      "name": "ingester-kucoin",
      "script": "./ingest/ingest.js",
      "args": "-e kucoin",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-kucoin-error.log",
      "out_file": "../logs/ingester-kucoin-out.log",
      "time": time
    },
    {
      "name": "ingester-okcoin",
      "script": "./ingest/ingest.js",
      "args": "-e okcoin",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-okcoin-error.log",
      "out_file": "../logs/ingester-okcoin-out.log",
      "time": time
    },
    {
      "name": "ingester-okex",
      "script": "./ingest/ingest.js",
      "args": "-e okex",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-okex-error.log",
      "out_file": "../logs/ingester-okex-out.log",
      "time": time
    },
    {
      "name": "ingester-poloniex",
      "script": "./ingest/ingest.js",
      "args": "-e poloniex",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-poloniex-error.log",
      "out_file": "../logs/ingester-poloniex-out.log",
      "time": time
    },
    {
      "name": "ingester-upbit",
      "script": "./ingest/ingest.js",
      "args": "-e upbit",
      "node_args": "--max_old_space_size=3072",
      "error_file": "../logs/ingester-upbit-error.log",
      "out_file": "../logs/ingester-upbit-out.log",
      "time": time
    }
  ],

  // deploy : {
  //   production : {
  //     user : 'SSH_USERNAME',
  //     host : 'SSH_HOSTMACHINE',
  //     ref  : 'origin/master',
  //     repo : 'GIT_REPOSITORY',
  //     path : 'DESTINATION_PATH',
  //     'pre-deploy-local': '',
  //     'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
  //     'pre-setup': ''
  //   }
  // }
};
