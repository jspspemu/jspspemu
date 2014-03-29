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
		open(path: string, flags: FileOpenFlags, mode: FileMode): VfsEntry {
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

		open(path: string, flags: FileOpenFlags, mode: FileMode): VfsEntry {
			return new IsoVfsFile(this.iso.get(path));
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

		open(path: string, flags: FileOpenFlags, mode: FileMode): VfsEntry {
			if (flags & FileOpenFlags.Write) {
				this.files[path] = new ArrayBuffer(0);
			}
			var file = this.files[path];
			if (!file) throw (new Error(sprintf("MemoryVfs: Can't find '%s'", path)));
			return new MemoryVfsEntry(file);
		}
	}

}
