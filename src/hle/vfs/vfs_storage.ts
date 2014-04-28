import _vfs = require('./vfs');

import _vfs_memory = require('./vfs_memory');
import MemoryVfsEntry = _vfs_memory.MemoryVfsEntry;

import Vfs = _vfs.Vfs;
import VfsEntry = _vfs.VfsEntry;
import VfsStat = _vfs.VfsStat;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;

export class StorageVfs extends Vfs {
	constructor(private db: IDBDatabase) {
		super();
	}

	fromKeyAsync(key: string) {
		return new Promise((resolve, reject) => {
			var db: IDBDatabase;
			var request = indexedDB.open(key, 1);
			request.onerror = function (event) {
				reject(new Error("Can't open indexedDB"));
			};
			request.onsuccess = function (event) {
				db = request.result;
				resolve(new StorageVfs(db));
			};
		});
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
		//var objectStore = this.db.createObjectStore('files');
		//objectStore.put({ name: });
		//objectStore.get(
		//return null;
		throw (new Error("Not implemented StorageVfs!"));
	}
}