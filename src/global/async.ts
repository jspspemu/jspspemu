import "./window"
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

export function _downloadFileAsync(method: string, url: string, headers?: any) {
	return new Promise<XMLHttpRequest>((resolve, reject) => {
        const request = new XMLHttpRequest();

        request.open(method, url, true);
		request.overrideMimeType("text/plain; charset=x-user-defined");
		if (headers) {
			for (const headerKey in headers) {
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
    const ab = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

const isNodeJs = (typeof XMLHttpRequest === 'undefined')

const fs: any = isNodeJs ? eval('require')('fs') : null;

export async function downloadFileAsync(url: string, headers?: any): Promise<ArrayBuffer> {
	if (isNodeJs) {
		return new Promise<ArrayBuffer>((resolve, reject) => {
			fs.readFile(url, (err:any, data:any) => {
			  if (err) {
				  reject(err);
			  } else {
				  resolve(toArrayBuffer(data));
			  }
			});
		});
	} else {
		const request = await _downloadFileAsync('GET', url, headers)
        return request.response;
	}
}

export function downloadFileChunkAsync(url: string, from: number, count?: number) {
    let rangeString: string

    if (count !== undefined) {
        const to = (from + count) - 1;
        rangeString = `bytes=${from}-${to}`
    } else {
        rangeString = `bytes=${from}-`
    }
    return downloadFileAsync(url, {
		'Range': rangeString
	});
}

export async function statFileAsync(url: string): Promise<{size: number, date: Date}> {
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
        const request = await _downloadFileAsync('HEAD', url)
        //console.error('content-type', request.getResponseHeader('content-type'));
        //console.log(request.getAllResponseHeaders());

        const size = parseInt(request.getResponseHeader('content-length') ?? '0');
        const date = new Date(Date.parse(request.getResponseHeader('last-modified') ?? ''));

        return {size: size, date: date};
    }
}

/*
export function storePersistentKeyAsync(name:string, value:any) {
}
*/