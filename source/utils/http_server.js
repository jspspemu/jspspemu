#!/usr/local/bin/node
var http = require("http");
var url = require("url");
var path = require("path");
var fs = require("fs");
var mime = require("./mime");
var combine_common = require('./combine_common');
//var adhoc_server = require('./adhoc_server');
var adhoc_server = undefined;

function startServer() {
    combine_common.analyzeAndWatchFolder(combine_common.JS_BASE_PATH);
    combine_common.updateSingleJsFile();
    //console.log(wrench);

    /*
    watch(SOURCE_FOLDER, {recursive: true, followSymLinks: true}, function (filename) {
        console.log('updated file ' + filename + ', recompiling');
        compileProject(function() {

        });
    });
    */


    var port = process.argv[2] || 8080;

    var server = http.createServer(function (request, response) {
        var uri = url.parse(request.url).pathname;
        var filename = path.join(__dirname + '/../..', uri);

        fs.exists(filename, function (exists) {
            if (!exists) {
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
                response.writeHead(404, {'Content-Type': 'text/html'});
                response.end('Not found!');
                return;
            }

            //console.log(stat);

            var total = stat.size;

            var responseCode = 200;
            var responseHeaders = {
                "Content-Type": mime.lookup(filename),
                "Accept-Ranges": "bytes",
                "Content-Length": total
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
                response.writeHead(400, {'Content-Type': 'text/html'});
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

    server.on('error', function (e) {
        console.error(e);
    });

    server.listen(parseInt(port, 10), '0.0.0.0');

    if (adhoc_server) adhoc_server.connectToServer(server);

    console.log("Static file server running at\n  => http://0.0.0.0:" + port + "/\nCTRL + C to shutdown");
}

var serverStarted = false;
function startServerOnce() {
    if (!serverStarted) {
        serverStarted = true;
        setTimeout(startServer, 10);
    }
}


console.log('Running a first compile');
combine_common.compileProject(true, startServerOnce);
