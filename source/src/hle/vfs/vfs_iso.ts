import _vfs = require('./vfs');

import format_iso = require('../../format/iso');

import Vfs = _vfs.Vfs;
import VfsEntry = _vfs.VfsEntry;
import VfsStat = _vfs.VfsStat;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;

export class IsoVfs extends Vfs {
	constructor(private iso: format_iso.Iso) {
		super();
	}

	openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
		try {
			return Promise.resolve(new IsoVfsFile(this.iso.get(path)));
		} catch (e) {
			return Promise.reject(e);
		}
	}
}

class IsoVfsFile extends VfsEntry {
	constructor(private node: format_iso.IIsoNode) {
		super();
	}

	get isDirectory() { return this.node.isDirectory; }
	get size() { return this.node.size; }
	readChunkAsync(offset: number, length: number): Promise<ArrayBuffer> { return this.node.readChunkAsync(offset, length); }
	close() { }

	private static statNode(node: format_iso.IIsoNode): VfsStat {
		return {
			name: node.name,
			size: node.size,
			isDirectory: node.isDirectory,
			timeCreation: node.date,
			timeLastAccess: node.date,
			timeLastModification: node.date,
			dependentData0: node.extent,
		};
	}

	stat(): VfsStat {
		return IsoVfsFile.statNode(this.node);
	}

	enumerateAsync() {
		return Promise.resolve(this.node.childs.map(node => IsoVfsFile.statNode(node)));
	}
}
