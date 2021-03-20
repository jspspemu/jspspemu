import * as _vfs from './vfs';
import * as format_zip from '../../format/zip';

import Vfs = _vfs.Vfs;
import VfsEntry = _vfs.VfsEntry;
import VfsStat = _vfs.VfsStat;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;
import {PromiseFast} from "../../global/utils";

export class ZipVfs extends Vfs {
	constructor(private zip: format_zip.Zip, private writeVfs?: Vfs) {
		super();
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): PromiseFast<VfsEntry> {
		try {
			return PromiseFast.resolve(new ZipVfsFile(this.zip.get(path)));
		} catch (e) {
			return PromiseFast.reject(e);
		}
	}
}

class ZipVfsFile extends VfsEntry {
	constructor(private node: format_zip.ZipEntry) {
		super();
	}

	get isDirectory() { return this.node.isDirectory; }
	get size() { return this.node.size; }
	readChunkAsync(offset: number, length: number): PromiseFast<ArrayBuffer> { return this.node.readChunkAsync(offset, length); }
	close() { }

	private static statNode(node: format_zip.ZipEntry): VfsStat {
		return {
			name: node.name,
			size: node.size,
			isDirectory: node.isDirectory,
			timeCreation: node.date,
			timeLastAccess: node.date,
			timeLastModification: node.date,
		};
	}

	stat(): VfsStat {
		return ZipVfsFile.statNode(this.node);
	}

	enumerateAsync() {
		return PromiseFast.resolve(this.node.getChildList().map(node => ZipVfsFile.statNode(node)));
	}
}
