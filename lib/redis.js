/**
   Ext JS Connect
   Copyright(c) 2011 selead
   MIT Licensed
 */

/**
   Module dependencies.
 */

var sys = require('sys'),
json = require('json'),
Store = require('./store'),
redis = require('./redis-client');

/**
   Initialize RedisSessionStore with given `opts`.

   @param {Object} opts Options.
   @api public
 */
var RedisSessionStore = module.exports = function RedisSessionStore(opts) {
    opts = opts || {};
    Store.call(this, opts);

    // sessions
    this.prefix = opts.prefix || 'redis-store-';
    this.redis = redis.createClient(opts.port || redis.DEFAULT_PORT,
                                    opts.host || redis.DEFAULT_HOST);

    // set default reapInterval to 10 minutes
    this.reapInterval = opts.reapInterval || 600000;

    // interval for reaping stale sessions
    if (this.reapInterval !== -1) {
        setInterval(function (self) {
            self.reap(self.maxAge);
        }, this.reapInterval, this);
    }
};

sys.inherits(RedisSessionStore, Store);

/**
   Reap sessions older than `ms` milliseconds.

   @param {Number} ms Milliseconds threshold.
   @api private
 */
RedisSessionStore.prototype.reap = function (ms) {
    var threshold = + new Date() - ms;
    var self = this; // store 'this' object

    this.redis.sendCommand('keys', this.prefix + '*', function (err, keys) {
        for (k in keys) {
            var sid = keys[k].toString();
            // try to remove keys one by one if lastAccess < threshold
            self.redis.sendCommand('get', sid, function (err, val) {
                if (err === null) {
                    val = json.parse(val);
                    if (val.lastAccess < threshold) {
                        self.redis.sendCommand('del', sid);
                    }
                }
            });
        }
    });
};

/**
   Attemp to fetch sessin by the given `sid`.

   @param {String} sid Session ID.
   @param {Function} fn Function, that called after get.
   @api public
 */
RedisSessionStore.prototype.get = function(sid, fn) {
    fn = fn || function () {};
    this.redis.sendCommand('get', this.prefix + sid,
                           function (err, val) {
                               if (val === 'nil') { fn(); }
                               else { fn(null, json.parse(val)); }});
};

/**
   Commit the given `sess` object associated with the given `sid`.

   @param {String} sid Session ID.
   @param {Session} sess Session values.
   @param {Function} fn Function, that called after set.
   @api public
 */
RedisSessionStore.prototype.set = function (sid, sess, fn) {
    console.log('set [' + sid + '] = ' + json.stringify(sess));
    fn = fn || function () {};
    this.redis.sendCommand('set', this.prefix + sid, json.stringify(sess), fn);
};

/**
   Destroy the session associated with the given `sid`.

   @param {String} sid Session ID.
   @param {Function} fn Function, that called after value delete.
   @api public
 */
RedisSessionStore.prototype.destroy = function (sid, fn) {
    fn = fn || function () {};
    this.redis.sendCommand('del', this.prefix + sid, fn);
};

/**
   Invoke the given callback `fn` with all active sessions.
   Method wasn't tested!

   @param {Function} fn Function that applyed to all active sessions.
   @api public
 */
RedisSessionStore.prototype.all = function (fn) {
    fn = fn || function () {};
    this.redis.sendCommand('keys', this.prefix + '*', fn);
};

/**
   Clear all sessions.

   @param {Function} fn Function, that calls after removing all sessions.
   @api public
 */
RedisSessionStore.prototype.clear = function (fn) {
    fn = fn || function () {};
    var self = this;
    this.redis.sendCommand('keys', this.prefix + '*', function (err, keys) {
        var arr = ['del'];
        for (k in keys) {
            arr.push(keys[k].toString());
        }
        self.redis.sendCommand.apply(self.redis, arr, fn);
    });
};

/**
   Fetch number of sessions.

   @param {Function} fn Function, that accepts number of sessions.
   @api public
 */
RedisSessionStore.prototype.length = function (fn) {
    fn = fn || function () {};
    console.log('get length');
    this.redis.sendCommand('keys', this.prefix + '*', function (err, keys) {
        if (keys !== 'nil') {
            fn(null, keys.length);
        } else {
            fn();
        }
    });
};
