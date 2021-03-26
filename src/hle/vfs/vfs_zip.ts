import {PromiseFast} from "../../global/utils";
import {FileMode, FileOpenFlags, Vfs, VfsEntry, VfsStat} from "./vfs";
import {Zip, ZipEntry} from "../../format/zip";

export class ZipVfs extends Vfs {
	constructor(private zip: Zip, private writeVfs?: Vfs) {
		super();
	}

	async openPromiseAsync(path: string, flags: FileOpenFlags, mode: FileMode) {
		return new ZipVfsFile(this.zip.get(path))
	}
}

class ZipVfsFile extends VfsEntry {
	constructor(private node: ZipEntry) {
		super();
	}

	get isDirectory() { return this.node.isDirectory; }
	get size() { return this.node.size; }
	readChunkAsync(offset: number, length: number): PromiseFast<ArrayBuffer> { return this.node.readChunkAsync(offset, length); }
	close() { }

	private static statNode(node: ZipEntry): VfsStat {
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
