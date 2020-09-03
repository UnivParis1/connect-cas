var express = require('express');
var session = require('express-session');
var querystring = require('querystring');
var request = require('request');
var cas = require('../');
var http = require('http');

var validLogoutRequest = { 
    logoutRequest: `
      <samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="12345" Version="2.0" IssueInstant="[CURRENT DATE/TIME]">
         <saml:NameID>@NOT_USED@</saml:NameID>
         <samlp:SessionIndex>12345</samlp:SessionIndex>
      </samlp:LogoutRequest>`,
};

describe('#ssout on specific url', function(){
    var server;
    before(function(done){
        server = serverSetup('/cas/logout', done); 
    });
    after(function(done){
        server.close(done);
    });
    it('logs the user out when CAS sends POST', function(done){
        request.post({uri: 'http://localhost:3000/cas/logout', form: validLogoutRequest }, function(err, res, body){
            res.statusCode.should.equal(204);
            done();
        });
    });
    it('continues to next() when different endpoint', function(done){
        request.post({uri: 'http://localhost:3000/cas/blah', form: validLogoutRequest }, function(err, res, body){
            res.statusCode.should.equal(307);
            done();
        });
    });
    it('continues to next() when different method', function(done){
        request.put({uri: 'http://localhost:3000/cas/blah', form: validLogoutRequest }, function(err, res, body){
            res.statusCode.should.equal(307);
            done();
        });
    });
    it('continues to next() when unexpected body response', function(done){
        request.put({uri: 'http://localhost:3000/cas/blah', body: 'hello'}, function(err, res, body){
            res.statusCode.should.equal(307);
            done();
        });
    });
});

describe('#ssout on condition', function(){
    var server;
    before(function(done){
        server = serverSetup(function (req) { 
            return req.header('Content-Type') === 'application/x-www-form-urlencoded';
        }, done); 
    });
    after(function(done){
        server.close(done);
    });
    it('logs the user out when CAS sends POST', function(done){
        request.post({uri: 'http://localhost:3000/cas/logout', form: validLogoutRequest }, function(err, res, body){
            res.statusCode.should.equal(204);
            done();
        });
    });
    it('continues to next() when unexpected content-type response', function(done){
        request.put({uri: 'http://localhost:3000/cas/blah', body: 'hello'}, function(err, res, body){
            res.statusCode.should.equal(307);
            done();
        });
    });
});

var serverSetup = function(serviceUrl_or_predicate, done){
    var app = express()
    .use(session({
        secret: 'ninja cat',
    }))
    .use(function(req, res, next){
        lastRequest = req;
        next();
    })
    .use(cas.ssout(serviceUrl_or_predicate))
    .use(cas.authenticate())
    .use(function(req, res, next){
        res.end('hello world');
    });
    var server = http.createServer(app).listen(3000, done);
    server.setTimeout(20);
    return server;
};
