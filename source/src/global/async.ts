interface StatInfo {
	size: number;
	date: Date;
}

function waitAsync(timems: number) {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, timems);
	});
}

function _downloadFileAsync(method: string, url: string, headers?: any) {
	return new Promise<XMLHttpRequest>((resolve, reject) => {
		var request = new XMLHttpRequest();

		request.open(method, url, true);
		request.overrideMimeType("text/plain; charset=x-user-defined");
		if (headers) {
			for (var headerKey in headers) {
				request.setRequestHeader(headerKey, headers[headerKey]);
			}
		}
		request.responseType = "arraybuffer";
		request.onerror = function (e:any) { reject(e['error']); };
		request.onload = function (e) {
			if (request.status < 400) {
				resolve(request);
			} else {
				reject(new Error("HTTP " + request.status));
			}
		};
		request.send();
	});
}


function downloadFileAsync(url: string, headers?: any) {
	return _downloadFileAsync('GET', url, headers).then(request => {
		var arraybuffer: ArrayBuffer = request.response; // not responseText
		return arraybuffer;
	});
}

function downloadFileChunkAsync(url: string, from: number, count: number) {
	var to = (from + count) - 1;
	return downloadFileAsync(url, {
		'Range': 'bytes=' + from + '-' + to
	});
}

function statFileAsync(url: string) {
	return _downloadFileAsync('HEAD', url).then(request => {
		//console.error('content-type', request.getResponseHeader('content-type'));
		//console.log(request.getAllResponseHeaders());

		var size = parseInt(request.getResponseHeader('content-length'));
		var date = new Date(Date.parse(request.getResponseHeader('last-modified')));

		return { size: size, date: date };
	});
}

/*
function storePersistentKeyAsync(name:string, value:any) {
}
*/