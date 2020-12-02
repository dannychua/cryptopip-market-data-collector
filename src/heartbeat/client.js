const io = require('socket.io-client');
const config = require('../config/config');

class HeartbeatClient {
    constructor(exchange) {
        this.exchange = exchange;
        this.socket = io(
            `http://${config.heartbeat.host}:${config.heartbeat.port}`, 
            {query: `serverId=${config.server.id}&serverTimestamp=${JSON.stringify(new Date())}&exchange=${this.exchange}`}
        );
    }

    ingestStarted(symbol, datatype) {
        this.socket.emit('ingest_started', {
            exchange: this.exchange,
            symbol: symbol, 
            datatype: datatype,
            serverTimestamp: new Date()
        });
    }

    ingestStopped(symbol, datatype, exception, msg) {
        this.socket.emit('ingest_stopped', {
            exchange: this.exchange,
            symbol: symbol, 
            datatype: datatype,
            exception: exception,
            msg: msg,
            serverTimestamp: new Date()
        });
    }
}

exports.HeartbeatClient = HeartbeatClient;