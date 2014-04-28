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

/*
class UriVfsEntry extends VfsEntry {
	constructor(private url: string, private _stat: StatInfo) {
		super();
		console.log('opened', url, _stat);
	}

	get isDirectory(): boolean { return false; }
	get size(): number { return this._stat.size; }
	readChunkAsync(offset: number, length: number): Promise<ArrayBuffer> {
		var totalSize = this._stat.size;
		length = Math.min(length, totalSize - offset);
		console.info('download chunk ', this.url, offset, length);
		return downloadFileChunkAsync(this.url, offset, length).then(data => {
			return data;
		});
	}
	close() { }
	stat(): VfsStat { return urlStatToVfsStat(this._stat); }
}
*/

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