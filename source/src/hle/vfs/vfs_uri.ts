import * as _vfs from './vfs';

import * as _vfs_memory from './vfs_memory';
import MemoryVfsEntry = _vfs_memory.MemoryVfsEntry;

import Vfs = _vfs.Vfs;
import VfsEntry = _vfs.VfsEntry;
import VfsEntryStream = _vfs.VfsEntryStream;
import VfsStat = _vfs.VfsStat;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;
import {Promise2} from "../../global/utils";
import {UrlAsyncStream} from "../../global/stream";
import {statFileAsync, StatInfo} from "../../global/async";

export class UriVfs extends Vfs {
	constructor(public baseUri: string) {
		super();
	}

	private getAbsoluteUrl(path: string) {
		return this.baseUri + '/' + path;
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise2<VfsEntry> {
		if (flags & FileOpenFlags.Write) {
			return Promise2.resolve(new MemoryVfsEntry(path, new ArrayBuffer(0)));
		}

		var url = this.getAbsoluteUrl(path);

		return UrlAsyncStream.fromUrlAsync(url).then(stream => new VfsEntryStream(stream));
	}

	openDirectoryAsync(path: string) {
		return Promise2.resolve(new MemoryVfsEntry(path, new ArrayBuffer(0)));
	}

	getStatAsync(path: string): Promise2<VfsStat> {
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