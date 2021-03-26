import "../emu/global"
import {AsyncStream, BaseAsyncStream, BufferedAsyncStream, Stream} from "../global/stream";
import {PromiseFast, PromiseGenerator, PromiseUtils, StringDictionary} from "../global/utils";
import {
    GetStruct,
    Int64,
    Stringz,
    Struct,
    StructArray,
    StructClass,
    StructEntry,
    StructMember,
    StructStructArray,
    StructStructStringz,
    StructUInt16_2lb,
    StructUInt32,
    StructUInt32_2lb,
    StructUInt8,
    UInt16_2lb,
    UInt32,
    UInt32_2lb,
    UInt8
} from "../global/struct";
import {MathUtils, parseIntFormat} from "../global/math";

const SECTOR_SIZE = 0x800;

class DirectoryRecordDate extends Struct {
	@StructUInt8 year = 2004;
    @StructUInt8 month = 1;
    @StructUInt8 day = 1;
    @StructUInt8 hour = 0;
    @StructUInt8 minute = 0;
    @StructUInt8 second = 0;
    @StructUInt8 offset = 0;

    get date() {
        return new Date(this.year, this.month, this.day, this.hour, this.minute, this.second);
    }
}

class IsoStringDate extends Struct {
    // 2009032214540800
    @StructStructStringz(17) data: string = ''

    get year() { return parseInt(this.data.substr(0, 4)); }
    get month() { return parseInt(this.data.substr(4, 2)); }
    get day() { return parseInt(this.data.substr(6, 2)); }
    get hour() { return parseInt(this.data.substr(8, 2)); }
    get minute() { return parseInt(this.data.substr(10, 2)); }
    get second() { return parseInt(this.data.substr(12, 2)); }
    get hsecond() { return parseInt(this.data.substr(14, 2)); }
    get offset() { return parseInt(this.data.substr(16, 1)); }
}

enum VolumeDescriptorHeaderType { // : byte
	BootRecord = 0x00,
	VolumePartitionSetTerminator = 0xFF,
	PrimaryVolumeDescriptor = 0x01,
	SupplementaryVolumeDescriptor = 0x02,
	VolumePartitionDescriptor = 0x03,
}

class VolumeDescriptorHeader extends Struct {
	@StructUInt8 type: VolumeDescriptorHeaderType = VolumeDescriptorHeaderType.BootRecord
	@StructStructStringz(5) id: string = ''
	@StructUInt8 version: number = 0
}

enum DirectoryRecordFlags {// : byte
    Unknown1 = 1 << 0,
    Directory = 1 << 1,
    Unknown2 = 1 << 2,
    Unknown3 = 1 << 3,
    Unknown4 = 1 << 4,
    Unknown5 = 1 << 5,
}


class DirectoryRecord extends Struct {
	@StructUInt8 length = 0;
    @StructUInt8 extendedAttributeLength = 0;
    @StructUInt32_2lb extent = 0;
    @StructUInt32_2lb size = 0;
	@StructMember(DirectoryRecordDate.struct) date = new DirectoryRecordDate();
    @StructUInt8 flags = DirectoryRecordFlags.Directory;
    @StructUInt8 fileUnitSize = 0;
    @StructUInt8 interleave = 0;
    @StructUInt16_2lb volumeSequenceNumber = 0;
    @StructUInt8 nameLength = 0;
    name = '';
    get offset() { return this.extent * SECTOR_SIZE; }
    get isDirectory() { return (this.flags & DirectoryRecordFlags.Directory) != 0; }
}

class PrimaryVolumeDescriptor extends Struct {
	// @ts-ignore
    @StructMember(VolumeDescriptorHeader.struct) header: VolumeDescriptorHeader;
    @StructUInt8 _pad1: number = 0
	@StructStructStringz(0x20) systemId: string = ''
    @StructStructStringz(0x20) volumeId: string = ''
    @StructMember(Int64) _pad2: number = 0
    @StructUInt32_2lb volumeSpaceSize: number = 0
    @StructMember(StructArray(Int64, 4)) _pad3: any = null
    @StructUInt32 volumeSetSize: number = 0
    @StructUInt32 volumeSequenceNumber: number = 0
    @StructUInt16_2lb logicalBlockSize: number = 0
    @StructUInt32_2lb pathTableSize: number = 0
    @StructUInt32 typeLPathTable: number = 0
    @StructUInt32 optType1PathTable: number = 0
    @StructUInt32 typeMPathTable: number = 0
    @StructUInt32 optTypeMPathTable: number = 0

