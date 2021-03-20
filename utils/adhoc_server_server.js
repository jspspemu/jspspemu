var adhoc_server = require('./adhoc_server');
var http = require("http");

var server = http.createServer(function(request, response) {
	response.writeHead(400, { 'Content-Type': 'text/html' });
	response.end('not serving');
});

server.on('error', function(e) {
	console.error(e);
});

server.listen(13100, '127.0.0.1');

adhoc_server.connectToServer(server);
