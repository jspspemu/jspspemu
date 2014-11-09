var _memory = require('../core/memory');
var _cpu = require('../core/cpu');
var _format_elf = require('../format/elf');
var _format_elf_dwarf = require('../format/elf_dwarf');
var NativeFunction = _cpu.NativeFunction;
var MipsAssembler = _cpu.MipsAssembler;
var Instruction = _cpu.Instruction;
var ElfLoader = _format_elf.ElfLoader;
var ElfSectionHeaderFlags = _format_elf.ElfSectionHeaderFlags;
var ElfSectionHeaderType = _format_elf.ElfSectionHeaderType;
var ElfReloc = _format_elf.ElfReloc;
var ElfRelocType = _format_elf.ElfRelocType;
var ElfProgramHeaderType = _format_elf.ElfProgramHeaderType;
var ElfDwarfLoader = _format_elf_dwarf.ElfDwarfLoader;
var console = logger.named('elf.psp');
var ElfPspModuleInfo = (function () {
    function ElfPspModuleInfo() {
    }
    // http://hitmen.c02.at/files/yapspd/psp_doc/chap26.html
    // 26.2.2.8
    ElfPspModuleInfo.struct = StructClass.create(ElfPspModuleInfo, [
        { moduleAtributes: UInt16 },
        { moduleVersion: UInt16 },
        { name: Stringz(28) },
        { gp: UInt32 },
        { exportsStart: UInt32 },
        { exportsEnd: UInt32 },
        { importsStart: UInt32 },
        { importsEnd: UInt32 },
    ]);
    return ElfPspModuleInfo;
})();
exports.ElfPspModuleInfo = ElfPspModuleInfo;
var ElfPspModuleImport = (function () {
    function ElfPspModuleImport() {
    }
    ElfPspModuleImport.struct = StructClass.create(ElfPspModuleImport, [
        { nameOffset: UInt32 },
        { version: UInt16 },
        { flags: UInt16 },
        { entrySize: UInt8 },
        { variableCount: UInt8 },
        { functionCount: UInt16 },
        { nidAddress: UInt32 },
        { callAddress: UInt32 },
    ]);
    return ElfPspModuleImport;
})();
exports.ElfPspModuleImport = ElfPspModuleImport;
var ElfPspModuleExport = (function () {
    function ElfPspModuleExport() {
    }
    ElfPspModuleExport.struct = StructClass.create(ElfPspModuleExport, [
        { name: UInt32 },
        { version: UInt16 },
        { flags: UInt16 },
        { entrySize: UInt8 },
        { variableCount: UInt8 },
        { functionCount: UInt16 },
        { exports: UInt32 },
    ]);
    return ElfPspModuleExport;
})();
exports.ElfPspModuleExport = ElfPspModuleExport;
(function (ElfPspModuleInfoAtributesEnum) {
    ElfPspModuleInfoAtributesEnum[ElfPspModuleInfoAtributesEnum["UserMode"] = 0x0000] = "UserMode";
    ElfPspModuleInfoAtributesEnum[ElfPspModuleInfoAtributesEnum["KernelMode"] = 0x100] = "KernelMode";
})(exports.ElfPspModuleInfoAtributesEnum || (exports.ElfPspModuleInfoAtributesEnum = {}));
var ElfPspModuleInfoAtributesEnum = exports.ElfPspModuleInfoAtributesEnum;
var InstructionReader = (function () {
    function InstructionReader(memory) {
        this.memory = memory;
    }
    InstructionReader.prototype.read = function (address) {
        return new Instruction(address, this.memory.readUInt32(address));
    };
    InstructionReader.prototype.write = function (address, instruction) {
        this.memory.writeInt32(address, instruction.data);
    };
    return InstructionReader;
})();
var PspElfLoader = (function () {
    function PspElfLoader(memory, memoryManager, moduleManager, syscallManager) {
        this.memory = memory;
        this.memoryManager = memoryManager;
        this.moduleManager = moduleManager;
        this.syscallManager = syscallManager;
        this.assembler = new MipsAssembler();
        this.baseAddress = 0;
    }
    PspElfLoader.prototype.load = function (stream) {
        //console.warn('PspElfLoader.load');
        this.elfLoader = ElfLoader.fromStream(stream);
        //ElfSectionHeaderFlags.Allocate
        this.allocateMemory();
        this.writeToMemory();
        this.relocateFromHeaders();
        this.readModuleInfo();
        this.updateModuleImports();
        this.elfDwarfLoader = new ElfDwarfLoader();
        this.elfDwarfLoader.parseElfLoader(this.elfLoader);
        //this.memory.dump(); debugger;
        //this.elfDwarfLoader.getSymbolAt();
        //logger.log(this.moduleInfo);
    };
    PspElfLoader.prototype.getSymbolAt = function (address) {
        return this.elfDwarfLoader.getSymbolAt(address);
    };
    PspElfLoader.prototype.getSectionHeaderMemoryStream = function (sectionHeader) {
        return this.memory.getPointerStream(this.baseAddress + sectionHeader.address, sectionHeader.size);
    };
    PspElfLoader.prototype.readModuleInfo = function () {
        this.moduleInfo = ElfPspModuleInfo.struct.read(this.getSectionHeaderMemoryStream(this.elfLoader.sectionHeadersByName['.rodata.sceModuleInfo']));
        this.moduleInfo.pc = this.baseAddress + this.elfLoader.header.entryPoint;
    };
    PspElfLoader.prototype.allocateMemory = function () {
        var _this = this;
        this.baseAddress = 0;
        if (this.elfLoader.needsRelocation) {
            this.baseAddress = this.memoryManager.userPartition.childPartitions.sortBy(function (partition) { return partition.size; }).reverse().first().low;
            this.baseAddress = MathUtils.nextAligned(this.baseAddress, 0x1000);
        }
        var lowest = 0xFFFFFFFF;
        var highest = 0;
        this.elfLoader.sectionHeaders.filter(function (section) { return ((section.flags & 2 /* Allocate */) != 0); }).forEach(function (section) {
            lowest = Math.min(lowest, (_this.baseAddress + section.address));
            highest = Math.max(highest, (_this.baseAddress + section.address + section.size));
        });
        this.elfLoader.programHeaders.forEach(function (program) {
            lowest = Math.min(lowest, (_this.baseAddress + program.virtualAddress));
            highest = Math.max(highest, (_this.baseAddress + program.virtualAddress + program.memorySize));
        });
        var memorySegment = this.memoryManager.userPartition.allocateSet(highest - lowest, lowest, 'Elf');
    };
    PspElfLoader.prototype.relocateFromHeaders = function () {
        var _this = this;
        var RelocProgramIndex = 0;
        this.elfLoader.programHeaders.forEach(function (programHeader) {
            switch (programHeader.type) {
                case 1879048352 /* Reloc1 */:
                    console.warn("SKIPPING Elf.ProgramHeader.TypeEnum.Reloc1!");
                    break;
                case 1879048353 /* Reloc2 */:
                    throw ("Not implemented");
            }
        });
        var RelocSectionIndex = 0;
        this.elfLoader.sectionHeaders.forEach(function (sectionHeader) {
            //RelocOutput.WriteLine("Section Header: %d : %s".Sprintf(RelocSectionIndex++, SectionHeader.ToString()));
            //console.info(sprintf('Section Header: '));
            switch (sectionHeader.type) {
                case 9 /* Relocation */:
                    console.log(sectionHeader);
                    console.error("Not implemented ElfSectionHeaderType.Relocation");
                    break;
                case ElfSectionHeaderType.PrxRelocation:
                    var relocs = StructArray(ElfReloc.struct, sectionHeader.stream.length / ElfReloc.struct.length).read(sectionHeader.stream);
                    _this.relocateRelocs(relocs);
                    break;
                case ElfSectionHeaderType.PrxRelocation_FW5:
                    throw ("Not implemented ElfSectionHeader.Type.PrxRelocation_FW5");
            }
        });
    };
    PspElfLoader.prototype.relocateRelocs = function (relocs) {
        var baseAddress = this.baseAddress;
        var hiValue;
        var deferredHi16 = [];
        var instructionReader = new InstructionReader(this.memory);
        for (var index = 0; index < relocs.length; index++) {
            var reloc = relocs[index];
            if (reloc.type == 255 /* StopRelocation */)
                break;
            var pointerBaseOffset = this.elfLoader.programHeaders[reloc.pointerSectionHeaderBase].virtualAddress;
            var pointeeBaseOffset = this.elfLoader.programHeaders[reloc.pointeeSectionHeaderBase].virtualAddress;
            // Address of data to relocate
            var RelocatedPointerAddress = (baseAddress + reloc.pointerAddress + pointerBaseOffset);
            // Value of data to relocate
            var instruction = instructionReader.read(RelocatedPointerAddress);
            var S = baseAddress + pointeeBaseOffset;
            var GP_ADDR = (baseAddress + reloc.pointerAddress);
            var GP_OFFSET = GP_ADDR - (baseAddress & 0xFFFF0000);
            switch (reloc.type) {
                case 0 /* None */:
                    break;
                case 1 /* Mips16 */:
                    instruction.u_imm16 += S;
                    break;
                case 2 /* Mips32 */:
                    instruction.data += S;
                    break;
                case 3 /* MipsRel32 */:
                    throw ("Not implemented MipsRel32");
                case 4 /* Mips26 */:
                    instruction.jump_real = instruction.jump_real + S;
                    break;
                case 5 /* MipsHi16 */:
                    hiValue = instruction.u_imm16;
                    deferredHi16.push(RelocatedPointerAddress);
                    break;
                case 6 /* MipsLo16 */:
                    var A = instruction.u_imm16;
                    instruction.u_imm16 = ((hiValue << 16) | (A & 0x0000FFFF)) + S;
                    deferredHi16.forEach(function (data_addr2) {
                        var data2 = instructionReader.read(data_addr2);
                        var result = ((data2.data & 0x0000FFFF) << 16) + A + S;
                        if ((A & 0x8000) != 0) {
                            result -= 0x10000;
                        }
                        if ((result & 0x8000) != 0) {
                            result += 0x10000;
                        }
                        data2.u_imm16 = (result >>> 16);
                        instructionReader.write(data_addr2, data2);
                    });
                    deferredHi16 = [];
                    break;
                case 7 /* MipsGpRel16 */:
                    break;
                default:
                    throw (new Error(sprintf("RelocType %d not implemented", reloc.type)));
            }
            instructionReader.write(RelocatedPointerAddress, instruction);
        }
    };
    PspElfLoader.prototype.writeToMemory = function () {
        var _this = this;
        var needsRelocate = this.elfLoader.needsRelocation;
        //var loadAddress = this.elfLoader.programHeaders[0].psysicalAddress;
        var loadAddress = this.baseAddress;
        console.info(sprintf("PspElfLoader: needsRelocate=%s, loadAddress=%08X", needsRelocate, loadAddress));
        //console.log(moduleInfo);
        this.elfLoader.programHeaders.filter(function (programHeader) { return (programHeader.type == 1); }).forEach(function (programHeader) {
            var fileOffset = programHeader.offset;
            var memOffset = _this.baseAddress + programHeader.virtualAddress;
            var fileSize = programHeader.fileSize;
            var memSize = programHeader.memorySize;
            _this.elfLoader.stream.sliceWithLength(fileOffset, fileSize).copyTo(_this.memory.getPointerStream(memOffset, fileSize));
            _this.memory.memset(memOffset + fileSize, 0, memSize - fileSize);
            //this.getSectionHeaderMemoryStream
            console.info('Program Header: ', sprintf("%08X:%08X, %08X:%08X", fileOffset, fileSize, memOffset, memSize));
        });
        this.elfLoader.sectionHeaders.filter(function (sectionHeader) { return ((sectionHeader.flags & 2 /* Allocate */) != 0); }).forEach(function (sectionHeader) {
            var low = loadAddress + sectionHeader.address;
            console.info('Section Header: ', sectionHeader, sprintf('LOW:%08X, SIZE:%08X', low, sectionHeader.size));
            switch (sectionHeader.type) {
                case 8 /* NoBits */:
                    for (var n = 0; n < sectionHeader.size; n++)
                        _this.memory.writeInt8(low + n, 0);
                    break;
                default:
                    break;
                case 1 /* ProgramBits */:
                    var stream = sectionHeader.stream;
                    var length = stream.length;
                    //console.log(sprintf('low: %08X, %08X, size: %08X', sectionHeader.address, low, stream.length));
                    _this.memory.writeStream(low, stream);
                    break;
            }
        });
    };
    PspElfLoader.prototype.updateModuleImports = function () {
        var _this = this;
        var moduleInfo = this.moduleInfo;
        console.log(moduleInfo);
        var importsBytesSize = moduleInfo.importsEnd - moduleInfo.importsStart;
        var importsStream = this.memory.sliceWithBounds(moduleInfo.importsStart, moduleInfo.importsEnd);
        var importsCount = importsBytesSize / ElfPspModuleImport.struct.length;
        var imports = StructArray(ElfPspModuleImport.struct, importsCount).read(importsStream);
        imports.forEach(function (_import) {
            _import.name = _this.memory.readStringz(_import.nameOffset);
            var imported = _this.updateModuleFunctions(_import);
            _this.updateModuleVars(_import);
            console.info('Imported: ', imported.name, imported.registeredNativeFunctions.map(function (i) { return i.name; }));
        });
        //console.log(imports);
    };
    PspElfLoader.prototype.updateModuleFunctions = function (moduleImport) {
        var _this = this;
        var _module = this.moduleManager.getByName(moduleImport.name);
        var nidsStream = this.memory.sliceWithSize(moduleImport.nidAddress, moduleImport.functionCount * 4);
        var callStream = this.memory.sliceWithSize(moduleImport.callAddress, moduleImport.functionCount * 8);
        var registeredNativeFunctions = [];
        var unknownFunctions = [];
        var registerN = function (nid, n) {
            var nfunc;
            nfunc = _module.getByNid(nid);
            if (!nfunc) {
                unknownFunctions.push(sprintf("'%s':0x%08X", _module.moduleName, nid));
                nfunc = new NativeFunction();
                nfunc.name = sprintf("%s:0x%08X", moduleImport.name, nid);
                nfunc.nid = nid;
                nfunc.firmwareVersion = 150;
                nfunc.nativeCall = function () {
                    console.info(_module);
                    throw (new Error("updateModuleFunctions: Not implemented '" + nfunc.name + "'"));
                };
                nfunc.call = function (context, state) {
                    nfunc.nativeCall();
                };
            }
            registeredNativeFunctions.push(nfunc);
            var syscallId = _this.syscallManager.register(nfunc);
            //printf("%s:%08X -> %s", moduleImport.name, nid, syscallId);
            return syscallId;
        };
        for (var n = 0; n < moduleImport.functionCount; n++) {
            var nid = nidsStream.readUInt32();
            var syscall = registerN(nid, n);
            callStream.writeInt32(this.assembler.assemble(0, sprintf('jr $31'))[0].data);
            callStream.writeInt32(this.assembler.assemble(0, sprintf('syscall %d', syscall))[0].data);
        }
        console.warn("Can't find functions", unknownFunctions);
        return {
            name: moduleImport.name,
            registeredNativeFunctions: registeredNativeFunctions,
        };
    };
    PspElfLoader.prototype.updateModuleVars = function (moduleImport) {
    };
    return PspElfLoader;
})();
exports.PspElfLoader = PspElfLoader;
//# sourceMappingURL=elf_psp.js.map