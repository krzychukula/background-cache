var request = require('request');

var redis = require('./redis');
var client = redis.createRedisClient(process.env.REDISTOGO_URL);

var cacheStore = {

}

var redisHashName = "responseCache";
var defaultTimeToLive = 40 * 1000; // 40sec

//when application starts get contents of cache from redis
client.hgetall(redisHashName, function (err, obj) {
    if(err){
        console.log('empty redis cache');
        return;
    }

   for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            // prop is not inherited
            console.log('loading key from redis');
            cacheStore[key] = {
                cached: JSON.parse(obj[key])
            }
        }
   }
});

function now() {
    return (new Date()).getTime();
}

function parseJson(data){
    return JSON.parse(data);
}

function resolveRequest(request) {
    if (typeof request == 'function') {
        return request();
    } else {
        return request;
    }
}

exports.resource = function(requestOptions, handler, timeToLive){
    timeToLive = timeToLive || defaultTimeToLive;
    handler = handler || parseJson;

    var requestData = resolveRequest(requestOptions);
    var keyPart = requestData.url ? requestData.url : requestData;
    var key = JSON.stringify(keyPart);

    function updateCachedEntry(){
        // resolve request here on each update to ensure that if a
        // generator function was passed the request is regenerated each time
        var req = resolveRequest(requestOptions);
        request.get(req, function (err, response, responseBody) {
            if (!err && response.statusCode == 200) {
                try{
                    // cache the body of the response
                    cacheStore[key].cached = {
                        responseBody: responseBody,
                        expires: now() + timeToLive
                    };
                    if(client.connected){
                        client.hmset(redisHashName, key, JSON.stringify(cacheStore[key].cached));
                    }
                }catch(e){
                    console.error("Can't update CACHE: ", key, " due to", e);
                }
            } else {
                console.error('error: cache ', JSON.stringify(req), err);
            }
        });
    }

    var existing = cacheStore[key];
    if(existing && existing.promised){
        return existing.promised;
    }else if(existing){
        //just go and set update function but do not reset cacheStore[key]
    } else {
        cacheStore[key] = {};
        updateCachedEntry(); // implicit update to get the first cached value
    }

    cacheStore[key].promised = {
        get: function(){
            var entry = cacheStore[key];
            if (entry.cached) {
                var timeToRefresh = now() >= entry.cached.expires;
                if (timeToRefresh) {
                    updateCachedEntry();
                }

                return handler(entry.cached.responseBody);
            } else {
                return '';
            }
        }
    };

    return cacheStore[key].promised;

};