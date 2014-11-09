///<reference path="../global.d.ts" />
var SECTOR_SIZE = 0x800;
var DirectoryRecordDate = (function () {
    function DirectoryRecordDate() {
        this.year = 2004;
        this.month = 1;
        this.day = 1;
        this.hour = 0;
        this.minute = 0;
        this.second = 0;
        this.offset = 0;
    }
    Object.defineProperty(DirectoryRecordDate.prototype, "date", {
        get: function () {
            return new Date(this.year, this.month, this.day, this.hour, this.minute, this.second);
        },
        enumerable: true,
        configurable: true
    });
    DirectoryRecordDate.struct = StructClass.create(DirectoryRecordDate, [
        { year: UInt8 },
        { month: UInt8 },
        { day: UInt8 },
        { hour: UInt8 },
        { minute: UInt8 },
        { second: UInt8 },
        { offset: UInt8 },
    ]);
    return DirectoryRecordDate;
})();
var IsoStringDate = (function () {
    function IsoStringDate() {
    }
    Object.defineProperty(IsoStringDate.prototype, "year", {
        get: function () {
            return parseInt(this.data.substr(0, 4));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "month", {
        get: function () {
            return parseInt(this.data.substr(4, 2));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "day", {
        get: function () {
            return parseInt(this.data.substr(6, 2));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "hour", {
        get: function () {
            return parseInt(this.data.substr(8, 2));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "minute", {
        get: function () {
            return parseInt(this.data.substr(10, 2));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "second", {
        get: function () {
            return parseInt(this.data.substr(12, 2));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "hsecond", {
        get: function () {
            return parseInt(this.data.substr(14, 2));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoStringDate.prototype, "offset", {
        get: function () {
            return parseInt(this.data.substr(16, 1));
        },
        enumerable: true,
        configurable: true
    });
    IsoStringDate.struct = StructClass.create(IsoStringDate, [
        { data: Stringz(17) },
    ]);
    return IsoStringDate;
})();
var VolumeDescriptorHeaderType;
(function (VolumeDescriptorHeaderType) {
    VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["BootRecord"] = 0x00] = "BootRecord";
    VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["VolumePartitionSetTerminator"] = 0xFF] = "VolumePartitionSetTerminator";
    VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["PrimaryVolumeDescriptor"] = 0x01] = "PrimaryVolumeDescriptor";
    VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["SupplementaryVolumeDescriptor"] = 0x02] = "SupplementaryVolumeDescriptor";
    VolumeDescriptorHeaderType[VolumeDescriptorHeaderType["VolumePartitionDescriptor"] = 0x03] = "VolumePartitionDescriptor";
})(VolumeDescriptorHeaderType || (VolumeDescriptorHeaderType = {}));
var VolumeDescriptorHeader = (function () {
    function VolumeDescriptorHeader() {
    }
    VolumeDescriptorHeader.struct = StructClass.create(VolumeDescriptorHeader, [
        { type: UInt8 },
        { id: Stringz(5) },
        { version: UInt8 },
    ]);
    return VolumeDescriptorHeader;
})();
var DirectoryRecordFlags;
(function (DirectoryRecordFlags) {
    DirectoryRecordFlags[DirectoryRecordFlags["Unknown1"] = 1 << 0] = "Unknown1";
    DirectoryRecordFlags[DirectoryRecordFlags["Directory"] = 1 << 1] = "Directory";
    DirectoryRecordFlags[DirectoryRecordFlags["Unknown2"] = 1 << 2] = "Unknown2";
    DirectoryRecordFlags[DirectoryRecordFlags["Unknown3"] = 1 << 3] = "Unknown3";
    DirectoryRecordFlags[DirectoryRecordFlags["Unknown4"] = 1 << 4] = "Unknown4";
    DirectoryRecordFlags[DirectoryRecordFlags["Unknown5"] = 1 << 5] = "Unknown5";
})(DirectoryRecordFlags || (DirectoryRecordFlags = {}));
var DirectoryRecord = (function () {
    function DirectoryRecord() {
        this.length = 0;
        this.extendedAttributeLength = 0;
        this.extent = 0;
        this.size = 0;
        this.date = new DirectoryRecordDate();
        this.flags = DirectoryRecordFlags.Directory;
        this.fileUnitSize = 0;
        this.interleave = 0;
        this.volumeSequenceNumber = 0;
        this.nameLength = 0;
        this.name = '';
    }
    Object.defineProperty(DirectoryRecord.prototype, "offset", {
        get: function () {
            return this.extent * SECTOR_SIZE;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DirectoryRecord.prototype, "isDirectory", {
        get: function () {
            return (this.flags & DirectoryRecordFlags.Directory) != 0;
        },
        enumerable: true,
        configurable: true
    });
    DirectoryRecord.struct = StructClass.create(DirectoryRecord, [
        { length: UInt8 },
        { extendedAttributeLength: UInt8 },
        { extent: UInt32_2lb },
        { size: UInt32_2lb },
        { date: DirectoryRecordDate.struct },
        { flags: UInt8 },
        { fileUnitSize: UInt8 },
        { interleave: UInt8 },
        { volumeSequenceNumber: UInt16_2lb },
        { nameLength: UInt8 },
    ]);
    return DirectoryRecord;
})();
var PrimaryVolumeDescriptor = (function () {
    function PrimaryVolumeDescriptor() {
    }
    PrimaryVolumeDescriptor.struct = StructClass.create(PrimaryVolumeDescriptor, [
        { header: VolumeDescriptorHeader.struct },
        { _pad1: UInt8 },
        { systemId: Stringz(0x20) },
        { volumeId: Stringz(0x20) },
        { _pad2: Int64 },
        { volumeSpaceSize: UInt32_2lb },
        { _pad3: StructArray(Int64, 4) },
        { volumeSetSize: UInt32 },
        { volumeSequenceNumber: UInt32 },
        { logicalBlockSize: UInt16_2lb },
        { pathTableSize: UInt32_2lb },
        { typeLPathTable: UInt32 },
        { optType1PathTable: UInt32 },
        { typeMPathTable: UInt32 },
        { optTypeMPathTable: UInt32 },
        { directoryRecord: DirectoryRecord.struct },
        { _pad4: UInt8 },
        { volumeSetId: Stringz(0x80) },
        { publisherId: Stringz(0x80) },
        { preparerId: Stringz(0x80) },
        { applicationId: Stringz(0x80) },
        { copyrightFileId: Stringz(37) },
        { abstractFileId: Stringz(37) },
        { bibliographicFileId: Stringz(37) },
        { creationDate: IsoStringDate.struct },
        { modificationDate: IsoStringDate.struct },
        { expirationDate: IsoStringDate.struct },
        { effectiveDate: IsoStringDate.struct },
        { fileStructureVersion: UInt8 },
        { pad5: UInt8 },
        { pad6: StructArray(UInt8, 0x200) },
        { pad7: StructArray(UInt8, 653) },
    ]);
    return PrimaryVolumeDescriptor;
})();
var IsoNode = (function () {
    function IsoNode(iso, directoryRecord, parent) {
        if (parent === void 0) { parent = null; }
        this.iso = iso;
        this.directoryRecord = directoryRecord;
        this.parent = parent;
        this.childs = [];
        this.childsByName = {};
    }
    Object.defineProperty(IsoNode.prototype, "isRoot", {
        get: function () {
            return this.parent == null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoNode.prototype, "size", {
        get: function () {
            return this.directoryRecord.size;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoNode.prototype, "path", {
        get: function () {
            return (this.parent && !this.parent.isRoot) ? (this.parent.path + '/' + this.name) : this.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoNode.prototype, "name", {
        get: function () {
            return this.directoryRecord.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoNode.prototype, "isDirectory", {
        get: function () {
            return this.directoryRecord.isDirectory;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoNode.prototype, "date", {
        get: function () {
            return this.directoryRecord.date.date;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IsoNode.prototype, "extent", {
        get: function () {
            return this.directoryRecord.extent;
        },
        enumerable: true,
        configurable: true
    });
    IsoNode.prototype.readChunkAsync = function (offset, count) {
        var fileBaseLow = this.directoryRecord.offset;
        var low = fileBaseLow + offset;
        var high = Math.min(low + count, fileBaseLow + this.size);
        return this.iso.readChunkAsync(low, high - low);
    };
    IsoNode.prototype.addChild = function (child) {
        this.childs.push(child);
        this.childsByName[child.name] = child;
    };
    IsoNode.prototype.toString = function () {
        return sprintf('IsoNode(%s, %d)', this.path, this.size);
    };
    return IsoNode;
})();
var Iso = (function () {
    function Iso() {
        this.date = new Date();
    }
    Object.defineProperty(Iso.prototype, "name", {
        get: function () {
            return this.asyncStream.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Iso.prototype, "root", {
        get: function () {
            return this._root;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Iso.prototype, "childrenByPath", {
        get: function () {
            return this._childrenByPath;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Iso.prototype, "children", {
        get: function () {
            return this._children.slice(0);
        },
        enumerable: true,
        configurable: true
    });
    Iso.fromStreamAsync = function (asyncStream) {
        return new Iso().loadAsync(asyncStream);
    };
    Iso.prototype.get = function (path) {
        path = path.replace(/^\/+/, '');
        var sce_file = path.match(/^sce_lbn(0x[0-9a-f]+|\d+)_size(0x[0-9a-f]+|\d+)$/i);
        if (sce_file) {
            var lba = parseIntFormat(sce_file[1]);
            var size = parseIntFormat(sce_file[2]);
            var dr = new DirectoryRecord();
            dr.extent = lba;
            dr.size = size;
            dr.name = '';
            //console.log(dr);
            return new IsoNode(this, dr, null);
        }
        if (path == '')
            return this.root;
        var node = this._childrenByPath[path];
        if (!node) {
            throw (new Error(sprintf("Can't find node '%s'", path)));
        }
        return node;
    };
    Object.defineProperty(Iso.prototype, "size", {
        get: function () {
            return this.asyncStream.size;
        },
        enumerable: true,
        configurable: true
    });
    Iso.prototype.readChunkAsync = function (offset, count) {
        return this.asyncStream.readChunkAsync(offset, count);
    };
    Iso.prototype.loadAsync = function (asyncStream) {
        var _this = this;
        this.asyncStream = asyncStream;
        this.date = asyncStream.date;
        if (PrimaryVolumeDescriptor.struct.length != SECTOR_SIZE)
            throw (sprintf("Invalid PrimaryVolumeDescriptor.struct size %d != %d", PrimaryVolumeDescriptor.struct.length, SECTOR_SIZE));
        return asyncStream.readChunkAsync(SECTOR_SIZE * 0x10, 0x800).then(function (arrayBuffer) {
            var stream = Stream.fromArrayBuffer(arrayBuffer);
            var pvd = PrimaryVolumeDescriptor.struct.read(stream);
            if (pvd.header.type != 1 /* PrimaryVolumeDescriptor */)
                throw ("Not an ISO file");
            if (pvd.header.id != 'CD001')
                throw ("Not an ISO file");
            _this._children = [];
            _this._childrenByPath = {};
            _this._root = new IsoNode(_this, pvd.directoryRecord);
            return _this.processDirectoryRecordAsync(_this._root).then(function () { return _this; });
        });
    };
    Iso.prototype.processDirectoryRecordAsync = function (parentIsoNode) {
        var _this = this;
        var directoryStart = parentIsoNode.directoryRecord.extent * SECTOR_SIZE;
        var directoryLength = parentIsoNode.directoryRecord.size;
        return this.asyncStream.readChunkAsync(directoryStart, directoryLength).then(function (data) {
            var directoryStream = Stream.fromArrayBuffer(data);
            while (directoryStream.available) {
                var directoryRecordSize = directoryStream.readUInt8();
                // Even if a directory spans multiple sectors, the directory entries are not permitted to cross the sector boundary (unlike the path table).
                // Where there is not enough space to record an entire directory entry at the end of a sector, that sector is zero-padded and the next
                // consecutive sector is used.
                if (directoryRecordSize == 0) {
                    directoryStream.position = MathUtils.nextAligned(directoryStream.position, SECTOR_SIZE);
                    continue;
                }
                directoryStream.position = directoryStream.position - 1;
                //Console.WriteLine("[{0}:{1:X}-{2:X}]", DirectoryRecordSize, DirectoryStream.Position, DirectoryStream.Position + DirectoryRecordSize);
                var directoryRecordStream = directoryStream.readStream(directoryRecordSize);
                var directoryRecord = DirectoryRecord.struct.read(directoryRecordStream);
                directoryRecord.name = directoryRecordStream.readStringz(directoryRecordStream.available);
                //Console.WriteLine("{0}", name); Console.ReadKey();
                if (directoryRecord.name == "" || directoryRecord.name == "\x01")
                    continue;
                //console.log(directoryRecord);
                //writefln("   %s", name);
                var child = new IsoNode(_this, directoryRecord, parentIsoNode);
                parentIsoNode.addChild(child);
                _this._children.push(child);
                _this._childrenByPath[child.path] = child;
            }
            var promiseGenerators = [];
            parentIsoNode.childs.forEach(function (child) {
                if (child.isDirectory) {
                    promiseGenerators.push(function () { return _this.processDirectoryRecordAsync(child); });
                }
            });
            return PromiseUtils.sequence(promiseGenerators);
        });
    };
    return Iso;
})();
exports.Iso = Iso;
//# sourceMappingURL=iso.js.map