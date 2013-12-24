"use strict";
var express = require('express'), https = require('https'), fs = require('fs');
var http = require('http');
var dns = require('native-dns');

var privateKey = fs.readFileSync('CA/mlb.key').toString();
var certificate = fs.readFileSync('CA/mlb.pem').toString();

var customEntries = [];
eval('customEntries ='+ fs.readFileSync('system.ini').toString());
var forwarder = '8.8.8.8';
var dnsPort = 53;

var options = {
	key : privateKey,
	cert : certificate
}

var server = dns.createServer();

server.on('request', function (request, response) {
        var domain = request.question[0].name;
        if(customEntries[domain]){
                //if custom entry exists, push it back...
                var entries = customEntries[domain];
                for(var i=0;i<entries.length;i++){
                        var entry = entries[i];
                        response.answer.push(dns.A(entry));
                }
                response.send();
        } else {
                var question = dns.Question({
                  name: domain,
                  type: 'A',
                });
                var req = dns.Request({
                  question: question,
                  server: { address: forwarder, port: dnsPort, type: 'udp' },
                  timeout: 1000,
                });
                
                req.on('message', function (err, answer) {
                        answer.answer.forEach(function (a) {
                            if (a.address != undefined) {
                                response.answer.push(dns.A({
                                name: domain,
                                address: a.address,
                                ttl: 600,
                                }))
                            }
                        });
                        response.send();
                });
                req.send();
        }
});

server.on('error', function (err, buff, req, res) {
  console.log(err.stack);
});

console.log('Your Server IP is '+customEntries['securea.mlb.com'][0].address);
console.log('Listening on '+dnsPort + '\nDNS Forwarder is ' + forwarder);
server.serve(dnsPort);

var app = express();

app.use(express.favicon());
app.use(express.compress());
app.use('/',express.static(__dirname + '/www'));

app.get('*', function(req, res, next) {
    res.send('404 ERROR');
});


https.createServer(options, app).listen(443, function() {
	console.log('https server started successfully.');
});

http.createServer(app).listen(80, function() {
	console.log('http server started successfully.');
});