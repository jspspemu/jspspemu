import _vfs = require('./vfs');

import Vfs = _vfs.Vfs;
import VfsEntry = _vfs.VfsEntry;
import VfsStat = _vfs.VfsStat;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;

export class MemoryVfs extends Vfs {
	private files: StringDictionary<MemoryVfsEntry> = {};

	addFile(name: string, data: ArrayBuffer) {
		this.files[name] = new MemoryVfsEntry(name, data);
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise2<VfsEntry> {
		if (flags & FileOpenFlags.Write) {
			if (!this.files[path]) {
				this.addFile(path, new ArrayBuffer(0));
			}
		}
		if (flags & FileOpenFlags.Truncate) {
			this.addFile(path, new ArrayBuffer(0));
		}
		var file = this.files[path];
		if (!file) {
			var error:any = new Error(`MemoryVfs: Can't find '${path}'`);
			console.error(error);
			console.error(error['stack']);
			return Promise2.reject(error);
		} else {
			return Promise2.resolve(file);
		}
	}
}

export class MemoryVfsEntry extends VfsEntry {
	constructor(private name:string, private data: ArrayBuffer) {
		super();
	}

	get isDirectory() { return false; }

	readChunkAsync(offset: number, length: number): Promise2<ArrayBuffer> {
		return Promise2.resolve(this.data.slice(offset, offset + length));
	}

	writeChunkAsync(offset: number, data: ArrayBuffer): Promise2<number> {
		var newData = new ArrayBuffer(Math.max(this.data.byteLength, offset + data.byteLength));
		var newDataArray = new Uint8Array(newData);
		newDataArray.set(new Uint8Array(this.data), 0);
		newDataArray.set(new Uint8Array(data), offset);
		this.data = newData;
		return Promise2.resolve(data.byteLength);
	}

	stat(): VfsStat {
		return {
			name: this.name,
			size: this.data.byteLength,
			isDirectory: false,
			timeCreation: new Date(),
			timeLastAccess: new Date(),
			timeLastModification: new Date(),
		};
	}
	close() { }

	enumerateAsync() {
		return Promise2.resolve([]);
	}
}
