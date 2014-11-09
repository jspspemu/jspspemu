function waitAsync(timems) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, timems);
    });
}
function _downloadFileAsync(method, url, headers) {
    return new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest();
        request.open(method, url, true);
        request.overrideMimeType("text/plain; charset=x-user-defined");
        if (headers) {
            for (var headerKey in headers) {
                request.setRequestHeader(headerKey, headers[headerKey]);
            }
        }
        request.responseType = "arraybuffer";
        request.onerror = function (e) {
            reject(e['error']);
        };
        request.onload = function (e) {
            if (request.status < 400) {
                resolve(request);
            }
            else {
                reject(new Error("HTTP " + request.status));
            }
        };
        request.send();
    });
}
function downloadFileAsync(url, headers) {
    return _downloadFileAsync('GET', url, headers).then(function (request) {
        var arraybuffer = request.response; // not responseText
        return arraybuffer;
    });
}
function downloadFileChunkAsync(url, from, count) {
    var to = (from + count) - 1;
    return downloadFileAsync(url, {
        'Range': 'bytes=' + from + '-' + to
    });
}
function statFileAsync(url) {
    return _downloadFileAsync('HEAD', url).then(function (request) {
        //console.error('content-type', request.getResponseHeader('content-type'));
        //console.log(request.getAllResponseHeaders());
        var size = parseInt(request.getResponseHeader('content-length'));
        var date = new Date(Date.parse(request.getResponseHeader('last-modified')));
        return { size: size, date: date };
    });
}
//# sourceMappingURL=async.js.map