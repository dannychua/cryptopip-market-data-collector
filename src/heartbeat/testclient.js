const io = require('socket.io-client');
const os = require('os');
const config = require('../config/config');

const socket = io(
    `http://${config.heartbeat.host}:${config.heartbeat.port}`, 
    {query: `serverId=${config.server.id}&serverTimestamp=${JSON.stringify(new Date())}`}
);

socket.on('connect', () => {
    console.log('Connected!')
});

setTimeout(() => {
    console.log('ingest_started')
    socket.emit('ingest_started', {symbol: 'binance_btc_usdt', serverTimestamp: new Date()})
}, 2000)

setTimeout(() => {
    console.log('ingest_stopped')
    socket.emit('ingest_stopped', {
        symbol: 'binance_btc_usdt', 
        exception: 'ccxt.NetworkError', 
        msg: 'Some network error message',
        serverTimestamp: new Date()
    })
}, 8000)