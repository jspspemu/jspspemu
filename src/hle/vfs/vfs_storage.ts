﻿import {logger, PromiseFast} from "../../global/utils";
import {FileMode, FileOpenFlags, Vfs, VfsEntry, VfsStat} from "./vfs";
import {MyStorage, indexedDbOpenAsync} from "./indexeddb";

const console = logger.named('vfs.storage');

export class StorageVfs extends Vfs {
    private db?: MyStorage;
    private openDbPromise?: Promise<StorageVfs>;


	constructor(private key: string) {
		super();
	}

	initializeOnceAsync() {
		if (!this.openDbPromise) {
			this.openDbPromise = (async () => {
                const db = await indexedDbOpenAsync(this.key, 3, ['files'])
                this.db = db;
                return this;
            })()

        }
		return this.openDbPromise;
	}

	async openPromiseAsync(path: string, flags: FileOpenFlags, mode: FileMode) {
        await this.initializeOnceAsync()
        return await StorageVfsEntry.fromNameAsync(this.db!, path, flags, mode);
	}
	
	deleteAsync(path:string): PromiseFast<void> {
		return PromiseFast.ensure(this._deleteAsync(path))
	}
	async _deleteAsync(path:string): Promise<void> {
        await this.initializeOnceAsync()
        return this.db!.deleteAsync(path);
    }
}

interface File {
	name: string;
	content: Uint8Array;
	date: Date;
	exists?: boolean;
}

class StorageVfsEntry extends VfsEntry {
	// @ts-ignore
    private file: File;

	constructor(private db: MyStorage, private name: string) {
		super();
	}

	private initAsync(flags: FileOpenFlags, mode: FileMode) {
		return this._getFileAsync().thenFast(file => {
			console.info('initAsync', file);
			if (!file.exists) {
				if (!(flags & FileOpenFlags.Create)) {
					throw new Error(`File '${file.name}' doesn't exist`);
				}
			}
			if (flags & FileOpenFlags.Truncate) {
				file.content = new Uint8Array([]);
			}
			this.file = file;
			return this;
		});
	}

	static fromNameAsync(db: MyStorage, name: string, flags: FileOpenFlags, mode: FileMode) {
		return (new StorageVfsEntry(db, name)).initAsync(flags, mode);
	}

	private async _getFileAsync(): Promise<File> {
	    let file = await this.db.getAsync(this.name)
        if (!file) file = { name: this.name, content: new ArrayBuffer(0), date: new Date(), exists: false };
        return file;
	}

	private async _writeAllAsync(data:ArrayBuffer) {
		return await this.db.putAsync(this.name, {
			'name': this.name,
			'content': new Uint8Array(data),
			'date': new Date(),
			'exists': true,
		});
	}

	enumerateAsync(): PromiseFast<VfsStat[]> {
		throw (new Error("Must override enumerateAsync : " + this));
	}

	readChunkAsync(offset: number, length: number): PromiseFast<ArrayBuffer> {
		//console.log(this.file);
		return PromiseFast.resolve(this.file.content.buffer.slice(offset, offset + length));
	}

	writeChunkAsync(offset: number, data: ArrayBuffer): PromiseFast<number> {
	    return PromiseFast.ensure(this._writeChunkAsync(offset, data))
	}

    async _writeChunkAsync(offset: number, data: ArrayBuffer) {
        const newContent = new ArrayBuffer(Math.max(this.file.content.byteLength, offset + data.byteLength));
        const newContentArray = new Uint8Array(newContent);
        newContentArray.set(new Uint8Array(this.file.content), 0);
        newContentArray.set(new Uint8Array(data), offset);
        this.file.content = newContentArray;
        await this._writeAllAsync(newContent)
        return data.byteLength
    }

	stat(): VfsStat {
		return {
			name: this.file.name,
			size: this.file.content.byteLength,
			isDirectory: false,
			timeCreation: this.file.date,
			timeLastAccess: this.file.date,
			timeLastModification: this.file.date,
			dependentData0: 0,
			dependentData1: 0,
		};
	}
	close() {
	}
}