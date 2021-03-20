import * as _vfs from './vfs';

import * as _vfs_memory from './vfs_memory';
import MemoryVfsEntry = _vfs_memory.MemoryVfsEntry;

import Vfs = _vfs.Vfs;
import VfsEntry = _vfs.VfsEntry;
import VfsStat = _vfs.VfsStat;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;
import {Promise2} from "../../global/utils";

export class MountableVfs extends Vfs {
	private mounts: MountableEntry[] = [];

	mountVfs(path: string, vfs: Vfs) {
		this.mounts.unshift(new MountableEntry(this.normalizePath(path), vfs, null));
	}

	mountFileData(path: string, data: ArrayBuffer) {
		this.mounts.unshift(new MountableEntry(this.normalizePath(path), null, new MemoryVfsEntry(path, data)));
	}

	private normalizePath(path: string) {
		return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
	}

	private transformPath(path: string) {
		path = this.normalizePath(path);

		for (var n = 0; n < this.mounts.length; n++) {
			var mount = this.mounts[n];
			//console.log(mount.path + ' -- ' + path);
			if (path.startsWith(mount.path)) {
				var part = path.substr(mount.path.length);
				return { mount: mount, part: part };
			}
		}
		console.info(this.mounts);
		throw (new Error("MountableVfs: Can't find file '" + path + "'"));
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise2<VfsEntry> {
		var info = this.transformPath(path);

		if (info.mount.file) {
			return Promise2.resolve(info.mount.file);
		} else {
			return info.mount.vfs.openAsync(info.part, flags, mode);
		}
	}

	openDirectoryAsync(path: string) {
		var info = this.transformPath(path);

		if (info.mount.file) {
			return Promise2.resolve(info.mount.file);
		} else {
			return info.mount.vfs.openDirectoryAsync(info.part);
		}
	}

	getStatAsync(path: string): Promise2<VfsStat> {
		var info = this.transformPath(path);

		if (info.mount.file) {
			return Promise2.resolve(info.mount.file.stat());
		} else {
			return info.mount.vfs.getStatAsync(info.part);
		}
	}
	
	deleteAsync(path: string): Promise2<void> {
		var info = this.transformPath(path);
		return info.mount.vfs.deleteAsync(info.part);
	}
}

class MountableEntry {
	constructor(public path: string, public vfs: Vfs, public file: VfsEntry) {
	}
}

//window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
//window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
//window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

//export class IndexedDbVfs extends Vfs {
//	initAsync() {
//		var request = indexedDB.open("mydatabase");
//
//		request.onsuccess = (e) => {
//			var db = <IDBDatabase>request.result;
//			
//			var trans = db.transaction(["objectstore1", "objectstore2", READ_WRITE);
//			trans.objectStore("objectstore1").put(myblob, "somekey");
//			trans.objectStore("objectstore2").put(myblob, "otherkey");
//		};
//		request.onerror = (e) => {
//		};
//	}
//}
