module format.iso {
	var SECTOR_SIZE = 0x800;

    class DirectoryRecordDate {
		year: number;
		month: number;
		day: number;
		hour: number;
		minute: number;
		second: number;
        offset: number;

        get date() {
            return new Date(this.year, this.month, this.day, this.hour, this.minute, this.second);
        }

        static struct = StructClass.create<DirectoryRecordDate>(DirectoryRecordDate, [
			{ type: UInt8, name: 'year' },
			{ type: UInt8, name: 'month' },
			{ type: UInt8, name: 'day' },
			{ type: UInt8, name: 'hour' },
			{ type: UInt8, name: 'minute' },
			{ type: UInt8, name: 'second' },
			{ type: UInt8, name: 'offset' },
		]);
    }

    class IsoStringDate {
        // 2009032214540800
        data: string;

        get year() { return parseInt(this.data.substr(0, 4)); }
        get month() { return parseInt(this.data.substr(4, 2)); }
        get day() { return parseInt(this.data.substr(6, 2)); }
        get hour() { return parseInt(this.data.substr(8, 2)); }
        get minute() { return parseInt(this.data.substr(10, 2)); }
        get second() { return parseInt(this.data.substr(12, 2)); }
        get hsecond() { return parseInt(this.data.substr(14, 2)); }
        get offset() { return parseInt(this.data.substr(16, 1)); }

        static struct = StructClass.create<IsoStringDate>(IsoStringDate, [
            { type: Stringz(17), name: 'data' },
        ]);
    }

	enum VolumeDescriptorHeaderType { // : byte
		BootRecord = 0x00,
		VolumePartitionSetTerminator = 0xFF,
		PrimaryVolumeDescriptor = 0x01,
		SupplementaryVolumeDescriptor = 0x02,
		VolumePartitionDescriptor = 0x03,
	}

	class VolumeDescriptorHeader
	{
		type: VolumeDescriptorHeaderType;
		id: string;
		version: number;

		static struct = StructClass.create<VolumeDescriptorHeader>(VolumeDescriptorHeader, [
			{ type: UInt8, name: 'type' },
			{ type: Stringz(5), name: 'id' },
			{ type: UInt8, name: 'version' },
		]);
    }

	enum DirectoryRecordFlags {// : byte
        Unknown1 = 1 << 0,
        Directory = 1 << 1,
        Unknown2 = 1 << 2,
        Unknown3 = 1 << 3,
        Unknown4 = 1 << 4,
        Unknown5 = 1 << 5,
	}


    class DirectoryRecord {
		length: number;
		extendedAttributeLength: number;
        extent: number;
        size: number;
        date: DirectoryRecordDate;
        flags: DirectoryRecordFlags;
        fileUnitSize: number;
        interleave: number;
        volumeSequenceNumber: number;
        nameLength: number;
        name: string = '';
        get offset() { return this.extent * SECTOR_SIZE; }

        get isDirectory() { return (this.flags & DirectoryRecordFlags.Directory) != 0; }

        static struct = StructClass.create<DirectoryRecord>(DirectoryRecord, <StructEntry[]>[
            { type: UInt8, name: 'length' },
            { type: UInt8, name: 'extendedAttributeLength' },
            { type: UInt32_2lb, name: 'extent' },
            { type: UInt32_2lb, name: 'size' },
            { type: DirectoryRecordDate.struct, name: 'date' },
            { type: UInt8, name: 'flags' },
            { type: UInt8, name: 'fileUnitSize' },
            { type: UInt8, name: 'interleave' },
            { type: UInt16_2lb, name: 'volumeSequenceNumber' },
            { type: UInt8, name: 'nameLength' },
        ]);
    }

	class PrimaryVolumeDescriptor
	{
		header: VolumeDescriptorHeader;
		systemId: string;
		volumeId: string;
        volumeSpaceSize: number;
        volumeSetSize: number;
        volumeSequenceNumber: number;
        logicalBlockSize: number;
        pathTableSize: number;
        typeLPathTable: number;
        optType1PathTable: number;
        typeMPathTable: number;
        optTypeMPathTable: number;

