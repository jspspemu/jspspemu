module hle.vfs {
	export class VfsEntry {
		get isDirectory(): boolean { throw (new Error("Must override isDirectory")); }
		enumerateAsync() { throw (new Error("Must override enumerateAsync")); }
		get size(): number { throw (new Error("Must override size")); }
		readAllAsync() { return this.readChunkAsync(0, this.size); }
		readChunkAsync(offset: number, length: number): Promise<ArrayBuffer> { throw (new Error("Must override readChunkAsync")); }
		close() { }
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

	export class Vfs {
		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			throw (new Error("Must override open"));
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
	}

	export class IsoVfs extends Vfs {
		constructor(private iso: format.iso.Iso) {
			super();
		}

		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			return Promise.resolve(new IsoVfsFile(this.iso.get(path)));
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
	}

	export class UriVfs extends Vfs {
		constructor(public baseUri: string) {
			super();
		}

		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			return downloadFileAsync(this.baseUri + '/' + path).then((data) => {
				return new MemoryVfsEntry(data);
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
			this.mounts.push(new MountableEntry(this.normalizePath(path), vfs, null));
		}

		mountFileData(path: string, data: ArrayBuffer) {
			this.mounts.push(new MountableEntry(this.normalizePath(path), null, new MemoryVfsEntry(data)));
		}

		private normalizePath(path: string) {
			return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
		}

		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			path = this.normalizePath(path);

			for (var n = 0; n < this.mounts.length; n++) {
				var mount = this.mounts[n];
				//console.log(mount.path + ' -- ' + path);
				if (path.startsWith(mount.path)) {
					var part = path.substr(mount.path.length);
					if (mount.file) {
						return Promise.resolve(mount.file);
					} else {
						return mount.vfs.openAsync(part, flags, mode);
					}
				}
			}
			throw(new Error("Can't find file '" + path + "'"));
		}
	}

}
