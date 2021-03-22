import {PromiseFast} from "../../global/utils";
import {FileMode, FileOpenFlags, Vfs, VfsEntry, VfsStat} from "./vfs";
import {MemoryVfsEntry} from "./vfs_memory";

export class MountableVfs extends Vfs {
	private mounts: MountableEntry[] = [];

	mountVfs(path: string, vfs: Vfs) {
		this.mounts.unshift(new MountableEntry(this.normalizePath(path), vfs, null as any));
		return this
	}

	mountFileData(path: string, data: ArrayBuffer) {
		this.mounts.unshift(new MountableEntry(this.normalizePath(path), null as any, new MemoryVfsEntry(path, data)));
	}

	private normalizePath(path: string) {
		return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
	}

	private transformPath(path: string) {
		path = this.normalizePath(path);

		for (let n = 0; n < this.mounts.length; n++) {
            const mount = this.mounts[n];
            //console.log(mount.path + ' -- ' + path);
			if (path.startsWith(mount.path)) {
                const part = path.substr(mount.path.length);
				return { mount: mount, part: part };
			}
		}
		console.info(this.mounts);
		throw (new Error("MountableVfs: Can't find file '" + path + "'"));
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): PromiseFast<VfsEntry> {
        const info = this.transformPath(path);

        if (info.mount.file) {
			return PromiseFast.resolve(info.mount.file);
		} else {
			return info.mount.vfs.openAsync(info.part, flags, mode);
		}
	}

	openDirectoryAsync(path: string) {
        const info = this.transformPath(path);

        if (info.mount.file) {
			return PromiseFast.resolve(info.mount.file);
		} else {
			return info.mount.vfs.openDirectoryAsync(info.part);
		}
	}

	getStatAsync(path: string): PromiseFast<VfsStat> {
        const info = this.transformPath(path);

        if (info.mount.file) {
			return PromiseFast.resolve(info.mount.file.stat());
		} else {
			return info.mount.vfs.getStatAsync(info.part);
		}
	}
	
	deleteAsync(path: string): PromiseFast<void> {
        const info = this.transformPath(path);
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
//		const request = indexedDB.open("mydatabase");
//
//		request.onsuccess = (e) => {
//			const db = <IDBDatabase>request.result;
//
//			const trans = db.transaction(["objectstore1", "objectstore2", READ_WRITE);
//			trans.objectStore("objectstore1").put(myblob, "somekey");
//			trans.objectStore("objectstore2").put(myblob, "otherkey");
//		};
//		request.onerror = (e) => {
//		};
//	}
//}
