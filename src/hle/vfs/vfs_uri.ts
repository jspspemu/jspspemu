import _vfs = require('./vfs');

import _vfs_memory = require('./vfs_memory');
import MemoryVfsEntry = _vfs_memory.MemoryVfsEntry;

import Vfs = _vfs.Vfs;
import VfsEntry = _vfs.VfsEntry;
import VfsStat = _vfs.VfsStat;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;

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
