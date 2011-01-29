Redis-based session store.
==========================
Plugin for connect apps.

Usage:
var connect = require('connect'),
    RedisSessionStore = require('redis-session-store');

var store = new RedisSessionStore( {reapInterval: 600000, maxAge: 600000 * 3} );
var server = connect.createServer(
    connect.logger(),
    connect.bodyDecoder(),
    connect.cookieDecoder(),
    connect.session( { store: store, secret: 'forty two' }),
    ....
);

server.listen(8080);

Version 0.0.1