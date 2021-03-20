﻿import {Microtask, PromiseFast} from "./utils";

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

const isNodeJs = (typeof XMLHttpRequest === 'undefined')

var fs: any = isNodeJs ? eval('require')('fs') : null

export function downloadFileAsync(url: string, headers?: any):PromiseFast<ArrayBuffer> {
	if (isNodeJs) {
		return new PromiseFast<ArrayBuffer>((resolve, reject) => {
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

export function statFileAsync(url: string): PromiseFast<{size: number, date: Date}> {
    if (isNodeJs) {
        return new PromiseFast((resolve, reject) => {
            fs.stat(url, (err: any, stats: any) => {
                if (err) {
                    reject(new Error(`File not found: '${url}'`))
                } else if (stats.isDirectory()) {
                    reject(new Error(`File is a directory: '${url}'`))
                } else {
                    resolve({size: stats.size, date: stats.mtime})
                }
            });
        })
    } else {
        return _downloadFileAsync('HEAD', url).then(request => {
            //console.error('content-type', request.getResponseHeader('content-type'));
            //console.log(request.getAllResponseHeaders());

            const size = parseInt(request.getResponseHeader('content-length'));
            const date = new Date(Date.parse(request.getResponseHeader('last-modified')));

            return {size: size, date: date};
        });
    }
}

/*
export function storePersistentKeyAsync(name:string, value:any) {
}
*/