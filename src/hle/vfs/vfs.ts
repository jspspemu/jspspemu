module hle.vfs {
	export class Vfs {
		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			console.error('VfsMustOverride openAsync', this);
			throw (new Error("Must override open : " + this));
			return null;
		}

		openDirectoryAsync(path: string) {
			return this.openAsync(path, FileOpenFlags.Read, parseInt('0777', 8));
		}

		getStatAsync(path: string): Promise<VfsStat> {
			return this.openAsync(path, FileOpenFlags.Read, parseInt('0777', 8)).then(entry => entry.stat());
		}
	}

	export class VfsEntry {
		get isDirectory(): boolean { throw (new Error("Must override isDirectory : " + this)); }
		enumerateAsync(): Promise<VfsStat[]> { throw (new Error("Must override enumerateAsync : " + this)); }
		get size(): number { throw (new Error("Must override size : " + this)); }
		readAllAsync() { return this.readChunkAsync(0, this.size); }
		readChunkAsync(offset: number, length: number): Promise<ArrayBuffer> { throw (new Error("Must override readChunkAsync : " + this)); }
		close() { }
		stat(): VfsStat { throw(new Error("Must override stat")); }
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

	export enum FileMode {
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
}
