import {logger, PromiseFast, StringDictionary} from "../../global/utils";
import {FileMode, FileOpenFlags, Vfs, VfsEntry, VfsStat} from "./vfs";

const console = logger.named("memory_vfs")

export class MemoryVfs extends Vfs {
	private files: StringDictionary<MemoryVfsEntry> = {};

	addFile(name: string, data: ArrayBuffer) {
		this.files[name] = new MemoryVfsEntry(name, data);
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): PromiseFast<VfsEntry> {
		if (flags & FileOpenFlags.Write) {
			if (!this.files[path]) {
				this.addFile(path, new ArrayBuffer(0));
			}
		}
		if (flags & FileOpenFlags.Truncate) {
			this.addFile(path, new ArrayBuffer(0));
		}
        const file = this.files[path];
		if (!file) {
            const error:any = new Error(`MemoryVfs: Can't find '${path}'`);
			//console.warn(error);
			//console.warn(error['stack']);
			return PromiseFast.reject(error);
		} else {
			return PromiseFast.resolve(file);
		}
	}
}

export class MemoryVfsEntry extends VfsEntry {
	constructor(private name:string, private data: ArrayBuffer) {
		super();
	}

	get isDirectory() { return false; }

	readChunkAsync(offset: number, length: number): PromiseFast<ArrayBuffer> {
		return PromiseFast.resolve(this.data.slice(offset, offset + length));
	}

	writeChunkAsync(offset: number, data: ArrayBuffer): PromiseFast<number> {
        const newData = new ArrayBuffer(Math.max(this.data.byteLength, offset + data.byteLength));
        const newDataArray = new Uint8Array(newData);
		newDataArray.set(new Uint8Array(this.data), 0);
		newDataArray.set(new Uint8Array(data), offset);
		this.data = newData;
		return PromiseFast.resolve(data.byteLength);
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
		return PromiseFast.resolve([]);
	}
}
