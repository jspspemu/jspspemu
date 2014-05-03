import _vfs = require('./vfs');

import _vfs_memory = require('./vfs_memory');
import MemoryVfsEntry = _vfs_memory.MemoryVfsEntry;

import Vfs = _vfs.Vfs;
import VfsEntry = _vfs.VfsEntry;
import VfsEntryStream = _vfs.VfsEntryStream;
import VfsStat = _vfs.VfsStat;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;

export class UriVfs extends Vfs {
	constructor(public baseUri: string) {
		super();
	}

	private getAbsoluteUrl(path: string) {
		return this.baseUri + '/' + path;
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
		if (flags & FileOpenFlags.Write) {
			return Promise.resolve(new MemoryVfsEntry(new ArrayBuffer(0)));
		}

		var url = this.getAbsoluteUrl(path);

		return UrlAsyncStream.fromUrlAsync(url).then(stream => new VfsEntryStream(stream));
	}

	openDirectoryAsync(path: string) {
		return Promise.resolve(new MemoryVfsEntry(new ArrayBuffer(0)));
	}

	getStatAsync(path: string): Promise<VfsStat> {
		var url = this.getAbsoluteUrl(path);
		return statUrlAsync(url);
	}
}

function urlStatToVfsStat(url: string, info: StatInfo) {
	return {
		name: url,
		size: info.size,
		isDirectory: false,
		timeCreation: info.date,
		timeLastAccess: info.date,
		timeLastModification: info.date,
	};
}

function statUrlAsync(url: string) {
	return statFileAsync(url).then((info) => urlStatToVfsStat(url, info));
}