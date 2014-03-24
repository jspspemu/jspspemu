module hle.vfs {
	export class VfsEntry {
		get isDirectory(): boolean { throw (new Error("Must override isDirectory")); }
		enumerateAsync() { throw (new Error("Must override enumerateAsync")); }
		get size(): number { throw (new Error("Must override size")); }
		readAllAsync() { return this.readChunkAsync(0, this.size); }
		readChunkAsync(offset: number, length: number): Promise<ArrayBuffer> { throw (new Error("Must override readChunkAsync")); }
		close() { }
	}

	export class Vfs {
		open(path: string): VfsEntry {
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

		open(path: string): VfsEntry {
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

		open(path: string): VfsEntry {
			var file = this.files[path];
			if (!file) throw(new Error(sprintf("Can't find '%s'", path)));
			return new MemoryVfsEntry(file);
		}
	}

}
