import {PromiseFast, StringDictionary} from "../../global/utils";
import {FileMode, FileOpenFlags, Vfs, VfsEntry, VfsStat} from "./vfs";

declare const Dropbox: any;

export interface Info {
	contentHash: any;
	hasThumbnail: boolean;
	humanSize: string;
	inAppFolder: boolean;
	isFile: boolean;
	isFolder: boolean;
	isRemoved: boolean;
	mimeType: string;
	clientModifiedAt: Date;
	modifiedAt: Date;
	name: string;
	path: string;
	size: number;
	typeIcon: string;
	versionTag: string;
}

export class AsyncClient {
	client: any;

	constructor(private key:string) {
	}

	private initPromise: PromiseFast<any> | null = null;

	initOnceAsync() {
		if (!this.initPromise) {
			this.client = new Dropbox.Client({ key: this.key });

			if (this.client.isAuthenticated()) {
				//DropboxLogged();
				// Client is authenticated. Display UI.
                const dropboxhtml = document.getElementById('dropbox');
				if (dropboxhtml) dropboxhtml.innerHTML = 'logged';
			}

			this.client.authDriver(new Dropbox.AuthDriver.Redirect({
				redirectUrl: (document.location.host == '127.0.0.1') ? 'http://127.0.0.1/oauth_receive.html' : "https://" + document.location.host + '/oauth_receive.html'
			}));

			this.initPromise = new PromiseFast((resolve, reject) => {
				this.client.authenticate({ interactive: true }, (e:Error) => {
					if (e) {
						this.initPromise = null;
						reject(e);
					} else {
						resolve();
					}
				});
			});
		}
		return this.initPromise;
	}

	writeFileAsync(fullpath: string, content: ArrayBuffer) {
        const directory = getDirectoryPath(fullpath);
        const basename = getBaseName(fullpath);
		if (this.statCacheValue[basename]) {
			this.statCacheValue[basename].size = content.byteLength;
		}
		if (this.readdirCacheValue[directory]) {
			const entriesInDirectory = this.readdirCacheValue[directory];
			if (!entriesInDirectory.contains(basename)) {
				entriesInDirectory.push(basename);
			}
		}

		return this.initOnceAsync().then(() => {
			return new PromiseFast((resolve, reject) => {
				this.client.writeFile(fullpath, content, (e:Error, data:any) => {
					if (e) {
						reject(e);
					} else {
						resolve(data);
					}
				});
			});
		});
	}

	mkdirAsync(path: string) {
		return this.initOnceAsync().then(() => {
			return new PromiseFast((resolve, reject) => {
				this.client.mkdir(path, (e:Error, data:any) => {
					if (e) {
						reject(e);
					} else {
						resolve(data);
					}
				});
			});
		});
	}

	readFileAsync(name: string, offset: number = 0, length: number | undefined = undefined):PromiseFast<ArrayBuffer> {
		return this.initOnceAsync().then(() => {
			return new PromiseFast<any>((resolve, reject) => {
				this.client.readFile(name, { arrayBuffer: true, start: offset, length: length }, (e:Error, data:any) => {
					if (e) {
						reject(e);
					} else {
						resolve(data);
					}
				});
			});
		});
	}

	statCacheValue: StringDictionary<Info> = {};
	statCachePromise: StringDictionary<PromiseFast<Info>> = {};
	statAsync(fullpath: string): PromiseFast<Info> {
		return this.initOnceAsync().then(() => {
			if (!this.statCachePromise[fullpath]) {
				this.statCachePromise[fullpath] = this.readdirAsync(getDirectoryPath(fullpath)).then((files) => {
                    const basename = getBaseName(fullpath);
					if (!files.contains(basename)) throw(new Error("folder not contains file"));
					return new PromiseFast<any>((resolve, reject) => {
						this.client.stat(fullpath, {}, (e:Error, data:any) => {
							if (e) {
								reject(e);
							} else {
								this.statCacheValue[fullpath] = data;
								resolve(data);
							}
						});
					});
				});
				return this.statCachePromise[fullpath];
			}
		});
	}

	readdirCacheValue: StringDictionary<string[]> = {};
	readdirCachePromise: StringDictionary<PromiseFast<string[]>> = {};
	readdirAsync(name: string): PromiseFast<string[]> {
		return this.initOnceAsync().then(() => {
			if (!this.readdirCachePromise[name]) {
				this.readdirCachePromise[name] = new PromiseFast<any>((resolve, reject) => {
					this.client.readdir(name, {}, (e:Error, data:any) => {
						if (e) {
							reject(e);
						} else {
							this.readdirCacheValue[name] = data;
							resolve(data);
						}
					});
				});
			}
			return this.readdirCachePromise[name];
		});
	}
}

function getDirectoryPath(fullpath: string) {
	return fullpath.split('/').slice(0, -1).join('/');
}

function getBaseName(fullpath: string): string {
	return fullpath.split('/').pop()!
}

