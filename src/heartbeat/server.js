const server = require('http').createServer();
const io = require('socket.io')(server);
const { saveHeartbeatEventToDb } = require('../lib/db');
const config = require('../config/config');

class HeartbeatServer {
    constructor() {
        this.connections = {};
        this._initSocketioServer();
    }

    _initSocketioServer() {
        const self = this;
        try {
            server.listen(config.heartbeat.port, () => {
                console.log(`Heartbeats server started on port ${config.heartbeat.port}`);
                io.on('connection', function(socket) {
                    let serverId = socket.request._query.serverId;
                    let serverTimestamp = socket.request._query.serverTimestamp;
                    let exchange = socket.request._query.exchange;
                    self._logConnected({serverId, serverTimestamp, exchange});

                    // Add event listeners
                    socket.on('disconnect', (data) => { self._logDisconnected({serverId}) });
                    socket.on('ingest_started', (data) => { self._logIngestStarted({...data, serverId}) });
                    socket.on('ingest_stopped', (data) => { self._logIngestStopped({...data, serverId}) });
                })
            });
        } catch (e) {
            console.log('Error creating Socket.io server:', e)
        }
    }

    _logIngestStarted(data) {
        const payload = {
            event: 'ingest_started',
            exchange: data.exchange,
            symbol: data.symbol,
            datatype: data.datatype,
            timestamp: new Date(),
            serverTimestamp: data.serverTimestamp,
            serverId: data.serverId,
        }
        saveHeartbeatEventToDb(payload);
        console.log('ingest started', payload)
    }

    _logIngestStopped(data) {
        const payload = {
            event: 'ingest_stopped',
            exchange: data.exchange,
            symbol: data.symbol,
            datatype: data.datatype,
            exception: data.exception,
            msg: data.msg,
            timestamp: new Date(),
            serverTimestamp: data.serverTimestamp,
            serverId: data.serverId,
        }
        saveHeartbeatEventToDb(payload);
        console.log('ingest stopped', payload)
    }
    
    _logConnected(data) {
        const payload = {
            event: 'connected',
            exchange: data.exchange,
            timestamp: new Date(),
            serverTimestamp: data.serverTimestamp,
            serverId: data.serverId,
        }
        saveHeartbeatEventToDb(payload);
        console.log('connected', payload)
    }
    
    _logDisconnected(data) {
        const payload = {
            event: 'disconnected',
            timestamp: new Date(),
            serverId: data.serverId,
        }
        saveHeartbeatEventToDb(payload);
        console.log('disconnected', payload)
    }
}

const heartbeatServer = new HeartbeatServer();
