const ccxt = require('ccxt');
const { exec } = require('child_process')
const moment = require('moment');



/**
 * Generates an object containing markets grouped by quote and exchange.
 * @param exchanges A list of exchange class names used in ccxt/ccxws
 * @returns Object with nested keys, i.e. marketUniverse[exchange][quote] = [...]
 */
exports.getSortedMarkets = async function (exchanges) {

    let universe = {};        // marketUniverse[exchange][quote] = [...]

    for (const exchangeName of exchanges) {
        const exchangeCcxt = new ccxt[exchangeName];
        const markets = await exchangeCcxt.loadMarkets();
        let sortedMarkets = {};
        for (const market in markets) {
            sortedMarkets[markets[market].quote] = sortedMarkets[markets[market].quote] || [];
            sortedMarkets[markets[market].quote].push(markets[market].base);
        }
        universe[exchangeName] = sortedMarkets;
    };

    return universe;

}

/**
 * Query the exchange API to get an array of symbols
 * @param {str} exchangeName CCXT name of exchange
 * @param {bool} Skips the CCXT cache, force query the exchange API 
 * @returns {array}
 */
exports.getExchangeSymbols = async (exchangeName, reload=false) => {
    const client = new ccxt[exchangeName];
    const markets = await client.loadMarkets(reload=true);
    return Object.keys(markets);
}

exports.parseTuple = function(t) {
    try {
        return JSON.parse(t.replace(/\(/g, "[").replace(/\)/g, "]"));
    } catch(e) {
        return 0;
    }
}

exports.convertExchangeNameCcxt2Ccxws = function (exchangeName) {
    switch(exchangeName) {
        // case 'coinex':      return 'coinex3';
        default:            return exchangeName;
    }
}

/**
 * Convert id property in ccxt 'market' instance to be compatible with use in ccxws
 * @param exchangeName ccxws name of exchange
 * @param market ccxt market object containing properties 'base' and 'quote
 * @return Exchange specific ID string of market
 */
exports.getExchangeSpecificMarket = function (exchangeName, market) {
    let id;
    switch(exchangeName) {
        case 'coinbasepro':  
            id = `${market.base}-${market.quote}`.toUpperCase();
            break;
        default:
            id = market.id;
    }

    market.id = id;
    return market;
}

/**
 * Generate the table name for a market on an exchange
 * @param {str} exchange 
 * @param {str} market 
 * @param {str} type ['prefix', 'ticks', 'orderbook', 'ohlcv']
 * @returns {str}
 */
exports.generateTableName = (exchange, market, type='prefix') => {
    market = market.replace('/', '_');
    if (type == 'prefix') {
        return `${exchange}_${market}`.toLowerCase()
    } else {
        return `${exchange}_${market}_${type}`.toLowerCase()
    }
    
}

exports.sleep = async function (duration) {
    await new Promise(r => setTimeout(r, duration));
}

 /**
  * Converts a Date object to a String
  * @param {*} date Date object.
  */
exports.dateToString = (date) => {
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
}

 /**
  * Converts a Date object to a String in UTC
  * @param {*} date Date object.
  * @param {*} tz Boolean. Displays the 'UTC' timezone abbreviation
  * @param {*} ms Boolean. Displays the fractional seconds
  */
exports.dateToStringUtc = (date, tz=true, ms=false) => {
    if (date === null) {
        return null
    }

    if (date instanceof Date == false) {
        throw new Error(`'date' argument must be an instance of Javascript Date. Given: ${date}`);
    }

    let format = 'YYYY-MM-DD HH:mm:ss'
    if (ms) {
        format += '.SSS'
    }
    if (tz) {
        format += ' z'
    }
    return moment(date).utc().format(format);    
}


/**
 * Generate an array of dates with a specific increment
 * @param {*} startDate 
 * @param {*} endDate 
 * @param {*} incrementUnit [... | 'days' | 'hours' | 'minutes' | 'seconds']
 */
exports.enumerateBetweenDates = (startDate, endDate, incrementUnit='minutes') => {
    let dates = []
    while(moment(startDate) <= moment(endDate)){
      dates.push(startDate);
      startDate = moment(startDate).add(1, incrementUnit).format("YYYY-MM-DD HH:mm:ss");
    }
    return dates;
  }

/**
 * Promise version of exec
 */
exports.execPromise = (cmd) => {
    return new Promise(function(resolve, reject) {
        exec(cmd, function(err, stdout) {
            if (err) return reject(err);
            resolve(stdout);
        });
    });
}


/**
 * Prints an ASCII art logo
 * Generated using http://patorjk.com/software/taag/
 */
exports.printLogo = function (name) {
    switch (name) {
        case 'cryptopip':
            // Font Name: ANSI Shadow
            console.log(`
            ██████╗██████╗ ██╗   ██╗██████╗ ████████╗ ██████╗ ██████╗ ██╗██████╗ 
            ██╔════╝██╔══██╗╚██╗ ██╔╝██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗██║██╔══██╗
            ██║     ██████╔╝ ╚████╔╝ ██████╔╝   ██║   ██║   ██║██████╔╝██║██████╔╝
            ██║     ██╔══██╗  ╚██╔╝  ██╔═══╝    ██║   ██║   ██║██╔═══╝ ██║██╔═══╝ 
            ╚██████╗██║  ██║   ██║   ██║        ██║   ╚██████╔╝██║     ██║██║     
             ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝        ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝     
                                                                            `);
            break;

        case 'ingestor':
            // Font Name: Bloody
            console.log(`
            ██▓ ███▄    █   ▄████ ▓█████   ██████ ▄▄▄█████▓▓█████  ██▀███             
            ▓██▒ ██ ▀█   █  ██▒ ▀█▒▓█   ▀ ▒██    ▒ ▓  ██▒ ▓▒▓█   ▀ ▓██ ▒ ██▒           
            ▒██▒▓██  ▀█ ██▒▒██░▄▄▄░▒███   ░ ▓██▄   ▒ ▓██░ ▒░▒███   ▓██ ░▄█ ▒           
            ░██░▓██▒  ▐▌██▒░▓█  ██▓▒▓█  ▄   ▒   ██▒░ ▓██▓ ░ ▒▓█  ▄ ▒██▀▀█▄             
            ░██░▒██░   ▓██░░▒▓███▀▒░▒████▒▒██████▒▒  ▒██▒ ░ ░▒████▒░██▓ ▒██▒           
            ░▓  ░ ▒░   ▒ ▒  ░▒   ▒ ░░ ▒░ ░▒ ▒▓▒ ▒ ░  ▒ ░░   ░░ ▒░ ░░ ▒▓ ░▒▓░           
             ▒ ░░ ░░   ░ ▒░  ░   ░  ░ ░  ░░ ░▒  ░ ░    ░     ░ ░  ░  ░▒ ░ ▒░           
             ▒ ░   ░   ░ ░ ░ ░   ░    ░   ░  ░  ░    ░         ░     ░░   ░            
             ░           ░       ░    ░  ░      ░              ░  ░   ░                
                                                                                       `);
            break;
    }
}