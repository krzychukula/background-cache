"use strict";
var redis = require('redis');
var url = require("url");

exports.createRedisClient = createRedisClient;
exports.redis = redis;

function createRedisClient(redisUrl) {
    if(!redisUrl) {
        var client = withErrorHandling(redis.createClient());
        return client;
    }

    var parsedUrl = url.parse(redisUrl);
    var client = withErrorHandling(redis.createClient(parsedUrl.port, parsedUrl.hostname));

    client.on('error', function(err) {
        console.log(err);
    });

    if(parsedUrl.auth && parsedUrl.auth.indexOf(":") != -1){
        client.auth(parsedUrl.auth.split(":")[1]);
    }

    return client;
}

function withErrorHandling(client) {
    client.on('error', function() {
        console.log(arguments);
    });

    return client;
}