function normalizePath(fullpath: string) {
    const out:string[] = [];
    const parts:string[] = fullpath.replace(/\\/g, '/').split('/');
	parts.forEach(part => {
		switch (part) {
			case '.': break;
			case '..': out.pop(); break;
			default: out.push(part);
		}
	});
	return out.join('/');
}

const client = new AsyncClient('4mdwp62ogo4tna1');

/*
client.mkdirAsync('PSP').then(() => {
	console.log('resilt');
}).catch(e => {
	console.error(e);
});
*/
//client.mkdirAsync('PSP/GAME');
//client.mkdirAsync('PSP/GAME/virtual');

/*
client.writeFileAsync('/PSP/GAME/virtual/lsdlmidi.bin', new Uint8Array([1, 2, 3, 4]).buffer).then((result) => {
	console.log(result);
}).catch((error) => {
	console.error(error);
});
*/

export class DropboxVfs extends Vfs {
	enabled = true;

	constructor() {
		super();
	}

	static tryLoginAsync() {
		return client.initOnceAsync();
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): PromiseFast<VfsEntry> {
		path = normalizePath(path);
		if (!this.enabled) return PromiseFast.reject(new Error("Not using dropbox"));
		return DropboxVfsEntry.fromPathAsync(path, flags, mode);
	}
}

export class DropboxVfsEntry extends VfsEntry {
	constructor(private path: string, private name: string, private _size: number, private isFile: boolean, private date:Date) {
		super();
	}

	static fromPathAsync(path: string, flags: FileOpenFlags, mode: FileMode): PromiseFast<DropboxVfsEntry> {
		function readedErrorAsync(e: Error) {
			if (flags & FileOpenFlags.Create) {
				//console.log('creating file!');
                const entry = new DropboxVfsEntry(path, path.split('/').pop(), 0, true, new Date());
				return client.writeFileAsync(path, new ArrayBuffer(0)).then(() => {
					//console.log('created file!');
					return entry;
				}).catch((e) => {
					console.error(e);
					throw(e);
				});
			} else {
				throw (e);
			}
		}

		return client.statAsync(path)
			.then((info):any => {
				if (info.isRemoved) {
					return readedErrorAsync(new Error("file not exists"));
				} else {
					//console.log(info);
					return new DropboxVfsEntry(path, info.name, info.size, info.isFile, info.modifiedAt);
				}
			})
			.catch(e => {
				return readedErrorAsync(e);
			})
		;
	}

	enumerateAsync(): PromiseFast<VfsStat[]> {
		throw (new Error("Must implement DropboxVfsEntry.enumerateAsync"));
	}

	private cachedContent: ArrayBuffer;
	private writeTimer = -1;

	readChunkAsync(offset: number, length: number): PromiseFast<ArrayBuffer> {
		//console.log('dropbox: read chunk!', this.path, offset, length);

		if (this._size < 128 * 1024 * 1024) {
			if (this.cachedContent) return PromiseFast.resolve(this.cachedContent.slice(offset, offset + length));
			return client.readFileAsync(this.path).then(data => {
				this.cachedContent = data;
				return this.cachedContent.slice(offset, offset + length);
			});
		} else {
			//console.log('read dropbox file ' + this.path);
			return client.readFileAsync(this.path, offset, offset + length);
		}
	}

	writeChunkAsync(offset: number, dataToWrite: ArrayBuffer): PromiseFast<number> {
		return this.readChunkAsync(0, this._size).then(base => {
			//console.log('dropbox: write chunk!', this.path, offset, dataToWrite.byteLength);
            const newContent = new ArrayBuffer(Math.max(base.byteLength, offset + dataToWrite.byteLength));
            const newContentArray = new Uint8Array(newContent);
			newContentArray.set(new Uint8Array(base), 0);
			newContentArray.set(new Uint8Array(dataToWrite), offset);
			this._size = newContent.byteLength;
			this.cachedContent = newContent;
			//return client.writeFileAsync(this.path, newContent).then(() => data.byteLength);
			//console.log(newContentArray);
			clearTimeout(this.writeTimer);
			this.writeTimer = setTimeout(() => {
				client.writeFileAsync(this.path, newContent);
			}, 500) as any;
			return dataToWrite.byteLength;
		})
	}

	stat(): VfsStat {
		return {
			name: this.name,
			size: this._size,
			isDirectory: !this.isFile,
			timeCreation: this.date,
			timeLastAccess: this.date,
			timeLastModification: this.date,
			dependentData0: 0,
			dependentData1: 1,
		};
	}
	close() {
	}
}

/*
const dvfs = new DropboxVfs();

dvfs.openAsync('/test', FileOpenFlags.Create | FileOpenFlags.Write | FileOpenFlags.Truncate, <FileMode>parseIntFormat('0777')).then(value => {
	console.info('dvfs result:', value);
}).catch(e => {
		console.error('dvfs error:', e);
});
*/

/*
client.readdirAsync('/PSP/GAME/virtual/SAVE/SharewareDoom').then(result => {
	console.log(result);
});
*/