        directoryRecord: DirectoryRecord;

        volumeSetId: string;
        publisherId: string;
        preparerId: string;
        applicationId: string;
        copyrightFileId: string;
        abstractFileId: string;
        bibliographicFileId: string;

        creationDate: IsoStringDate;
        modificationDate: IsoStringDate;
        expirationDate: IsoStringDate;
        effectiveDate: IsoStringDate;

        fileStructureVersion: number;
        pad5: number;

        applicationData: number[];
        pad6_: number[];

        static struct = StructClass.create<PrimaryVolumeDescriptor>(PrimaryVolumeDescriptor, <StructEntry[]>[
			{ type: VolumeDescriptorHeader.struct, name: 'header' },
			{ type: UInt8, name: '_pad1' },
			{ type: Stringz(0x20), name: 'systemId' },
			{ type: Stringz(0x20), name: 'volumeId' },
            { type: Int64, name: '_pad2' },

            { type: UInt32_2lb, name: 'volumeSpaceSize' },
            { type: StructArray.create(Int64, 4), name: '_pad3' },
            { type: UInt32, name: 'volumeSetSize' },
            { type: UInt32, name: 'volumeSequenceNumber' },
            { type: UInt16_2lb, name: 'logicalBlockSize' },
            { type: UInt32_2lb, name: 'pathTableSize' },

            { type: UInt32, name: 'typeLPathTable' },
            { type: UInt32, name: 'optType1PathTable' },
            { type: UInt32, name: 'typeMPathTable' },
            { type: UInt32, name: 'optTypeMPathTable' },

            { type: DirectoryRecord.struct, name: 'directoryRecord' },
            { type: UInt8, name: '_pad4' },

            { type: Stringz(0x80), name: 'volumeSetId' },
            { type: Stringz(0x80), name: 'publisherId' },
            { type: Stringz(0x80), name: 'preparerId' },
            { type: Stringz(0x80), name: 'applicationId' },
            { type: Stringz(37), name: 'copyrightFileId' },
            { type: Stringz(37), name: 'abstractFileId' },
            { type: Stringz(37), name: 'bibliographicFileId' },

            { type: IsoStringDate.struct, name: 'creationDate' },
            { type: IsoStringDate.struct, name: 'modificationDate' },
            { type: IsoStringDate.struct, name: 'expirationDate' },
            { type: IsoStringDate.struct, name: 'effectiveDate' },

            { type: UInt8, name: 'fileStructureVersion' },
            { type: UInt8, name: 'pad5' },
            { type: StructArray.create<number>(UInt8, 0x200), name: 'pad5' },
            { type: StructArray.create<number>(UInt8, 653), name: 'pad6' },
		]);
    }

	export interface IIsoNode {
		readChunkAsync(offset: number, length: number):Promise<ArrayBuffer>
        childs: IIsoNode[];
        childsByName: StringDictionary<IIsoNode>;
        path: string;
        name: string;
        size: number;
        isDirectory: boolean;
        date: Date;
    }

    class IsoNode implements IIsoNode {
        childs: IsoNode[] = [];
        childsByName: StringDictionary<IsoNode> = {};

        constructor(private iso: Iso, public directoryRecord: DirectoryRecord, public parent: IsoNode = null) {
        }

        get isRoot() { return this.parent == null; }
        get size() { return this.directoryRecord.size; }
        get path() { return (this.parent && !this.parent.isRoot) ? (this.parent.path + '/' + this.name) : this.name; }
        get name() { return this.directoryRecord.name;  }
        get isDirectory() { return this.directoryRecord.isDirectory; }
		get date() { return this.directoryRecord.date.date; }

		readChunkAsync(offset: number, count: number): Promise<ArrayBuffer> {
			var fileBaseLow = this.directoryRecord.offset;
			var low = fileBaseLow + offset;
			var high = Math.min(low + count, fileBaseLow + this.size);
			return this.iso.readChunkAsync(low, high - low);
		}

