var request = require('request');

var redis = require('./redis');
var client = redis.createRedisClient(process.env.REDISTOGO_URL);

var cacheStore = {

}

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
                responseBody: JSON.parse(obj[key])
            }
        }
   }
});

function parseJson(data){
    return JSON.parse(data);
}

exports.resource = function(requestOptions, handler, time){
    time = time || (1000 * 40);//1000 = 1s
    handler = handler || parseJson;
    var keyPart = requestOptions.url ? requestOptions.url : requestOptions;
    var key = JSON.stringify(keyPart);

    var existing = cacheStore[key];
    if(existing && existing.promised){
        return existing.promised;
    }else if(existing){
        //just go and set update function but do not reset cacheStore[key]
    } else {
        cacheStore[key] = {
            responseBody: ''
        };
    }

    function update(){
        request.get(requestOptions, function (err, response, responseBody) {
            if (!err && response.statusCode == 200) {
                try{
                    // cache the body of the response
                    cacheStore[key].responseBody = responseBody;
                    if(client.connected){
                        client.hmset("cache", key, JSON.stringify(cacheStore[key].responseBody));
                    }
                }catch(e){
                    console.error("Can't update CACHE: ", key, " due to", e);
                }
            } else {
                console.error('error: cache ', JSON.stringify(requestOptions), err);
            }
        });
        setTimeout(update, time);
    }

    process.nextTick(update);

    cacheStore[key].promised = {
        get: function(){
            if (cacheStore[key].responseBody) {
                return handler(cacheStore[key].responseBody);
            } else {
                return '';
            }
        }
    }

    return cacheStore[key].promised;

}