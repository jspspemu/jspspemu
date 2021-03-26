import {PromiseFast} from "../../global/utils";
import {FileMode, FileOpenFlags, Vfs, VfsEntry, VfsStat} from "./vfs";
import {IIsoNode, Iso} from "../../format/iso";

export class IsoVfs extends Vfs {
	constructor(private iso: Iso) {
		super();
	}

	async openPromiseAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
        return new IsoVfsFile(this.iso.get(path));
	}
}

class IsoVfsFile extends VfsEntry {
	constructor(private node: IIsoNode) {
		super();
	}

	get isDirectory() { return this.node.isDirectory; }
	get size() { return this.node.size; }
	readChunkAsync(offset: number, length: number): PromiseFast<ArrayBuffer> { return this.node.readChunkAsync(offset, length); }
	close() { }

	private static statNode(node: IIsoNode): VfsStat {
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
		return PromiseFast.resolve(this.node.childs.map(node => IsoVfsFile.statNode(node)));
	}
}
