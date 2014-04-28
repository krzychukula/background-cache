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
                parsed: JSON.parse(obj[key])
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
    var key = JSON.stringify(keyPart)+handler+time;

    var existing = cacheStore[key]
    if(existing && existing.promised){
        return existing.promised;
    }else if(existing && !existing.promise){
        //just go and set update function but do not reset cacheStore[key]
    } else {
        cacheStore[key] = {
            parsed: ''
        };
    }


    function update(){
        request.get(requestOptions, function (err, response, responseBody) {
            if (!err && response.statusCode == 200) {
                try{
                    var parsed = handler(responseBody);
                    cacheStore[key].parsed = parsed;
                    if(client.connected){
                        client.hmset("cache", key, JSON.stringify(cacheStore[key].parsed));
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
            return cacheStore[key].parsed;
        }
    }

    return cacheStore[key].promised;

}