        addChild(child: IsoNode) {
            this.childs.push(child);
            this.childsByName[child.name] = child;
        }

        toString() {
            return sprintf('IsoNode(%s, %d)', this.path, this.size);
        }
    }

	export class Iso implements AsyncStream {
        private asyncStream: AsyncStream;
        private _root: IsoNode;
        private _children: IsoNode[];
        private _childrenByPath: StringDictionary<IsoNode>;

		get name() { return this.asyncStream.name; }
        get root(): IIsoNode { return this._root; }
        get childrenByPath(): StringDictionary<IIsoNode> { return this._childrenByPath; }
        get children(): IIsoNode[]{ return this._children.slice(); }

        static fromStreamAsync(asyncStream: AsyncStream) {
            return new Iso().loadAsync(asyncStream);
		}

		get(path: string): IIsoNode {
			path = path.replace(/^\/+/, '');
			var node = this._childrenByPath[path];
			if (!node) {
				console.info(this);
				throw (new Error(sprintf("Can't find node '%s'", path)));
			}
			return node;
		}

		get size() { return this.asyncStream.size; }

		readChunkAsync(offset: number, count: number) {
			return this.asyncStream.readChunkAsync(offset, count);
		}

        loadAsync(asyncStream: AsyncStream): Promise<Iso> {
            this.asyncStream = asyncStream;

            if (PrimaryVolumeDescriptor.struct.length != SECTOR_SIZE) throw (sprintf("Invalid PrimaryVolumeDescriptor.struct size %d != %d", PrimaryVolumeDescriptor.struct.length, SECTOR_SIZE));

			return asyncStream.readChunkAsync(SECTOR_SIZE * 0x10, 0x800).then(arrayBuffer => {
				var stream = Stream.fromArrayBuffer(arrayBuffer);
				var pvd = PrimaryVolumeDescriptor.struct.read(stream);
				if (pvd.header.type != VolumeDescriptorHeaderType.PrimaryVolumeDescriptor) throw ("Not an ISO file");
				if (pvd.header.id != 'CD001') throw ("Not an ISO file");
				//if (pvd.systemId.rstrip() != 'Win32') throw ("Invalid ISO file systemId:'" + pvd.systemId + "'");
				//if (pvd.volumeId.rstrip() != 'CDROM') throw ("Invalid ISO file volumeId:'" + pvd.volumeId + "'");

				this._children = [];
				this._childrenByPath = {};
				this._root = new IsoNode(this, pvd.directoryRecord);

				return this.processDirectoryRecordAsync(this._root).then(() => this);
			});
        }

        private processDirectoryRecordAsync(parentIsoNode: IsoNode) {
            var directoryStart = parentIsoNode.directoryRecord.extent * SECTOR_SIZE;
			var directoryLength = parentIsoNode.directoryRecord.size;

			return this.asyncStream.readChunkAsync(directoryStart, directoryLength).then((data) => {
				var directoryStream = Stream.fromArrayBuffer(data);

				while (directoryStream.available) {
					var directoryRecordSize = directoryStream.readUInt8();

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

					var directoryRecordStream = directoryStream.readStream(directoryRecordSize);
					var directoryRecord = DirectoryRecord.struct.read(directoryRecordStream);
					directoryRecord.name = directoryRecordStream.readStringz(directoryRecordStream.available);


					//Console.WriteLine("{0}", name); Console.ReadKey();

					if (directoryRecord.name == "" || directoryRecord.name == "\x01") continue;

					//console.log(directoryRecord);

					//writefln("   %s", name);

					var child = new IsoNode(this, directoryRecord, parentIsoNode);
					parentIsoNode.addChild(child);
					this._children.push(child);
					this._childrenByPath[child.path] = child;
				}

				var promiseGenerators: PromiseGenerator<any>[] = [];

				parentIsoNode.childs.forEach(child => {
					if (child.isDirectory) {
						promiseGenerators.push(() => this.processDirectoryRecordAsync(child));
					}
				});

				return PromiseUtils.sequence(promiseGenerators);
			});
        }
	}
}