    // @ts-ignore
    @StructMember(DirectoryRecord.struct) directoryRecord: DirectoryRecord;

    @StructUInt8 _pad4: number = 0

    @StructStructStringz(0x80) volumeSetId: string = ''
    @StructStructStringz(0x80) publisherId: string = ''
    @StructStructStringz(0x80) preparerId: string = ''
    @StructStructStringz(0x80) applicationId: string = ''
    @StructStructStringz(37) copyrightFileId: string = ''
    @StructStructStringz(37) abstractFileId: string = ''
    @StructStructStringz(37) bibliographicFileId: string = ''

    // @ts-ignore
    @StructMember(IsoStringDate.struct) creationDate: IsoStringDate
    // @ts-ignore
    @StructMember(IsoStringDate.struct) modificationDate: IsoStringDate
    // @ts-ignore
    @StructMember(IsoStringDate.struct) expirationDate: IsoStringDate
    // @ts-ignore
    @StructMember(IsoStringDate.struct) effectiveDate: IsoStringDate

    @StructUInt8 fileStructureVersion: number = 0
    @StructUInt8 pad5: number = 0

	@StructStructArray(UInt8, 0x200) pad6: number = 0
    @StructStructArray(UInt8, 653) pad7: number[] = []

    applicationData: number[] = []
}

export interface IIsoNode {
	readChunkAsync(offset: number, length: number):PromiseFast<ArrayBuffer>
    childs: IIsoNode[];
    childsByName: StringDictionary<IIsoNode>;
    path: string;
    name: string;
	size: number;
	extent: number;
    isDirectory: boolean;
    date: Date;
}

class IsoNode implements IIsoNode {
    childs: IsoNode[] = [];
    childsByName: StringDictionary<IsoNode> = {};

    constructor(private iso: Iso, public directoryRecord: DirectoryRecord, public parent: IsoNode|null = null) {
    }

    get isRoot() { return this.parent == null; }
    get size() { return this.directoryRecord.size; }
    get path():string { return (this.parent && !this.parent.isRoot) ? (`${this.parent.path}/${this.name}`) : this.name; }
    get name() { return this.directoryRecord.name;  }
    get isDirectory() { return this.directoryRecord.isDirectory; }
	get date() { return this.directoryRecord.date.date; }
	get extent() { return this.directoryRecord.extent; }

	readChunkAsync(offset: number, count: number): PromiseFast<ArrayBuffer> {
        const fileBaseLow = this.directoryRecord.offset;
        const low = fileBaseLow + offset;
        const high = Math.min(low + count, fileBaseLow + this.size);
        return this.iso.readChunkAsync(low, high - low);
	}

    addChild(child: IsoNode) {
        this.childs.push(child);
        this.childsByName[child.name] = child;
    }

    toString() {
        return `IsoNode(${this.path}, ${this.size})`;
    }
}

export class Iso extends BaseAsyncStream {
    // @ts-ignore
    private asyncStream: AsyncStream;
    // @ts-ignore
    private _root: IsoNode;
    // @ts-ignore
    private _children: IsoNode[];
    // @ts-ignore
    private _childrenByPath: StringDictionary<IsoNode>;

	date: Date = new Date();
	get name() { return this.asyncStream.name; }
    get root(): IIsoNode { return this._root; }
    get childrenByPath(): StringDictionary<IIsoNode> { return this._childrenByPath; }
    get children(): IIsoNode[]{ return this._children.slice(0); }

    static fromStreamAsync(asyncStream: AsyncStream) {
        return new Iso().loadAsync(asyncStream);
        //return new Iso().loadAsync(asyncStream);
	}

