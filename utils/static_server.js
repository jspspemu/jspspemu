var WebSocketServer = require('websocket').server;

var http = require("http");
var url = require("url");
var path = require("path");
var fs = require("fs");
var mime = require("mime");
var watch = require("node-watch");
var dir = require("node-dir");
var wrench = require('wrench');
var _ = require('underscore');
var combine_common = require('./combine_common');

var jsFilesContent = {};

var jsBasePath = path.normalize(__dirname + '/../js');

function updateSingleJsFile() {
	var combinedContent = combine_common.generateCombinedCommonJs(jsFilesContent);
	fs.writeFileSync(__dirname + '/../jspspemu.js', combinedContent);
	console.log('Updated jspspemu.js');
}

function tryIncludeFile(filename) {
	if (!filename.match(/\.js$/)) return false;
	if (filename.substr(0, jsBasePath.length) != jsBasePath) return;
	var moduleName = filename.substr(jsBasePath.length).replace(/\\/g, '/').replace(/^\/+/, '');
	var newContent = fs.readFileSync(filename, 'utf-8');
	var oldContent = jsFilesContent[moduleName];
	if (newContent === oldContent) return false;
	jsFilesContent[moduleName] = newContent;
	return true;
}

wrench.readdirSyncRecursive(jsBasePath).forEach(function(filename) {
	filename = path.normalize(jsBasePath + '/' + filename);
	tryIncludeFile(filename);
});
updateSingleJsFile();
//console.log(wrench);

var port = process.argv[2] || 80;

watch(jsBasePath, { recursive: true, followSymLinks: true }, function(filename) {
	filename = path.normalize(filename);
	if (tryIncludeFile(filename)) {
		console.log(filename, ' changed.');
		updateSingleJsFile();
	}
});
 
var server = http.createServer(function(request, response) {
 
  var uri = url.parse(request.url).pathname
    , filename = path.join(__dirname + '/..', uri);
  
  fs.exists(filename, function(exists) {
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }
	
	try {
		var stat = fs.statSync(filename);
		if (stat.isDirectory()) {
			filename += '/index.html';
			stat = fs.statSync(filename);
		}
	} catch (e) {
		response.writeHead(404, { 'Content-Type': 'text/html' });
		response.end('Not found!');
		return;
	}

	//console.log(stat);

	var total = stat.size;

	var responseCode = 200;
	var responseHeaders = {
		"Content-Type": mime.lookup(filename),
		"Accept-Ranges": "bytes",
		"Content-Length": total,
	};
	var streamInfo = {bufferSize: 64 * 1024};
	if (request.headers.range) {
		var parts = request.headers.range.match(/^bytes=(\d+)-(\d+)$/);
		if (parts) {
			responseCode = 206;
			var start = parseInt(parts[1]);
			var end = parseInt(parts[2]);
			streamInfo.start = start;
			streamInfo.end = end;
			responseHeaders['Content-Range'] = 'bytes ' + start + '-' + end + '/' + total;
			responseHeaders['Content-Length'] = ((end - start) + 1);
		}
	}
	//console.log(request.range);
	
	try {
		var stream = fs.createReadStream(filename, streamInfo)
		response.writeHead(responseCode, responseHeaders);
		stream.pipe(response);
	} catch (e) {
		console.error(e);
		console.log(start + ' | ' + end + ' | ' + total);
		response.writeHead(400, { 'Content-Type': 'text/html' });
		response.end('Error: ' + e + ' | ' + start + ' | ' + end + ' | ' + total);
		return;
	}
	/*
    fs.readFile(filename, "binary", function(err, file) {
      if(err) {        
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }
 
      response.writeHead(200, {"Content-Type": mime.lookup(filename)});
	  
	  response.pipe();
      response.write(file, "binary");
      response.end();
    });
	*/
  });
});

server.on('error', function(e) {
	console.error(e);
});

server.listen(parseInt(port, 10), '0.0.0.0');

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
	console.log('Origin:' + origin);
	if (origin == 'http://127.0.0.1') return true;
	if (origin == 'http://jspspemu.com') return true;
	return true;
}

wsServer.on('error', function(e) {
	console.error(e);
});

var wsClientsMap = {};
var wsClientLastId = 0;

function num2mac(value) {
	value = value & 0x00FFFFFF;
	var parts = [];
	for (var n = 0; n < 4; n++) {
		parts.push((value >>> (n * 8)) & 0xFF);
	}
	return ('01:02:' + parts.map(function(part) { var out = part.toString(16); while (out.length < 2) out = '0' + out; return out; }).join(':')).toUpperCase();
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
		connection.sendUTF(JSON.stringify({ from : 'FF:FF:FF:FF:FF:FF', type: 'setid', payload : client.id }));

		console.log((new Date()) + ' Connection accepted.');
		connection.on('message', function(messageInfo) {
			try {
				var message = JSON.parse(messageInfo.utf8Data);
				console.log('message', client.id, ':', messageInfo.utf8Data);
				var to = message.to;
				
				if (to == '00:00:00:00:00:00') { // broadcast to everyone but me
					for (var id in wsClientsMap[partition]) { var other = wsClientsMap[partition][id];
						if (other != client) {
							other.connection.sendUTF(JSON.stringify({ from : client.id, type: message.type, payload : message.payload }));
						}
					}
				} else if (to == 'FF:FF:FF:FF:FF:FF') { // to server
				} else {
					var other = wsClientsMap[partition][to];
					if (!other) {
						console.error("Can't find client '" + to + "'");
					} else {
						other.connection.sendUTF(JSON.stringify({ from : client.id, type: message.type, payload : message.payload }));
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
 
console.log("Static file server running at\n  => http://0.0.0.0:" + port + "/\nCTRL + C to shutdown");
