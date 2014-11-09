///<reference path="../global.d.ts" />
var ZipEntry = (function () {
    function ZipEntry(zip, name, parent) {
        this.zip = zip;
        this.name = name;
        this.parent = parent;
        this.children = {};
        this.normalizedName = ZipEntry.normalizeString(name);
    }
    Object.defineProperty(ZipEntry.prototype, "size", {
        get: function () {
            return this.uncompressedSize;
        },
        enumerable: true,
        configurable: true
    });
    ZipEntry.prototype.getChildList = function () {
        var list = [];
        for (var key in this.children)
            list.push(this.children[key]);
        return list;
    };
    Object.defineProperty(ZipEntry.prototype, "date", {
        get: function () {
            var dosDate = this.zipDirEntry.dosDate;
            var dosTime = this.zipDirEntry.dosTime;
            var seconds = BitUtils.extract(dosTime, 0, 5) * 2;
            var minutes = BitUtils.extract(dosTime, 5, 6);
            var hours = BitUtils.extract(dosTime, 11, 6);
            var day = BitUtils.extract(dosDate, 0, 5);
            var month = BitUtils.extract(dosDate, 5, 4);
            var year = BitUtils.extract(dosDate, 9, 7) + 1980;
            return new Date(year, month - 1, day, hours, minutes, seconds);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ZipEntry.prototype, "compressedSize", {
        get: function () {
            return this.zipDirEntry.compressedSize;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ZipEntry.prototype, "uncompressedSize", {
        get: function () {
            return this.zipDirEntry.uncompressedSize;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ZipEntry.prototype, "compressionType", {
        get: function () {
            return this.zipDirEntry.compType;
        },
        enumerable: true,
        configurable: true
    });
    ZipEntry.normalizeString = function (string) {
        return string.toUpperCase();
    };
    ZipEntry.prototype.readRawCompressedAsync = function () {
        var _this = this;
        if (this.compressedData)
            return Promise.resolve(this.compressedData);
        return this.zip.zipStream.readChunkAsync(this.zipDirEntry.headerOffset, this.zipDirEntry.compressedSize + 1024).then(function (data) {
            var stream = Stream.fromArrayBuffer(data);
            var zipFileRecord = ZipFileRecord.struct.read(stream);
            return _this.compressedData = stream.readBytes(zipFileRecord.compressedSize);
        });
    };
    ZipEntry.prototype.readChunkAsync = function (offset, length) {
        return this.readAsync().then(function (data) {
            return ArrayBufferUtils.fromUInt8Array(data.subarray(offset, offset + length));
        });
    };
    ZipEntry.prototype.readAsync = function () {
        var _this = this;
        if (this.uncompressedData)
            return Promise.resolve(this.uncompressedData);
        return this.readRawCompressedAsync().then(function (data) {
            switch (_this.compressionType) {
                case 8 /* DEFLATE */:
                    return new Zlib.RawInflate(data).decompress();
                case 0 /* STORED */:
                    return data;
                default:
                    throw (new Error("Unsupported compression type '" + _this.compressionType + "'"));
            }
        }).then(function (data) {
            return _this.uncompressedData = data;
        });
    };
    ZipEntry.prototype.access = function (path, create, fullPath) {
        if (create === void 0) { create = false; }
        if (fullPath === void 0) { fullPath = null; }
        if (fullPath === null)
            fullPath = path;
        if (path == '')
            return this;
        if (path == '.')
            return this;
        if (path == '..')
            return this.parent || this;
        var pathIndex = path.indexOf('/');
        // Single component
        if (pathIndex < 0) {
            var normalizedName = ZipEntry.normalizeString(path);
            var child = this.children[normalizedName];
            if (!child) {
                if (!create) {
                    throw (new Error("ZIP: Can't access to path '" + fullPath + "'"));
                }
                else {
                    child = this.children[normalizedName] = new ZipEntry(this.zip, path, this);
                }
            }
            return child;
        }
        else {
            return this.access(path.substr(0, pathIndex), create, fullPath).access(path.substr(pathIndex + 1), create, fullPath);
        }
    };
    return ZipEntry;
})();
exports.ZipEntry = ZipEntry;
var Zip = (function () {
    function Zip(zipStream, zipDirEntries) {
        var _this = this;
        this.zipStream = zipStream;
        this.zipDirEntries = zipDirEntries;
        this.root = new ZipEntry(this, '', null);
        zipDirEntries.forEach(function (zipDirEntry) {
            var item = _this.root.access(zipDirEntry.fileName, true);
            item.isDirectory = (zipDirEntry.fileName.substr(-1, 1) == '/');
            item.zipDirEntry = zipDirEntry;
        });
        //console.log(this.root);
    }
    Zip.prototype.get = function (path) {
        return this.root.access(path);
    };
    Zip.prototype.has = function (path) {
        try {
            this.root.access(path);
            return true;
        }
        catch (e) {
            return false;
        }
    };
    Zip.fromStreamAsync = function (zipStream) {
        //console.info('zipStream', zipStream);
        return zipStream.readChunkAsync(zipStream.size - ZipEndLocator.struct.length, ZipEndLocator.struct.length).then(function (data) {
            var zipEndLocator = ZipEndLocator.struct.read(Stream.fromArrayBuffer(data));
            //console.log('zipEndLocator', zipEndLocator);
            return zipStream.readChunkAsync(zipEndLocator.directoryOffset, zipEndLocator.directorySize).then(function (data) {
                var dirEntries = StructArray(ZipDirEntry.struct, zipEndLocator.entriesInDirectory).read(Stream.fromArrayBuffer(data));
                return new Zip(zipStream, dirEntries);
            });
        });
    };
    return Zip;
})();
exports.Zip = Zip;
(function (ZipCompressionType) {
    ZipCompressionType[ZipCompressionType["STORED"] = 0] = "STORED";
    ZipCompressionType[ZipCompressionType["SHRUNK"] = 1] = "SHRUNK";
    ZipCompressionType[ZipCompressionType["REDUCED1"] = 2] = "REDUCED1";
    ZipCompressionType[ZipCompressionType["REDUCED2"] = 3] = "REDUCED2";
    ZipCompressionType[ZipCompressionType["REDUCED3"] = 4] = "REDUCED3";
    ZipCompressionType[ZipCompressionType["REDUCED4"] = 5] = "REDUCED4";
    ZipCompressionType[ZipCompressionType["IMPLODED"] = 6] = "IMPLODED";
    ZipCompressionType[ZipCompressionType["TOKEN"] = 7] = "TOKEN";
    ZipCompressionType[ZipCompressionType["DEFLATE"] = 8] = "DEFLATE";
    ZipCompressionType[ZipCompressionType["DEFLATE64"] = 9] = "DEFLATE64";
})(exports.ZipCompressionType || (exports.ZipCompressionType = {}));
var ZipCompressionType = exports.ZipCompressionType;
var ZipEndLocator = (function () {
    function ZipEndLocator() {
    }
    ZipEndLocator.struct = StructClass.create(ZipEndLocator, [
        { magic: UInt32 },
        { currentDiskNumber: UInt16 },
        { startDiskNumber: UInt16 },
        { entriesOnDisk: UInt16 },
        { entriesInDirectory: UInt16 },
        { directorySize: UInt32 },
        { directoryOffset: UInt32 },
        { commentLength: UInt16 },
    ]);
    return ZipEndLocator;
})();
exports.ZipEndLocator = ZipEndLocator;
var ZipFileRecord = (function () {
    function ZipFileRecord() {
    }
    ZipFileRecord.struct = StructClass.create(ZipFileRecord, [
        { magic: UInt32 },
        { version: UInt16 },
        { flags: UInt16 },
        { compType: UInt16 },
        { dosTime: UInt16 },
        { dosDate: UInt16 },
        { crc32: UInt32 },
        { compressedSize: UInt32 },
        { uncompressedSize: UInt32 },
        { fileNameLength: UInt16 },
        { extraFieldLength: UInt16 },
        { fileName: StringWithSize(function (context) { return context.fileNameLength; }) },
        { extraField: StringWithSize(function (context) { return context.extraFieldLength; }) },
    ]);
    return ZipFileRecord;
})();
exports.ZipFileRecord = ZipFileRecord;
var ZipDirEntry = (function () {
    function ZipDirEntry() {
    }
    ZipDirEntry.struct = StructClass.create(ZipDirEntry, [
        { magic: UInt32 },
        { versionMadeBy: UInt16 },
        { versionToExtract: UInt16 },
        { flags: UInt16 },
        { compType: UInt16 },
        { dosTime: UInt16 },
        { dosDate: UInt16 },
        { crc32: UInt32 },
        { compressedSize: UInt32 },
        { uncompressedSize: UInt32 },
        { fileNameLength: UInt16 },
        { extraFieldLength: UInt16 },
        { fileCommentsLength: UInt16 },
        { diskNumberStart: UInt16 },
        { internalAttributes: UInt16 },
        { externalAttributes: UInt32 },
        { headerOffset: UInt32 },
        { fileName: StringWithSize(function (context) { return context.fileNameLength; }) },
        { extraField: StringWithSize(function (context) { return context.extraFieldLength; }) },
        { fileComments: StringWithSize(function (context) { return context.fileCommentsLength; }) },
    ]);
    return ZipDirEntry;
})();
exports.ZipDirEntry = ZipDirEntry;
//# sourceMappingURL=zip.js.map