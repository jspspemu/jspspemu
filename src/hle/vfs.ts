module hle.vfs {
	export class VfsEntry {
		get isDirectory(): boolean { throw (new Error("Must override isDirectory")); }
		enumerateAsync() { throw (new Error("Must override enumerateAsync")); }
		get size(): number { throw (new Error("Must override size")); }
		readAllAsync() { return this.readChunkAsync(0, this.size); }
		readChunkAsync(offset: number, length: number): Promise<ArrayBuffer> { throw (new Error("Must override readChunkAsync")); }
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

	export class VfsStat {
		size: number = 0;
		isDirectory: boolean = false;
		timeCreation: Date = new Date();
		timeLastAccess: Date = new Date();
		timeLastModification: Date = new Date();
	}

	export class Vfs {
		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			console.error(this);
			throw (new Error("Must override open"));
			return null;
		}

		getStatAsync(path: string): Promise<VfsStat> {
			console.error(this);
			throw (new Error("Must override getStatAsync"));
			return null;
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

		stat(): VfsStat {
			return {
				size: this.node.size,
				isDirectory: this.node.isDirectory,
				timeCreation: this.node.date,
				timeLastAccess: this.node.date,
				timeLastModification: this.node.date,
			};
		}
	}

	export class IsoVfs extends Vfs {
		constructor(private iso: format.iso.Iso) {
			super();
		}

		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			return Promise.resolve(new IsoVfsFile(this.iso.get(path)));
		}

		getStatAsync(path: string): Promise<VfsStat> {
			return Promise.resolve(new IsoVfsFile(this.iso.get(path)).stat());
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
			if (!file) throw (new Error(sprintf("MemoryVfs: Can't find '%s'", path)));
			return Promise.resolve(new MemoryVfsEntry(file));
		}

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
	}

	export class UriVfs extends Vfs {
		constructor(public baseUri: string) {
			super();
		}

		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			if (flags & FileOpenFlags.Write) {
				return Promise.resolve(new MemoryVfsEntry(new ArrayBuffer(0)));
			}

			return downloadFileAsync(this.baseUri + '/' + path).then((data) => {
				return new MemoryVfsEntry(data);
			});
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
