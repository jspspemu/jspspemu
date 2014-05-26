var http = require("http");

var WebSocketServer = require('websocket').server;

var debug = false;

module.exports.connectToServer = function(server) {
	wsServer = new WebSocketServer({
		httpServer: server,
		// You should not use autoAcceptConnections for production
		// applications, as it defeats all standard cross-origin protection
		// facilities built into the protocol and the browser.  You should
		// *always* verify the connection's origin and decide whether or not
		// to accept it.
		autoAcceptConnections: false
	});

	function originIsAllowed(origin) {
		origin = String(origin);
		//console.log('Origin:' + origin);
		if (origin == 'http://127.0.0.1') return true;
		if (origin == 'http://jspspemu.com') return true;
		return false;
	}

	wsServer.on('error', function(e) {
		console.error(e);
	});

	var wsClientsMap = {};
	var wsClientLastId = 0;

	function num2mac(value) {
		value = value & 0x00FFFFFF;
		var parts = [];
		parts.push(1);
		parts.push(value % 255);
		for (var n = 3; n >= 0; n--) {
			parts.push((value >>> (n * 8)) & 0xFF);
		}
		return (parts.map(function(part) { var out = part.toString(16); while (out.length < 2) out = '0' + out; return out; }).join(':')).toLowerCase();
	}

	//console.log(num2mac(0));
	//console.log(num2mac(1));
	//console.log(num2mac(-1));

	wsServer.on('request', function(request) {
		try {
			var partition = request.httpRequest.url;
		
			if (!originIsAllowed(request.origin)) {
			  // Make sure we only accept requests from an allowed origin
			  request.reject();
			  console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
			  return;
			}

			var connection = request.accept('adhoc', request.origin);
			
			if (!wsClientsMap[partition]) wsClientsMap[partition] = {};
			
			var client = { id : num2mac(wsClientLastId++), request: request, connection: connection };
			wsClientsMap[partition][client.id] = client;
			connection.sendUTF(JSON.stringify({ from : 'ff:ff:ff:ff:ff:ff', port : 0, type: 'setid', payload : client.id }));

			if (debug) console.log((new Date()) + ' Connection accepted.');
			connection.on('message', function(messageInfo) {
				try {
					var message = JSON.parse(messageInfo.utf8Data);
					if (debug) console.log('message', client.id, ':', messageInfo.utf8Data);
					var to = message.to;
					
					if (to == '00:00:00:00:00:00') { // broadcast to everyone but me
						for (var id in wsClientsMap[partition]) { var other = wsClientsMap[partition][id];
							if (other == client) continue;
							other.connection.sendUTF(JSON.stringify({ from : client.id, port : message.port, type: message.type, payload : message.payload }));
						}
					} else if (to == 'ff:ff:ff:ff:ff:ff') { // to server
					} else {
						var other = wsClientsMap[partition][to];
						if (!other) {
							console.error("Can't find client '" + to + "'");
						} else {
							other.connection.sendUTF(JSON.stringify({ from : client.id, port : message.port, type: message.type, payload : message.payload }));
						}
					}
					//console.log(data);
					//connection.sendUTF(JSON.stringify(data));
				} catch (e) {
					console.error(e);
				}
			});
			connection.on('error', function(e) {
				console.error(e);
			});
			connection.on('close', function(reasonCode, description) {
				console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
				delete wsClientsMap[partition][client.id];
			});
		} catch (e) {
			console.error(e);
		}
	});
};

var server = http.createServer(function(request, response) {
	response.writeHead(400, { 'Content-Type': 'text/html' });
	response.end('not serving');
});

server.on('error', function(e) {
	console.error(e);
});

server.listen(parseInt(port, 10), '0.0.0.0');

module.exports.connectToServer(server);
