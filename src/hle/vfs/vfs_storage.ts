import _vfs = require('./vfs');

import _vfs_memory = require('./vfs_memory');
import MemoryVfsEntry = _vfs_memory.MemoryVfsEntry;

import Vfs = _vfs.Vfs;
import VfsEntry = _vfs.VfsEntry;
import VfsStat = _vfs.VfsStat;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;

//declare var indexedDB: any;
declare var IDBKeyRange: IDBKeyRange;

function indexedDbOpenAsync(name:string, version: number, stores: string[]) {
	return new Promise<IDBDatabase>((resolve, reject) => {
		var request = indexedDB.open(name, version);
		request.onupgradeneeded = function (e) {
			var db = request.result;

			// A versionchange transaction is started automatically.
			//request.transaction.onerror = html5rocks.indexedDB.onerror;
			console.log('upgrade!');

			stores.forEach(store => {
				if (db.objectStoreNames.contains(store)) db.deleteObjectStore(store);
				db.createObjectStore(store, { keyPath: "name" });
			});
		};
		request.onerror = (event) => {
			reject(new Error("Can't open indexedDB"));
		};
		request.onsuccess = (event) => {
			resolve(request.result);
		};
	});
}

function indexedDbPutAsync(store: IDBObjectStore, value: any) {
	return new Promise((resolve, reject) => {
		var request = store.put(value);
		request.onsuccess = function (e) {
			resolve();
		};
		request.onerror = function (e) {
			reject(e['value']);
		};
	});
}

function indexedDbDeleteAsync(store: IDBObjectStore, key: string) {
	return new Promise((resolve, reject) => {
		var request = store.delete(key);

		request.onsuccess = function (e) {
			resolve();
		};

		request.onerror = function (e) {
			reject(e['value']);
		};
	});
}

function indexedDbGetRangeAsync(store: IDBObjectStore, keyRange: IDBKeyRange, iterator: (item) => void) {
	return new Promise((resolve, reject) => {
		//console.log('rr');
		//var keyRange = IDBKeyRange.only(key);
		//var keyRange = IDBKeyRange.lowerBound(0);

		try {
			var cursorRequest = store.openCursor(keyRange);
		} catch (e) {
			console.error(e);
			reject(e);
		}

		//console.log('mm', cursorRequest);

		cursorRequest.onsuccess = (e) => {
			var cursor = <IDBCursorWithValue>cursorRequest.result;
			if (!!cursor == false) {
				resolve();
				return;
			} else {
				var result2 = iterator(cursor.value);
				cursor.continue();
			}
		};

		cursorRequest.onerror = (e) => {
			//console.log('dd');
			reject(e['value']);
		};
	});
}

function indexedDbGetOneAsync(store: IDBObjectStore, keyRange: IDBKeyRange) {
	return new Promise((resolve, reject) => {
		indexedDbGetRangeAsync(store, keyRange, (item) => {
			resolve(item);
		}).then(() => {
			resolve(null);
		}).catch(e => {
			reject(e);
		});
	});
}

export class StorageVfs extends Vfs {
	private db: IDBDatabase;
	private openDbPromise: Promise<StorageVfs>;


	constructor(private key: string) {
		super();
	}

	initializeOnceAsync() {
		if (!this.openDbPromise) {
			this.openDbPromise = indexedDbOpenAsync(this.key, 3, ['files']).then(db => {
				this.db = db;
				return this;
			});
		}
		return this.openDbPromise;
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
		return this.initializeOnceAsync().then(() => {
			return StorageVfsEntry.fromNameAsync(this.db, path, flags, mode);
		});
	}
}

interface File {
	name: string;
	content: Uint8Array;
	date: Date;
	exists?: boolean;
}

class StorageVfsEntry extends VfsEntry {
	private file: File;

	constructor(private db: IDBDatabase, private name: string) {
		super();
	}

	private initAsync(flags: FileOpenFlags, mode: FileMode) {
		return this._getFileAsync().then(file => {
			if (!file.exists) {
				if (!(flags & FileOpenFlags.Create)) {
					throw (new Error("File '" + file.name + "' doesn't exist"));
				}
			}
			if (flags & FileOpenFlags.Truncate) {
				file.content = new Uint8Array([]);
			}
			this.file = file;
			return this;
		});
	}

	static fromNameAsync(db: IDBDatabase, name: string, flags: FileOpenFlags, mode: FileMode) {
		return (new StorageVfsEntry(db, name)).initAsync(flags, mode);
	}

	private _getFileAsync(): Promise<File> {
		var store = this.db.transaction(["files"], "readwrite").objectStore('files');
		return indexedDbGetOneAsync(store, IDBKeyRange.only(this.name)).then(file => {
			if (file == null) file = { name: this.name, content: new ArrayBuffer(0), date: new Date(), exists: false };
			return file;
		});
	}

	private _getAllAsync() {
		return this._getFileAsync().then(item => item.content);
	}

	private _writeAllAsync(data:ArrayBuffer) {
		var store = this.db.transaction(["files"], "readwrite").objectStore('files');
		return indexedDbPutAsync(store, {
			'name': this.name,
			'content': new Uint8Array(data),
			'date': new Date(),
			'exists': true,
		});
	}

	enumerateAsync(): Promise<VfsStat[]> {
		throw (new Error("Must override enumerateAsync : " + this));
	}

	readChunkAsync(offset: number, length: number): Promise<ArrayBuffer> {
		//console.log(this.file);
		return Promise.resolve(this.file.content.buffer.slice(offset, offset + length));
	}

	writeChunkAsync(offset: number, data: ArrayBuffer): Promise<number> {
		var newContent = new ArrayBuffer(Math.max(this.file.content.byteLength, offset + data.byteLength));
		var newContentArray = new Uint8Array(newContent);
		newContentArray.set(new Uint8Array(this.file.content), 0);
		newContentArray.set(new Uint8Array(data), offset);
		this.file.content = newContentArray;
		return this._writeAllAsync(newContent).then(() => data.byteLength);
	}

	stat(): VfsStat {
		return {
			name: this.file.name,
			size: this.file.content.byteLength,
			isDirectory: false,
			timeCreation: this.file.date,
			timeLastAccess: this.file.date,
			timeLastModification: this.file.date,
			dependentData0: 0,
			dependentData1: 0,
		};
	}
	close() {
	}
}