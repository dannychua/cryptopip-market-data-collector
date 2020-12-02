let config = {};

const SERVERID = 1;

// Server
config.server = {};
config.server.id = SERVERID;

// Heartbeat
config.heartbeat = {};
config.heartbeat.host = 'localhost';
config.heartbeat.port = 3001;

module.exports = config;