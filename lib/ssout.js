var _ = require('lodash');
var querystring = require('querystring');
var HttpStatus = require('http-status-codes');

// example of predicate: req => req.header('Content-Type') === 'application/x-www-form-urlencoded'
// useful for applications who never use FORM POST, but do not have a login serviceUrl
module.exports = function(serviceUrl_or_predicate){
    if (!serviceUrl_or_predicate) throw new Error('no service url configured');
    var predicate = 
        _.isFunction(serviceUrl_or_predicate) ? serviceUrl_or_predicate :
        function (req) { return req.url === serviceUrl_or_predicate };

    return function(req,res,next){
        if (!req.sessionStore) throw new Error('no session store configured');

        req.ssoff = true;
        if (req.method !== 'POST' || !predicate(req)) {
            next();
            return;
        }
        var body = '';
        req.on('data', function(chunk){
            body += chunk;
        });
        req.on('end', function() {
            var logoutRequest = (querystring.parse(body) || {}).logoutRequest || '';
            if (!/<samlp:SessionIndex>(.*)<\/samlp:SessionIndex>/.exec(logoutRequest)) {
                next();
                return;
            }
            var st = RegExp.$1;

            req.sessionStore.get(st, function(err, result){
                if (result && result.sid) req.sessionStore.destroy(result.sid);
                req.sessionStore.destroy(st);
            });
            res.send(HttpStatus.NO_CONTENT);
        });
    }
};
