///<reference path="../global.d.ts" />
var DataType;
(function (DataType) {
    DataType[DataType["Binary"] = 0] = "Binary";
    DataType[DataType["Text"] = 2] = "Text";
    DataType[DataType["Int"] = 4] = "Int";
})(DataType || (DataType = {}));
var HeaderStruct = (function () {
    function HeaderStruct() {
    }
    HeaderStruct.struct = StructClass.create(HeaderStruct, [
        { magic: UInt32 },
        { version: UInt32 },
        { keyTable: UInt32 },
        { valueTable: UInt32 },
        { numberOfPairs: UInt32 },
    ]);
    return HeaderStruct;
})();
var EntryStruct = (function () {
    function EntryStruct() {
    }
    EntryStruct.struct = StructClass.create(EntryStruct, [
        { keyOffset: UInt16 },
        { unknown: UInt8 },
        { dataType: UInt8 },
        { valueSize: UInt32 },
        { valueSizePad: UInt32 },
        { valueOffset: UInt32 },
    ]);
    return EntryStruct;
})();
var Psf = (function () {
    function Psf() {
        this.entries = [];
        this.entriesByName = {};
    }
    Psf.fromStream = function (stream) {
        var psf = new Psf();
        psf.load(stream);
        return psf;
    };
    Psf.prototype.load = function (stream) {
        var header = this.header = HeaderStruct.struct.read(stream);
        if (header.magic != 0x46535000)
            throw ("Not a PSF file");
        var entries = StructArray(EntryStruct.struct, header.numberOfPairs).read(stream);
        var entriesByName = {};
        var keysStream = stream.sliceWithLength(header.keyTable);
        var valuesStream = stream.sliceWithLength(header.valueTable);
        entries.forEach(function (entry) {
            var key = keysStream.sliceWithLength(entry.keyOffset).readUtf8Stringz();
            var valueStream = valuesStream.sliceWithLength(entry.valueOffset, entry.valueSize);
            entry.key = key;
            switch (entry.dataType) {
                case 0 /* Binary */:
                    entry.value = valueStream.sliceWithLength(0);
                    break;
                case 4 /* Int */:
                    entry.value = valueStream.readInt32();
                    break;
                case 2 /* Text */:
                    entry.value = valueStream.readUtf8Stringz();
                    break;
                default:
                    throw (sprintf("Unknown dataType: %s", entry.dataType));
            }
            entriesByName[entry.key] = entry.value;
        });
        this.entries = entries;
        this.entriesByName = entriesByName;
    };
    return Psf;
})();
exports.Psf = Psf;
//# sourceMappingURL=psf.js.map