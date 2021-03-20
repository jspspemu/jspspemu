import {Microtask, PromiseFast} from "./utils";

export interface StatInfo {
	size: number;
	date: Date;
}

export function waitAsync(timems: number) {
	return new PromiseFast((resolve, reject) => {
		setTimeout(resolve, timems);
	});
}

export function immediateAsync() {
	return new PromiseFast((resolve, reject) => {
		Microtask.queue(resolve);
	});
}

export function _downloadFileAsync(method: string, url: string, headers?: any) {
	return new PromiseFast<XMLHttpRequest>((resolve, reject) => {
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

export function toArrayBuffer(buffer:any) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

var fs: any = null

export function downloadFileAsync(url: string, headers?: any):PromiseFast<ArrayBuffer> {
	if (typeof XMLHttpRequest == 'undefined') {
		return new PromiseFast<ArrayBuffer>((resolve, reject) => {
		    if (fs === null) {
		        fs = eval('require')('fs')
            }
			fs.readFile(url, (err:any, data:any) => {
			  if (err) {
				  reject(err);
			  } else {
				  resolve(toArrayBuffer(data));
			  }
			});
		});
	} else {
		return _downloadFileAsync('GET', url, headers).then(request => {
			var arraybuffer: ArrayBuffer = request.response; // not responseText
			return arraybuffer;
		});
	}
}

export function downloadFileChunkAsync(url: string, from: number, count: number) {
	var to = (from + count) - 1;
	return downloadFileAsync(url, {
		'Range': 'bytes=' + from + '-' + to
	});
}

export function statFileAsync(url: string) {
	return _downloadFileAsync('HEAD', url).then(request => {
		//console.error('content-type', request.getResponseHeader('content-type'));
		//console.log(request.getAllResponseHeaders());

		var size = parseInt(request.getResponseHeader('content-length'));
		var date = new Date(Date.parse(request.getResponseHeader('last-modified')));

		return { size: size, date: date };
	});
}

/*
export function storePersistentKeyAsync(name:string, value:any) {
}
*/