var cache = require('./cache');
var assert = require('assert');

var update = 60 * 60 * 1000//1000 = 1s * 60 = 1min * 60 = 1hour

var transformation = function handle (responseBody) {
	return responseBody;
}

var cached = cache.resource({
    url: "http://google.pl/",
    encoding: 'utf8'
}, transformation, update);

assert(cached.get() == '', 'should NOT have something - assuming nothing in redis');

setTimeout(function(){
	assert(cached.get(), 'should have something after a sesond or so.');

	console.log('IF there are no assert errors, then should work fine');
	process.exit(0);
}, 1000)
