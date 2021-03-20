import _vfs = require('./vfs');

import _vfs_memory = require('./vfs_memory');
import MemoryVfsEntry = _vfs_memory.MemoryVfsEntry;

import Vfs = _vfs.Vfs;
import VfsEntry = _vfs.VfsEntry;
import VfsStat = _vfs.VfsStat;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;

import storage = require('./indexeddb');
import {logger, Promise2} from "../../global/utils";

var console = logger.named('vfs.storage');

export class StorageVfs extends Vfs {
	private db: storage.MyStorage;
	private openDbPromise: Promise2<StorageVfs>;


	constructor(private key: string) {
		super();
	}

	initializeOnceAsync() {
		if (!this.openDbPromise) {
			this.openDbPromise = storage.openAsync(this.key, 3, ['files']).then(db => {
				this.db = db;
				return this;
			});
		}
		return this.openDbPromise;
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise2<VfsEntry> {
		return this.initializeOnceAsync().then(() => {
			return StorageVfsEntry.fromNameAsync(this.db, path, flags, mode);
		});
	}
	
	deleteAsync(path:string):Promise2<void> {
		return this.initializeOnceAsync().then(() => {
			return this.db.deleteAsync(path);
		});
	}
}

interface File {
	name: string;
	content: Uint8Array;
	date: Date;
	exists?: boolean;
}

class StorageVfsEntry extends VfsEntry {
	private file: File;

	constructor(private db: storage.MyStorage, private name: string) {
		super();
	}

	private initAsync(flags: FileOpenFlags, mode: FileMode) {
		return this._getFileAsync().then(file => {
			console.info('initAsync', file);
			if (!file.exists) {
				if (!(flags & FileOpenFlags.Create)) {
					throw (new Error("File '" + file.name + "' doesn't exist"));
				}
			}
			if (flags & FileOpenFlags.Truncate) {
				file.content = new Uint8Array([]);
			}
			this.file = file;
			return this;
		});
	}

	static fromNameAsync(db: storage.MyStorage, name: string, flags: FileOpenFlags, mode: FileMode) {
		return (new StorageVfsEntry(db, name)).initAsync(flags, mode);
	}

	private _getFileAsync(): Promise2<File> {
		return this.db.getAsync(this.name).then(file => {
			if (!file) file = { name: this.name, content: new ArrayBuffer(0), date: new Date(), exists: false };
			return file;
		});
	}

	private _getAllAsync() {
		return this._getFileAsync().then(item => item.content);
	}

	private _writeAllAsync(data:ArrayBuffer) {
		return this.db.putAsync(this.name, {
			'name': this.name,
			'content': new Uint8Array(data),
			'date': new Date(),
			'exists': true,
		});
	}

	enumerateAsync(): Promise2<VfsStat[]> {
		throw (new Error("Must override enumerateAsync : " + this));
	}

	readChunkAsync(offset: number, length: number): Promise2<ArrayBuffer> {
		//console.log(this.file);
		return Promise2.resolve(this.file.content.buffer.slice(offset, offset + length));
	}

	writeChunkAsync(offset: number, data: ArrayBuffer): Promise2<number> {
		var newContent = new ArrayBuffer(Math.max(this.file.content.byteLength, offset + data.byteLength));
		var newContentArray = new Uint8Array(newContent);
		newContentArray.set(new Uint8Array(this.file.content), 0);
		newContentArray.set(new Uint8Array(data), offset);
		this.file.content = newContentArray;
		return this._writeAllAsync(newContent).then(() => data.byteLength);
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