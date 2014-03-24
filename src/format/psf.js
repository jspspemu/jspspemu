var format;
(function (format) {
    (function (_psf) {
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
                { type: UInt32, name: 'magic' },
                { type: UInt32, name: 'version' },
                { type: UInt32, name: 'keyTable' },
                { type: UInt32, name: 'valueTable' },
                { type: UInt32, name: 'numberOfPairs' }
            ]);
            return HeaderStruct;
        })();

        var EntryStruct = (function () {
            function EntryStruct() {
            }
            EntryStruct.struct = StructClass.create(EntryStruct, [
                { type: UInt16, name: 'keyOffset' },
                { type: UInt8, name: 'unknown' },
                { type: UInt8, name: 'dataType' },
                { type: UInt32, name: 'valueSize' },
                { type: UInt32, name: 'valueSizePad' },
                { type: UInt32, name: 'valueOffset' }
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
                var entries = StructArray.create(EntryStruct.struct, header.numberOfPairs).read(stream);
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
        _psf.Psf = Psf;
    })(format.psf || (format.psf = {}));
    var psf = format.psf;
})(format || (format = {}));
//# sourceMappingURL=psf.js.map
