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
 
http.createServer(function(request, response) {
 
  var uri = url.parse(request.url).pathname
    , filename = path.join(__dirname + '/..', uri);
  
  fs.exists(filename, function(exists) {
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }
 
	if (fs.statSync(filename).isDirectory()) filename += '/index.html';
 
    fs.readFile(filename, "binary", function(err, file) {
      if(err) {        
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }
 
      response.writeHead(200, {"Content-Type": mime.lookup(filename)});
      response.write(file, "binary");
      response.end();
    });
  });
}).listen(parseInt(port, 10));
 
console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
