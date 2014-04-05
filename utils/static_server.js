var http = require("http");
var url = require("url");
var path = require("path");
var fs = require("fs");
var mime = require("mime");
var watch = require("node-watch");
var dir = require("node-dir");
var wrench = require('wrench');
var _ = require('underscore');

var jsFilesContent = {};

function updateSingleJsFile() {
	var combinedContent = '';
	_.keys(jsFilesContent).slice(0).sort().forEach(function(filename) {
		var content = jsFilesContent[filename];
		combinedContent += content;
	});
	fs.writeFileSync(__dirname + '/../pspemu.js', combinedContent);
	console.log('Updated pspemu.js');
}

wrench.readdirSyncRecursive(__dirname + '/../src_js').forEach(function(filename) {
	filename = path.normalize(__dirname + '/../src_js/' + filename);
	if (filename.match(/\.js$/)) {
		jsFilesContent[filename] = fs.readFileSync(filename);
		//console.log(filename);
	}
});
updateSingleJsFile();
//console.log(wrench);

var port = process.argv[2] || 80;

watch(__dirname + '/../src_js', { recursive: true, followSymLinks: true }, function(filename) {
	filename = path.normalize(filename);
	if (filename.match(/\.js$/)) {
		jsFilesContent[filename] = fs.readFileSync(filename);
		console.log(filename, ' changed.');
		updateSingleJsFile();
	}
});
 
http.createServer(function(request, response) {
 
  var uri = url.parse(request.url).pathname
    , filename = path.join(__dirname + '/..', uri);
  
  path.exists(filename, function(exists) {
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
