var cache = require('./cache');

var cached = cache.resource({
    url: "http://echo.jsontest.com/key/value"
});

setTimeout(function(){
	console.log(cached.get());
	process.exit(0)
}, 500);