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

	async openPromiseAsync(path: string, flags: FileOpenFlags, mode: FileMode) {
		if (flags & FileOpenFlags.Write) {
			return PromiseFast.resolve(new MemoryVfsEntry(path, new ArrayBuffer(0)));
		}

        const url = this.getAbsoluteUrl(path);

        const stream = await UrlAsyncStream.fromUrlAsync(url)
        return new VfsEntryStream(stream)
	}

	openDirectoryAsync(path: string) {
		return PromiseFast.resolve(new MemoryVfsEntry(path, new ArrayBuffer(0)));
	}

	async getStatPromiseAsync(path: string) {
        const url = this.getAbsoluteUrl(path);
        return await statUrlAsync(url)
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

async function statUrlAsync(url: string) {
    const info = await statFileAsync(url)
    return await urlStatToVfsStat(url, info)
}