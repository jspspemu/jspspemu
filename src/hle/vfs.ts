module hle.vfs {
	export class VfsEntry {
		get isDirectory(): boolean { throw (new Error("Must override isDirectory : " + this)); }
		enumerateAsync(): Promise<VfsStat[]> { throw (new Error("Must override enumerateAsync : " + this)); }
		get size(): number { throw (new Error("Must override size : " + this)); }
		readAllAsync() { return this.readChunkAsync(0, this.size); }
		readChunkAsync(offset: number, length: number): Promise<ArrayBuffer> { throw (new Error("Must override readChunkAsync : " + this)); }
		close() { }
		stat(): VfsStat { throw(new Error("Must override stat")); }
	}

	export enum FileOpenFlags {
		Read = 0x0001,
		Write = 0x0002,
		ReadWrite = Read | Write,
		NoBlock = 0x0004,
		_InternalDirOpen = 0x0008, // Internal use for dopen
		Append = 0x0100,
		Create = 0x0200,
		Truncate = 0x0400,
		Excl = 0x0800,
		Unknown1 = 0x4000, // something async?
		NoWait = 0x8000,
		Unknown2 = 0xf0000, // seen on Wipeout Pure and Infected
		Unknown3 = 0x2000000, // seen on Puzzle Guzzle, Hammerin' Hero
	}

	export enum FileMode {
	}

	export interface VfsStat {
		name?: string;
		size: number;
		isDirectory: boolean;
		timeCreation: Date;
		timeLastAccess: Date;
		timeLastModification: Date;
	}

	export class Vfs {
		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			console.error('VfsMustOverride openAsync', this);
			throw (new Error("Must override open : " + this));
			return null;
		}

		openDirectoryAsync(path: string) {
			return this.openAsync(path, FileOpenFlags.Read, parseInt('0777', 8));
		}

		getStatAsync(path: string): Promise<VfsStat> {
			return this.openAsync(path, FileOpenFlags.Read, parseInt('0777', 8)).then(entry => entry.stat());
		}
	}

	class IsoVfsFile extends VfsEntry {
		constructor(private node: format.iso.IIsoNode) {
			super();
		}

		get isDirectory() { return this.node.isDirectory; }
		get size() { return this.node.size; }
		readChunkAsync(offset: number, length: number): Promise<ArrayBuffer> { return this.node.readChunkAsync(offset, length); }
		close() { }

		private static statNode(node: format.iso.IIsoNode): VfsStat {
			return {
				name: node.name,
				size: node.size,
				isDirectory: node.isDirectory,
				timeCreation: node.date,
				timeLastAccess: node.date,
				timeLastModification: node.date,
			};
		}

		stat(): VfsStat {
			return IsoVfsFile.statNode(this.node);
		}

		enumerateAsync() {
			return Promise.resolve(this.node.childs.map(node => IsoVfsFile.statNode(node)));
		}
	}

	export class IsoVfs extends Vfs {
		constructor(private iso: format.iso.Iso) {
			super();
		}

		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			try {
				return Promise.resolve(new IsoVfsFile(this.iso.get(path)));
			} catch (e) {
				return Promise.reject(e);
			}
		}
	}

	class ZipVfsFile extends VfsEntry {
		constructor(private node: format.zip.ZipEntry) {
			super();
		}

		get isDirectory() { return this.node.isDirectory; }
		get size() { return this.node.size; }
		readChunkAsync(offset: number, length: number): Promise<ArrayBuffer> { return this.node.readChunkAsync(offset, length); }
		close() { }

		private static statNode(node: format.zip.ZipEntry): VfsStat {
			return {
				name: node.name,
				size: node.size,
				isDirectory: node.isDirectory,
				timeCreation: node.date,
				timeLastAccess: node.date,
				timeLastModification: node.date,
			};
		}

		stat(): VfsStat {
			return ZipVfsFile.statNode(this.node);
		}

		enumerateAsync() {
			return Promise.resolve(this.node.getChildList().map(node => ZipVfsFile.statNode(node)));
		}
	}

	export class ZipVfs extends Vfs {
		constructor(private zip: format.zip.Zip) {
			super();
		}

		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			try {
				return Promise.resolve(new ZipVfsFile(this.zip.get(path)));
			} catch (e) {
				return Promise.reject(e);
			}
		}
	}


	export class MemoryVfsEntry extends VfsEntry {
		constructor(private data: ArrayBuffer) {
			super();
		}

		get isDirectory() { return false; }
		get size() { return this.data.byteLength; }
		readChunkAsync(offset: number, length: number): Promise<ArrayBuffer> { return Promise.resolve(this.data.slice(offset, offset + length)); }
		close() { }

		enumerateAsync() {
			return Promise.resolve([]);
		}
	}

	export class MemoryVfs extends Vfs {
		private files: StringDictionary<ArrayBuffer> = {};

		addFile(name: string, data: ArrayBuffer) {
			this.files[name] = data;
		}

		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			if (flags & FileOpenFlags.Write) {
				this.files[path] = new ArrayBuffer(0);
			}
			var file = this.files[path];
			if (!file) {
				var error = new Error(sprintf("MemoryVfs: Can't find '%s'", path));
				console.error(error);
				return Promise.reject(error);
			} else {
				return Promise.resolve(new MemoryVfsEntry(file));
			}
		}

		/*
		getStatAsync(path: string): Promise<VfsStat> {
			var file = this.files[path];
			if (!file) throw (new Error(sprintf("MemoryVfs: Can't find '%s'", path)));
			return Promise.resolve({
				size: file.byteLength,
				isDirectory: false,
				timeCreation: new Date(),
				timeLastAccess: new Date(),
				timeLastModification: new Date(),
			});
		}
		*/
	}

	export class UriVfs extends Vfs {
		constructor(public baseUri: string) {
			super();
		}

		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			if (flags & FileOpenFlags.Write) {
				return Promise.resolve(new MemoryVfsEntry(new ArrayBuffer(0)));
			}

			return downloadFileAsync(this.baseUri + '/' + path).then((data) => new MemoryVfsEntry(data));
		}

		openDirectoryAsync(path: string) {
			return Promise.resolve(new MemoryVfsEntry(new ArrayBuffer(0)));
		}

		getStatAsync(path: string): Promise<VfsStat> {
			return statFileAsync(this.baseUri + '/' + path).then(() => {
				return {
					size: 0,
					isDirectory: false,
					timeCreation: new Date(),
					timeLastAccess: new Date(),
					timeLastModification: new Date(),
				};
			});
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

	export class MountableVfs extends Vfs {
		private mounts: MountableEntry[] = [];

		mountVfs(path: string, vfs: Vfs) {
			this.mounts.unshift(new MountableEntry(this.normalizePath(path), vfs, null));
		}

		mountFileData(path: string, data: ArrayBuffer) {
			this.mounts.unshift(new MountableEntry(this.normalizePath(path), null, new MemoryVfsEntry(data)));
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

		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			var info = this.transformPath(path);

			if (info.mount.file) {
				return Promise.resolve(info.mount.file);
			} else {
				return info.mount.vfs.openAsync(info.part, flags, mode);
			}
		}

		openDirectoryAsync(path: string) {
			var info = this.transformPath(path);

			if (info.mount.file) {
				return Promise.resolve(info.mount.file);
			} else {
				return info.mount.vfs.openDirectoryAsync(info.part);
			}
		}

		getStatAsync(path: string): Promise<VfsStat> {
			var info = this.transformPath(path);

			if (info.mount.file) {
				return Promise.resolve(info.mount.file.stat());
			} else {
				return info.mount.vfs.getStatAsync(info.part);
			}
		}
	}

}
