import _vfs = require('./vfs');

import Vfs = _vfs.Vfs;
import VfsEntry = _vfs.VfsEntry;
import VfsStat = _vfs.VfsStat;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;

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
