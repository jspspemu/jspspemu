﻿import {PromiseFast} from "../../global/utils";
import {AsyncStream, Stream} from "../../global/stream";

export class Vfs {
	devctlAsync(command: number, input: Stream, output: Stream): any {
		console.error('VfsMustOverride devctlAsync', this);
		throw new Error("Must override devctlAsync : " + this);
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): PromiseFast<VfsEntry> {
	    return PromiseFast.ensure(this.openPromiseAsync(path, flags, mode))
	}

    openPromiseAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
        console.error('VfsMustOverride openAsync', this);
        throw new Error("Must override openAsync : " + this);
    }

	async readAllAsync(path: string) {
        let entry = await this.openAsync(path, FileOpenFlags.Read, parseInt('0777', 8));
        return entry.readAllAsync()
	}

	async writeAllAsync(path: string, data: ArrayBuffer) {
        let entry = await this.openAsync(path, FileOpenFlags.Create | FileOpenFlags.Truncate | FileOpenFlags.Write, parseInt('0777', 8));
        return await entry.writeAllAsync(data)
	}
	
	deleteAsync(path: string): PromiseFast<void> {
		throw new Error("Must override openAsync : " + this);
	}

	openDirectoryAsync(path: string) {
		return this.openAsync(path, FileOpenFlags.Read, parseInt('0777', 8));
	}

	getStatAsync(path: string): PromiseFast<VfsStat> {
	    return PromiseFast.ensure(this.getStatPromiseAsync(path))
	}

	async getStatPromiseAsync(path: string): Promise<VfsStat> {
        const entry = await this.openPromiseAsync(path, FileOpenFlags.Read, parseInt('0777', 8));
        return entry.stat()
    }

	existsAsync(path: string): PromiseFast<boolean> {
	    return PromiseFast.ensure(this.existsPromiseAsync(path))
	}

    async existsPromiseAsync(path: string) {
	    try {
            await this.getStatPromiseAsync(path)
            return true
        } catch (e) {
	        return false
        }
    }
}

export class ProxyVfs extends Vfs {
	constructor(public parentVfsList: Vfs[]) { super(); }

	private _callChainWhenError<T>(callback: (vfs:Vfs, e: Error) => void) {
        let promise = PromiseFast.reject(new Error());
        this.parentVfsList.forEach(parentVfs => {
			promise = promise.catch((e) => {
				return callback(parentVfs, e);
			});
		});
		return promise;
	}

    private _callChainWhenErrorPromise<T>(callback: (vfs:Vfs, e: Error) => void) {
        let promise: Promise<any> = Promise.reject(new Error());
        this.parentVfsList.forEach(parentVfs => {
            promise = promise.catch((e) => {
                return callback(parentVfs, e);
            });
        });
        return promise;
    }

    devctlAsync(command: number, input: Stream, output: Stream) {
		return this._callChainWhenError<number>((vfs, e) => {
			return vfs.devctlAsync(command, input, output);
		});
	}
	async openPromiseAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
	    const errors = []
	    for (const vfs of this.parentVfsList) {
            try {
                return await vfs.openPromiseAsync(path, flags, mode)
            } catch (e) {
                errors.push(e)
            }
        }
	    throw errors.first() || new Error("Error ProxyVfs.openPromiseAsync")
	}
	deleteAsync(path: string) {
		return this._callChainWhenError<VfsEntry>((vfs, e) => {
			return vfs.deleteAsync(path);
		});
	}
	openDirectoryAsync(path: string) {
		return this._callChainWhenError<VfsEntry>((vfs, e) => {
			return vfs.openDirectoryAsync(path);
		});
	}
	async getStatPromiseAsync(path: string): Promise<VfsStat> {
		return this._callChainWhenErrorPromise<VfsStat>((vfs, e) => {
			return vfs.getStatPromiseAsync(path);
		});
	}
}

export class VfsEntry {
	get isDirectory(): boolean {
		return this.stat().isDirectory;
	}
	get size(): number { return this.stat().size; }

	readAllAsync() { return this.readChunkAsync(0, this.size); }
	writeAllAsync(data: ArrayBuffer) { return this.writeChunkAsync(0, data, true); }

	enumerateAsync(): PromiseFast<VfsStat[]> { throw (new Error("Must override enumerateAsync : " + this)); }
	readChunkAsync(offset: number, length: number): PromiseFast<ArrayBuffer> { throw (new Error("Must override readChunkAsync : " + this)); }
	writeChunkAsync(offset: number, data: ArrayBuffer, truncate?: boolean): PromiseFast<number> { throw (new Error("Must override writeChunkAsync : " + this)); }
	stat(): VfsStat { throw (new Error("Must override stat")); }
	close() { }
}

export class VfsEntryStream extends VfsEntry {
	constructor(private asyncStream: AsyncStream) {
		super();
	}
	get size(): number { return this.asyncStream.size; }
	readChunkAsync(offset: number, length: number): PromiseFast<ArrayBuffer> {
		return this.asyncStream.readChunkAsync(offset, length);
	}
	close() { }
	stat(): VfsStat {
		return {
			name: this.asyncStream.name,
			size: this.asyncStream.size,
			isDirectory: false,
			timeCreation: this.asyncStream.date,
			timeLastAccess: this.asyncStream.date,
			timeLastModification: this.asyncStream.date,
		};
	}
}

export enum FileOpenFlags {
	Read = 0x0001,
	Write = 0x0002,
	ReadWrite = Read | Write,
	NoBlock = 0x0004,
	_InternalDirOpen = 0x0008, // Internal use for dopen
	Append = 0x0100,
	Create = 0x0200,
	Truncate = 0x0400,
	Excl = 0x0800,
	Unknown1 = 0x4000, // something async?
	NoWait = 0x8000,
	Unknown2 = 0xf0000, // seen on Wipeout Pure and Infected
	Unknown3 = 0x2000000, // seen on Puzzle Guzzle, Hammerin' Hero
}

export const enum FileMode {
}

export interface VfsStat {
	name?: string;
	size: number;
	isDirectory: boolean;
	timeCreation: Date;
	timeLastAccess: Date;
	timeLastModification: Date;
	dependentData0?: number;
	dependentData1?: number;
}