	get(path: string): IIsoNode {
		path = path.replace(/^\/+/, '');

        const sce_file = path.match(/^sce_lbn(0x[0-9a-f]+|\d+)_size(0x[0-9a-f]+|\d+)$/i);
        if (sce_file) {
            const lba = parseIntFormat(sce_file[1]);
            const size = parseIntFormat(sce_file[2]);
            const dr = new DirectoryRecord();
            dr.extent = lba;
			dr.size = size;
			dr.name = '';
			//console.log(dr);
			return new IsoNode(this, dr, null);
		}

		if (path == '') return this.root;
        const node = this._childrenByPath[path];
        if (!node) {
			//console.info(this);
			throw (new Error(`Can't find node '${path}'`));
		}
		return node;
	}

	get size() { return this.asyncStream.size; }

	readChunkPromiseAsync(offset: number, count: number) {
		return this.asyncStream.readChunkPromiseAsync(offset, count);
	}

    async loadAsync(asyncStream: AsyncStream) {
		this.asyncStream = asyncStream;
		this.date = asyncStream.date;

        if (PrimaryVolumeDescriptor.struct.length != SECTOR_SIZE) throw `Invalid PrimaryVolumeDescriptor.struct size ${PrimaryVolumeDescriptor.struct.length} != ${SECTOR_SIZE}`;

        const arrayBuffer = await asyncStream.readChunkAsync(SECTOR_SIZE * 0x10, 0x800)

        const stream = Stream.fromArrayBuffer(arrayBuffer);
        const pvd = PrimaryVolumeDescriptor.struct.read(stream);
        if (pvd.header.type != VolumeDescriptorHeaderType.PrimaryVolumeDescriptor) throw `Not an ISO file`;
        if (pvd.header.id != 'CD001') throw `Not an ISO file`;

        this._children = [];
        this._childrenByPath = {};
        this._root = new IsoNode(this, pvd.directoryRecord);

        await this.processDirectoryRecordAsync(this._root)

        return this
    }

    private async processDirectoryRecordAsync(parentIsoNode: IsoNode) {
        const directoryStart = parentIsoNode.directoryRecord.extent * SECTOR_SIZE;
        const directoryLength = parentIsoNode.directoryRecord.size;

        //const start = performance.now()
        const data = await this.asyncStream.readChunkAsync(directoryStart, directoryLength)
        //const end = performance.now()
        //console.warn(end - start)
        const directoryStream = Stream.fromArrayBuffer(data);

        while (directoryStream.available) {
            const directoryRecordSize = directoryStream.readUInt8();

            // Even if a directory spans multiple sectors, the directory entries are not permitted to cross the sector boundary (unlike the path table).
            // Where there is not enough space to record an entire directory entry at the end of a sector, that sector is zero-padded and the next
            // consecutive sector is used.
            if (directoryRecordSize == 0) {
                directoryStream.position = MathUtils.nextAligned(directoryStream.position, SECTOR_SIZE);
                //Console.WriteLine("AlignedTo: {0:X}", DirectoryStream.Position);
                continue;
            }

            directoryStream.position = directoryStream.position - 1;

            //Console.WriteLine("[{0}:{1:X}-{2:X}]", DirectoryRecordSize, DirectoryStream.Position, DirectoryStream.Position + DirectoryRecordSize);

            const directoryRecordStream = directoryStream.readStream(directoryRecordSize);
            const directoryRecord = GetStruct(DirectoryRecord).read(directoryRecordStream);
            directoryRecord.name = directoryRecordStream.readStringz(directoryRecordStream.available);


            //Console.WriteLine("{0}", name); Console.ReadKey();

            if (directoryRecord.name == "" || directoryRecord.name == "\x01") continue;

            //console.log(directoryRecord);

            //writefln("   %s", name);

            const child = new IsoNode(this, directoryRecord, parentIsoNode);
            parentIsoNode.addChild(child);
            this._children.push(child);
            this._childrenByPath[child.path] = child;
        }

        for (const child of parentIsoNode.childs) {
            if (child.isDirectory) {
                await this.processDirectoryRecordAsync(child)
            }
        }
    }
}
