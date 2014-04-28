background-cache
================

cache request and update them periodically in background

* Pass URL to monitor
* (will try to use radis to load previous value)
* run `cache.get()` to get current result of your function
* will update using your timeout
* will run your handler or JSON.parse
* will store result in redis

Default:
========
* JSON.parse
* 40s

see demo.js and test.js for examples
====================================
```
var cached = cache.resource({
    url: "http://echo.jsontest.com/key/value"
});

setTimeout(function(){
	console.log(cached.get());
}, 500);
```