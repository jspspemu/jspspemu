import {PromiseFast} from "../../global/utils";
import {UrlAsyncStream} from "../../global/stream";
import {statFileAsync, StatInfo} from "../../global/async";
import {MemoryVfsEntry} from "./vfs_memory";
import {FileMode, FileOpenFlags, Vfs, VfsEntry, VfsEntryStream, VfsStat} from "./vfs";

export class UriVfs extends Vfs {
	constructor(public baseUri: string) {
		super();
	}

	private getAbsoluteUrl(path: string) {
		return `${this.baseUri}/${path}`;
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): PromiseFast<VfsEntry> {
		if (flags & FileOpenFlags.Write) {
			return PromiseFast.resolve(new MemoryVfsEntry(path, new ArrayBuffer(0)));
		}

        const url = this.getAbsoluteUrl(path);

        return UrlAsyncStream.fromUrlAsync(url).thenFast(stream => new VfsEntryStream(stream));
	}

	openDirectoryAsync(path: string) {
		return PromiseFast.resolve(new MemoryVfsEntry(path, new ArrayBuffer(0)));
	}

	getStatAsync(path: string): PromiseFast<VfsStat> {
        const url = this.getAbsoluteUrl(path);
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
	return statFileAsync(url).thenFast((info) => urlStatToVfsStat(url, info));
}