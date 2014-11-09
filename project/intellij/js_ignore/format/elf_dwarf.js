///<reference path="../global.d.ts" />
var console = logger.named('elf.dwarf');
// https://github.com/soywiz/pspemu/blob/master/src/pspemu/hle/elf/ElfDwarf.d
var Uleb128Class = (function () {
    function Uleb128Class() {
    }
    Uleb128Class.prototype.read = function (stream) {
        var val = 0;
        var b = 0x80;
        for (var shift = 0; ((stream.available) > 0 && (b & 0x80)); shift += 7) {
            b = stream.readUInt8();
            val |= (b & 0x7F) << shift;
        }
        return val;
    };
    Uleb128Class.prototype.write = function (stream, value) {
        throw (new Error("Not implemented"));
    };
    Object.defineProperty(Uleb128Class.prototype, "length", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    return Uleb128Class;
})();
var Uleb128 = new Uleb128Class();
var ElfDwarfHeader = (function () {
    function ElfDwarfHeader() {
    }
    Object.defineProperty(ElfDwarfHeader.prototype, "total_length_real", {
        get: function () {
            return this.total_length + 4;
        },
        enumerable: true,
        configurable: true
    });
    ElfDwarfHeader.struct = StructClass.create(ElfDwarfHeader, [
        { total_length: UInt32 },
        { version: UInt16 },
        { prologue_length: UInt32 },
        { minimum_instruction_length: UInt8 },
        { default_is_stmt: UInt8 },
        { line_base: Int8 },
        { line_range: UInt8 },
        { opcode_base: UInt8 },
    ]);
    return ElfDwarfHeader;
})();
var DW_LNS;
(function (DW_LNS) {
    DW_LNS[DW_LNS["extended_op"] = 0] = "extended_op";
    DW_LNS[DW_LNS["copy"] = 1] = "copy";
    DW_LNS[DW_LNS["advance_pc"] = 2] = "advance_pc";
    DW_LNS[DW_LNS["advance_line"] = 3] = "advance_line";
    DW_LNS[DW_LNS["set_file"] = 4] = "set_file";
    DW_LNS[DW_LNS["set_column"] = 5] = "set_column";
    DW_LNS[DW_LNS["negate_stmt"] = 6] = "negate_stmt";
    DW_LNS[DW_LNS["set_basic_block"] = 7] = "set_basic_block";
    DW_LNS[DW_LNS["const_add_pc"] = 8] = "const_add_pc";
    DW_LNS[DW_LNS["fixed_advance_pc"] = 9] = "fixed_advance_pc";
})(DW_LNS || (DW_LNS = {}));
var DW_LNE;
(function (DW_LNE) {
    DW_LNE[DW_LNE["end_sequence"] = 1] = "end_sequence";
    DW_LNE[DW_LNE["set_address"] = 2] = "set_address";
    DW_LNE[DW_LNE["define_file"] = 3] = "define_file";
})(DW_LNE || (DW_LNE = {}));
// 6.2.2 State Machine Registers
/*
class State {
    uint address = 0;
    uint file = 1;
    uint line = 1;
    uint column = 0;
    bool is_stmt = false; // Must be setted by the header.
    bool basic_block = false;
    bool end_sequence = false;
    FileEntry * file_entry;

    string file_full_path() { return file_entry.full_path; }

    //writefln("DW_LNS_copy: %08X, %s/%s:%d", state.address, directories[files[state.file].directory_index], files[state.file].name, state.line);
    string toString() {
        //return std.string.format("%08X: is_stmt(%d) basic_block(%d) end_sequence(%d) '%s':%d:%d ", address, is_stmt, basic_block, end_sequence, file_entry.full_path, line, column);
        return std.string.format("%08X: '%s':%d:%d ", address, file_entry.full_path, line, column);
    }
}
*/
var FileEntry = (function () {
    function FileEntry() {
        this.name = '';
        this.directory = '';
        this.directory_index = 0;
        this.time_mod = 0;
        this.size = 0;
    }
    FileEntry.prototype.full_path = function () {
        if (this.directory.length) {
            return this.directory + "/" + this.name;
        }
        else {
            return name;
        }
    };
    FileEntry.struct = StructClass.create(FileEntry, [
        { name: StringzVariable },
        { directory_index: Uleb128 },
        { time_mod: Uleb128 },
        { size: Uleb128 },
    ]);
    return FileEntry;
})();
var ElfSymbol = (function () {
    function ElfSymbol() {
        this.name = '';
        this.index = -1;
        this.nameIndex = 0;
        this.value = 0;
        this.size = 0;
        this.info = 0;
        this.other = 0;
        this.shndx = 0;
    }
    Object.defineProperty(ElfSymbol.prototype, "type", {
        get: function () {
            return BitUtils.extract(this.info, 0, 4);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfSymbol.prototype, "bind", {
        get: function () {
            return BitUtils.extract(this.info, 4, 4);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfSymbol.prototype, "typeName", {
        get: function () {
            return SymInfoType[this.type];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfSymbol.prototype, "bindName", {
        get: function () {
            return SymInfoBind[this.bind];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfSymbol.prototype, "address", {
        get: function () {
            return this.value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfSymbol.prototype, "low", {
        get: function () {
            return this.value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfSymbol.prototype, "high", {
        get: function () {
            return this.value + this.size;
        },
        enumerable: true,
        configurable: true
    });
    ElfSymbol.prototype.toString = function () {
        return sprintf('ElfSymbol("%s", %08X-%08X)', this.name, this.low, this.high);
    };
    ElfSymbol.prototype.contains = function (address) {
        return (address >= this.low) && (address < (this.high));
    };
    ElfSymbol.struct = StructClass.create(ElfSymbol, [
        { nameIndex: UInt32 },
        { value: UInt32 },
        { size: UInt32 },
        { info: UInt8 },
        { other: UInt8 },
        { shndx: UInt16 },
    ]);
    return ElfSymbol;
})();
exports.ElfSymbol = ElfSymbol;
(function (SymInfoBind) {
    SymInfoBind[SymInfoBind["LOCAL"] = 0] = "LOCAL";
    SymInfoBind[SymInfoBind["GLOBAL"] = 1] = "GLOBAL";
    SymInfoBind[SymInfoBind["WEAK"] = 2] = "WEAK";
    SymInfoBind[SymInfoBind["OS_1"] = 10] = "OS_1";
    SymInfoBind[SymInfoBind["OS_2"] = 11] = "OS_2";
    SymInfoBind[SymInfoBind["OS_3"] = 12] = "OS_3";
    SymInfoBind[SymInfoBind["PROC_1"] = 13] = "PROC_1";
    SymInfoBind[SymInfoBind["PROC_2"] = 14] = "PROC_2";
    SymInfoBind[SymInfoBind["PROC_3"] = 15] = "PROC_3";
})(exports.SymInfoBind || (exports.SymInfoBind = {}));
var SymInfoBind = exports.SymInfoBind;
(function (SymInfoType) {
    SymInfoType[SymInfoType["NOTYPE"] = 0] = "NOTYPE";
    SymInfoType[SymInfoType["OBJECT"] = 1] = "OBJECT";
    SymInfoType[SymInfoType["FUNC"] = 2] = "FUNC";
    SymInfoType[SymInfoType["SECTION"] = 3] = "SECTION";
    SymInfoType[SymInfoType["FILE"] = 4] = "FILE";
    SymInfoType[SymInfoType["OS_1"] = 10] = "OS_1";
    SymInfoType[SymInfoType["OS_2"] = 11] = "OS_2";
    SymInfoType[SymInfoType["OS_3"] = 12] = "OS_3";
    SymInfoType[SymInfoType["PROC_1"] = 13] = "PROC_1";
    SymInfoType[SymInfoType["PROC_2"] = 14] = "PROC_2";
    SymInfoType[SymInfoType["PROC_3"] = 15] = "PROC_3";
})(exports.SymInfoType || (exports.SymInfoType = {}));
var SymInfoType = exports.SymInfoType;
var ElfDwarfLoader = (function () {
    function ElfDwarfLoader() {
        this.symbolEntries = [];
    }
    ElfDwarfLoader.prototype.parseElfLoader = function (elf) {
        //this.parseDebugLine(elf);
        this.parseSymtab(elf);
    };
    ElfDwarfLoader.prototype.parseSymtab = function (elf) {
        console.log('ElfDwarfLoader.parseSymtab');
        var symtabHeader = elf.sectionHeadersByName[".symtab"];
        if (!symtabHeader)
            return;
        var nameSection = elf.sectionHeaders[symtabHeader.link];
        var nameStream = nameSection.stream.sliceWithLength(0);
        var stream = symtabHeader.stream.sliceWithLength(0);
        var n = 0;
        try {
            while (stream.available > 0) {
                var entry = ElfSymbol.struct.read(stream);
                entry.name = nameStream.sliceWithLength(entry.nameIndex).readStringz();
                entry.index = n;
                this.symbolEntries.push(entry);
                n++;
            }
        }
        catch (e) {
            console.warn(e);
        }
        this.symbolEntries.sortBy(function (item) { return item.value; });
    };
    ElfDwarfLoader.prototype.getSymbolAt = function (address) {
        for (var n = 0; n < this.symbolEntries.length; n++) {
            var entry = this.symbolEntries[n];
            if (entry.contains(address))
                return entry;
        }
        /*
        return this.symbolEntries.binarySearchValue((item) => {
            if (address < item.value) return +1;
            if (address >= item.value + item.size) return -1;
            return 0;
        });
        */
        return null;
    };
    ElfDwarfLoader.prototype.parseDebugLine = function (elf) {
        console.log('ElfDwarfLoader.parseDebugLine');
        console.log(sectionHeader);
        var sectionHeader = elf.sectionHeadersByName[".debug_line"];
        var stream = sectionHeader.stream.sliceWithLength(0);
        var header = ElfDwarfHeader.struct.read(stream);
        console.log(header);
        var opcodes = StructArray(Uleb128, header.opcode_base).read(stream);
        console.log(opcodes);
        while (stream.available > 0) {
            console.log('item:');
            var item = StringzVariable.read(stream);
            if (!item.length)
                break;
            console.log(item);
        }
        while (stream.available > 0) {
            var entry = FileEntry.struct.read(stream);
            console.log(entry);
            if (!entry.name.length)
                break;
        }
    };
    return ElfDwarfLoader;
})();
exports.ElfDwarfLoader = ElfDwarfLoader;
//# sourceMappingURL=elf_dwarf.js.map