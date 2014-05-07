var request = require('request');

var redis = require('./redis');
var client = redis.createRedisClient(process.env.REDISTOGO_URL);

var cacheStore = {

}

var defaultTimeToLive = 40 * 1000; // 40sec

//when application starts get contents of cache from redis
client.hgetall("cache", function (err, obj) {
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

exports.resource = function(requestOptions, handler, timeToLive){
    timeToLive = timeToLive || defaultTimeToLive;
    handler = handler || parseJson;
    var keyPart = requestOptions.url ? requestOptions.url : requestOptions;
    var key = JSON.stringify(keyPart);

    function updateCachedEntry(){
        request.get(requestOptions, function (err, response, responseBody) {
            if (!err && response.statusCode == 200) {
                try{
                    // cache the body of the response
                    cacheStore[key].cached = {
                        responseBody: responseBody,
                        expires: now() + timeToLive
                    };
                    if(client.connected){
                        client.hmset("cache", key, JSON.stringify(cacheStore[key].cached));
                    }
                }catch(e){
                    console.error("Can't update CACHE: ", key, " due to", e);
                }
            } else {
                console.error('error: cache ', JSON.stringify(requestOptions), err);
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