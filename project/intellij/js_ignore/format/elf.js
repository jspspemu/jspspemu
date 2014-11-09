///<reference path="../global.d.ts" />
var _memory = require('../core/memory');
var Memory = _memory.Memory;
var console = logger.named('elf');
var ElfHeader = (function () {
    function ElfHeader() {
    }
    Object.defineProperty(ElfHeader.prototype, "hasValidMagic", {
        get: function () {
            return this.magic == String.fromCharCode(0x7F) + 'ELF';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfHeader.prototype, "hasValidMachine", {
        get: function () {
            return this.machine == 8 /* ALLEGREX */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfHeader.prototype, "hasValidType", {
        get: function () {
            return [2 /* Executable */, 65440 /* Prx */].indexOf(this.type) >= 0;
        },
        enumerable: true,
        configurable: true
    });
    ElfHeader.struct = StructClass.create(ElfHeader, [
        { magic: Stringn(4) },
        { class: Int8 },
        { data: Int8 },
        { idVersion: Int8 },
        { _padding: StructArray(Int8, 9) },
        { type: UInt16 },
        { machine: Int16 },
        { version: Int32 },
        { entryPoint: Int32 },
        { programHeaderOffset: Int32 },
        { sectionHeaderOffset: Int32 },
        { flags: Int32 },
        { elfHeaderSize: Int16 },
        { programHeaderEntrySize: Int16 },
        { programHeaderCount: Int16 },
        { sectionHeaderEntrySize: Int16 },
        { sectionHeaderCount: Int16 },
        { sectionHeaderStringTable: Int16 },
    ]);
    return ElfHeader;
})();
exports.ElfHeader = ElfHeader;
var ElfProgramHeader = (function () {
    function ElfProgramHeader() {
    }
    ElfProgramHeader.struct = StructClass.create(ElfProgramHeader, [
        { type: UInt32 },
        { offset: UInt32 },
        { virtualAddress: UInt32 },
        { psysicalAddress: UInt32 },
        { fileSize: UInt32 },
        { memorySize: UInt32 },
        { flags: UInt32 },
        { alignment: UInt32 },
    ]);
    return ElfProgramHeader;
})();
exports.ElfProgramHeader = ElfProgramHeader;
var ElfSectionHeader = (function () {
    function ElfSectionHeader() {
        this.stream = null;
    }
    ElfSectionHeader.struct = StructClass.create(ElfSectionHeader, [
        { nameOffset: UInt32 },
        { type: UInt32 },
        { flags: UInt32 },
        { address: UInt32 },
        { offset: UInt32 },
        { size: UInt32 },
        { link: UInt32 },
        { info: UInt32 },
        { addressAlign: UInt32 },
        { entitySize: UInt32 },
    ]);
    return ElfSectionHeader;
})();
exports.ElfSectionHeader = ElfSectionHeader;
(function (ElfProgramHeaderType) {
    ElfProgramHeaderType[ElfProgramHeaderType["NoLoad"] = 0] = "NoLoad";
    ElfProgramHeaderType[ElfProgramHeaderType["Load"] = 1] = "Load";
    ElfProgramHeaderType[ElfProgramHeaderType["Reloc1"] = 0x700000A0] = "Reloc1";
    ElfProgramHeaderType[ElfProgramHeaderType["Reloc2"] = 0x700000A1] = "Reloc2";
})(exports.ElfProgramHeaderType || (exports.ElfProgramHeaderType = {}));
var ElfProgramHeaderType = exports.ElfProgramHeaderType;
(function (ElfSectionHeaderType) {
    ElfSectionHeaderType[ElfSectionHeaderType["Null"] = 0] = "Null";
    ElfSectionHeaderType[ElfSectionHeaderType["ProgramBits"] = 1] = "ProgramBits";
    ElfSectionHeaderType[ElfSectionHeaderType["SYMTAB"] = 2] = "SYMTAB";
    ElfSectionHeaderType[ElfSectionHeaderType["STRTAB"] = 3] = "STRTAB";
    ElfSectionHeaderType[ElfSectionHeaderType["RELA"] = 4] = "RELA";
    ElfSectionHeaderType[ElfSectionHeaderType["HASH"] = 5] = "HASH";
    ElfSectionHeaderType[ElfSectionHeaderType["DYNAMIC"] = 6] = "DYNAMIC";
    ElfSectionHeaderType[ElfSectionHeaderType["NOTE"] = 7] = "NOTE";
    ElfSectionHeaderType[ElfSectionHeaderType["NoBits"] = 8] = "NoBits";
    ElfSectionHeaderType[ElfSectionHeaderType["Relocation"] = 9] = "Relocation";
    ElfSectionHeaderType[ElfSectionHeaderType["SHLIB"] = 10] = "SHLIB";
    ElfSectionHeaderType[ElfSectionHeaderType["DYNSYM"] = 11] = "DYNSYM";
    ElfSectionHeaderType[ElfSectionHeaderType["LOPROC"] = 0x70000000] = "LOPROC";
    ElfSectionHeaderType[ElfSectionHeaderType["HIPROC"] = 0x7FFFFFFF] = "HIPROC";
    ElfSectionHeaderType[ElfSectionHeaderType["LOUSER"] = 0x80000000] = "LOUSER";
    ElfSectionHeaderType[ElfSectionHeaderType["HIUSER"] = 0xFFFFFFFF] = "HIUSER";
    ElfSectionHeaderType[ElfSectionHeaderType["PrxRelocation"] = (ElfSectionHeaderType.LOPROC | 0xA0)] = "PrxRelocation";
    ElfSectionHeaderType[ElfSectionHeaderType["PrxRelocation_FW5"] = (ElfSectionHeaderType.LOPROC | 0xA1)] = "PrxRelocation_FW5";
})(exports.ElfSectionHeaderType || (exports.ElfSectionHeaderType = {}));
var ElfSectionHeaderType = exports.ElfSectionHeaderType;
(function (ElfSectionHeaderFlags) {
    ElfSectionHeaderFlags[ElfSectionHeaderFlags["None"] = 0] = "None";
    ElfSectionHeaderFlags[ElfSectionHeaderFlags["Write"] = 1] = "Write";
    ElfSectionHeaderFlags[ElfSectionHeaderFlags["Allocate"] = 2] = "Allocate";
    ElfSectionHeaderFlags[ElfSectionHeaderFlags["Execute"] = 4] = "Execute";
})(exports.ElfSectionHeaderFlags || (exports.ElfSectionHeaderFlags = {}));
var ElfSectionHeaderFlags = exports.ElfSectionHeaderFlags;
(function (ElfProgramHeaderFlags) {
    ElfProgramHeaderFlags[ElfProgramHeaderFlags["Executable"] = 0x1] = "Executable";
    // Note: demo PRX's were found to be not writable
    ElfProgramHeaderFlags[ElfProgramHeaderFlags["Writable"] = 0x2] = "Writable";
    ElfProgramHeaderFlags[ElfProgramHeaderFlags["Readable"] = 0x4] = "Readable";
})(exports.ElfProgramHeaderFlags || (exports.ElfProgramHeaderFlags = {}));
var ElfProgramHeaderFlags = exports.ElfProgramHeaderFlags;
(function (ElfType) {
    ElfType[ElfType["Executable"] = 0x0002] = "Executable";
    ElfType[ElfType["Prx"] = 0xFFA0] = "Prx";
})(exports.ElfType || (exports.ElfType = {}));
var ElfType = exports.ElfType;
(function (ElfMachine) {
    ElfMachine[ElfMachine["ALLEGREX"] = 8] = "ALLEGREX";
})(exports.ElfMachine || (exports.ElfMachine = {}));
var ElfMachine = exports.ElfMachine;
(function (ElfPspModuleFlags) {
    ElfPspModuleFlags[ElfPspModuleFlags["User"] = 0x0000] = "User";
    ElfPspModuleFlags[ElfPspModuleFlags["Kernel"] = 0x1000] = "Kernel";
})(exports.ElfPspModuleFlags || (exports.ElfPspModuleFlags = {}));
var ElfPspModuleFlags = exports.ElfPspModuleFlags;
(function (ElfPspLibFlags) {
    ElfPspLibFlags[ElfPspLibFlags["DirectJump"] = 0x0001] = "DirectJump";
    ElfPspLibFlags[ElfPspLibFlags["Syscall"] = 0x4000] = "Syscall";
    ElfPspLibFlags[ElfPspLibFlags["SysLib"] = 0x8000] = "SysLib";
})(exports.ElfPspLibFlags || (exports.ElfPspLibFlags = {}));
var ElfPspLibFlags = exports.ElfPspLibFlags;
(function (ElfPspModuleNids) {
    ElfPspModuleNids[ElfPspModuleNids["MODULE_INFO"] = 0xF01D73A7] = "MODULE_INFO";
    ElfPspModuleNids[ElfPspModuleNids["MODULE_BOOTSTART"] = 0xD3744BE0] = "MODULE_BOOTSTART";
    ElfPspModuleNids[ElfPspModuleNids["MODULE_REBOOT_BEFORE"] = 0x2F064FA6] = "MODULE_REBOOT_BEFORE";
    ElfPspModuleNids[ElfPspModuleNids["MODULE_START"] = 0xD632ACDB] = "MODULE_START";
    ElfPspModuleNids[ElfPspModuleNids["MODULE_START_THREAD_PARAMETER"] = 0x0F7C276C] = "MODULE_START_THREAD_PARAMETER";
    ElfPspModuleNids[ElfPspModuleNids["MODULE_STOP"] = 0xCEE8593C] = "MODULE_STOP";
    ElfPspModuleNids[ElfPspModuleNids["MODULE_STOP_THREAD_PARAMETER"] = 0xCF0CC697] = "MODULE_STOP_THREAD_PARAMETER";
})(exports.ElfPspModuleNids || (exports.ElfPspModuleNids = {}));
var ElfPspModuleNids = exports.ElfPspModuleNids;
(function (ElfRelocType) {
    ElfRelocType[ElfRelocType["None"] = 0] = "None";
    ElfRelocType[ElfRelocType["Mips16"] = 1] = "Mips16";
    ElfRelocType[ElfRelocType["Mips32"] = 2] = "Mips32";
    ElfRelocType[ElfRelocType["MipsRel32"] = 3] = "MipsRel32";
    ElfRelocType[ElfRelocType["Mips26"] = 4] = "Mips26";
    ElfRelocType[ElfRelocType["MipsHi16"] = 5] = "MipsHi16";
    ElfRelocType[ElfRelocType["MipsLo16"] = 6] = "MipsLo16";
    ElfRelocType[ElfRelocType["MipsGpRel16"] = 7] = "MipsGpRel16";
    ElfRelocType[ElfRelocType["MipsLiteral"] = 8] = "MipsLiteral";
    ElfRelocType[ElfRelocType["MipsGot16"] = 9] = "MipsGot16";
    ElfRelocType[ElfRelocType["MipsPc16"] = 10] = "MipsPc16";
    ElfRelocType[ElfRelocType["MipsCall16"] = 11] = "MipsCall16";
    ElfRelocType[ElfRelocType["MipsGpRel32"] = 12] = "MipsGpRel32";
    ElfRelocType[ElfRelocType["StopRelocation"] = 0xFF] = "StopRelocation";
})(exports.ElfRelocType || (exports.ElfRelocType = {}));
var ElfRelocType = exports.ElfRelocType;
var ElfReloc = (function () {
    function ElfReloc() {
    }
    Object.defineProperty(ElfReloc.prototype, "pointeeSectionHeaderBase", {
        get: function () {
            return (this.info >> 16) & 0xFF;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfReloc.prototype, "pointerSectionHeaderBase", {
        get: function () {
            return (this.info >> 8) & 0xFF;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfReloc.prototype, "type", {
        get: function () {
            return ((this.info >> 0) & 0xFF);
        },
        enumerable: true,
        configurable: true
    });
    ElfReloc.struct = StructClass.create(ElfReloc, [
        { pointerAddress: UInt32 },
        { info: UInt32 },
    ]);
    return ElfReloc;
})();
exports.ElfReloc = ElfReloc;
var ElfLoader = (function () {
    function ElfLoader() {
        this.header = null;
        this.stream = null;
    }
    ElfLoader.prototype.load = function (stream) {
        var _this = this;
        this.stream = stream;
        this.readAndCheckHeaders(stream);
        var programHeadersStream = stream.sliceWithLength(this.header.programHeaderOffset, this.header.programHeaderCount * this.header.programHeaderEntrySize);
        var sectionHeadersStream = stream.sliceWithLength(this.header.sectionHeaderOffset, this.header.sectionHeaderCount * this.header.sectionHeaderEntrySize);
        this.programHeaders = StructArray(ElfProgramHeader.struct, this.header.programHeaderCount).read(programHeadersStream);
        this.sectionHeaders = StructArray(ElfSectionHeader.struct, this.header.sectionHeaderCount).read(sectionHeadersStream);
        this.sectionHeaderStringTable = this.sectionHeaders[this.header.sectionHeaderStringTable];
        this.stringTableStream = this.getSectionHeaderFileStream(this.sectionHeaderStringTable);
        this.sectionHeadersByName = {};
        this.sectionHeaders.forEach(function (sectionHeader) {
            var name = _this.getStringFromStringTable(sectionHeader.nameOffset);
            sectionHeader.name = name;
            if (sectionHeader.type != 0 /* Null */) {
                sectionHeader.stream = _this.getSectionHeaderFileStream(sectionHeader);
            }
            _this.sectionHeadersByName[name] = sectionHeader;
        });
        console.log(this.sectionHeadersByName);
    };
    ElfLoader.prototype.readAndCheckHeaders = function (stream) {
        this.stream = stream;
        var header = this.header = ElfHeader.struct.read(stream);
        if (!header.hasValidMagic)
            throw ('Not an ELF file');
        if (!header.hasValidMachine)
            throw ('Not a PSP ELF file');
        if (!header.hasValidType)
            throw ('Not a executable or a Prx but has type ' + header.type);
    };
    ElfLoader.prototype.getStringFromStringTable = function (index) {
        this.stringTableStream.position = index;
        return this.stringTableStream.readStringz();
    };
    ElfLoader.prototype.getSectionHeaderFileStream = function (sectionHeader) {
        switch (sectionHeader.type) {
            case 8 /* NoBits */:
            case 0 /* Null */:
                return this.stream.sliceWithLength(0, 0);
                break;
            default:
                return this.stream.sliceWithLength(sectionHeader.offset, sectionHeader.size);
        }
    };
    ElfLoader.fromStream = function (stream) {
        var elf = new ElfLoader();
        elf.load(stream);
        return elf;
    };
    Object.defineProperty(ElfLoader.prototype, "isPrx", {
        get: function () {
            return (this.header.type & 65440 /* Prx */) != 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElfLoader.prototype, "needsRelocation", {
        get: function () {
            return this.isPrx || (this.header.entryPoint < Memory.MAIN_OFFSET);
        },
        enumerable: true,
        configurable: true
    });
    return ElfLoader;
})();
exports.ElfLoader = ElfLoader;
//# sourceMappingURL=elf.js.map