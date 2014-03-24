var hle;
(function (hle) {
    (function (_elf) {
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
                { type: Stringn(4), name: 'magic' },
                { type: Int8, name: 'class' },
                { type: Int8, name: 'data' },
                { type: Int8, name: 'idVersion' },
                { type: StructArray.create(Int8, 9), name: '_padding' },
                { type: UInt16, name: 'type' },
                { type: Int16, name: 'machine' },
                { type: Int32, name: 'version' },
                { type: Int32, name: 'entryPoint' },
                { type: Int32, name: 'programHeaderOffset' },
                { type: Int32, name: 'sectionHeaderOffset' },
                { type: Int32, name: 'flags' },
                { type: Int16, name: 'elfHeaderSize' },
                { type: Int16, name: 'programHeaderEntrySize' },
                { type: Int16, name: 'programHeaderCount' },
                { type: Int16, name: 'sectionHeaderEntrySize' },
                { type: Int16, name: 'sectionHeaderCount' },
                { type: Int16, name: 'sectionHeaderStringTable' }
            ]);
            return ElfHeader;
        })();

        var ElfProgramHeader = (function () {
            function ElfProgramHeader() {
            }
            ElfProgramHeader.struct = StructClass.create(ElfProgramHeader, [
                { type: UInt32, name: 'type' },
                { type: UInt32, name: 'offset' },
                { type: UInt32, name: 'virtualAddress' },
                { type: UInt32, name: 'psysicalAddress' },
                { type: UInt32, name: 'fileSize' },
                { type: UInt32, name: 'memorySize' },
                { type: UInt32, name: 'flags' },
                { type: UInt32, name: 'alignment' }
            ]);
            return ElfProgramHeader;
        })();

        var ElfSectionHeader = (function () {
            function ElfSectionHeader() {
                this.stream = null;
            }
            ElfSectionHeader.struct = StructClass.create(ElfSectionHeader, [
                { type: UInt32, name: 'nameOffset' },
                { type: UInt32, name: 'type' },
                { type: UInt32, name: 'flags' },
                { type: UInt32, name: 'address' },
                { type: UInt32, name: 'offset' },
                { type: UInt32, name: 'size' },
                { type: UInt32, name: 'link' },
                { type: UInt32, name: 'info' },
                { type: UInt32, name: 'addressAlign' },
                { type: UInt32, name: 'entitySize' }
            ]);
            return ElfSectionHeader;
        })();

        var ElfProgramHeaderType;
        (function (ElfProgramHeaderType) {
            ElfProgramHeaderType[ElfProgramHeaderType["NoLoad"] = 0] = "NoLoad";
            ElfProgramHeaderType[ElfProgramHeaderType["Load"] = 1] = "Load";
            ElfProgramHeaderType[ElfProgramHeaderType["Reloc1"] = 0x700000A0] = "Reloc1";
            ElfProgramHeaderType[ElfProgramHeaderType["Reloc2"] = 0x700000A1] = "Reloc2";
        })(ElfProgramHeaderType || (ElfProgramHeaderType = {}));

        var ElfSectionHeaderType;
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
        })(ElfSectionHeaderType || (ElfSectionHeaderType = {}));

        var ElfSectionHeaderFlags;
        (function (ElfSectionHeaderFlags) {
            ElfSectionHeaderFlags[ElfSectionHeaderFlags["None"] = 0] = "None";
            ElfSectionHeaderFlags[ElfSectionHeaderFlags["Write"] = 1] = "Write";
            ElfSectionHeaderFlags[ElfSectionHeaderFlags["Allocate"] = 2] = "Allocate";
            ElfSectionHeaderFlags[ElfSectionHeaderFlags["Execute"] = 4] = "Execute";
        })(ElfSectionHeaderFlags || (ElfSectionHeaderFlags = {}));

        var ElfProgramHeaderFlags;
        (function (ElfProgramHeaderFlags) {
            ElfProgramHeaderFlags[ElfProgramHeaderFlags["Executable"] = 0x1] = "Executable";

            // Note: demo PRX's were found to be not writable
            ElfProgramHeaderFlags[ElfProgramHeaderFlags["Writable"] = 0x2] = "Writable";
            ElfProgramHeaderFlags[ElfProgramHeaderFlags["Readable"] = 0x4] = "Readable";
        })(ElfProgramHeaderFlags || (ElfProgramHeaderFlags = {}));

        var ElfType;
        (function (ElfType) {
            ElfType[ElfType["Executable"] = 0x0002] = "Executable";
            ElfType[ElfType["Prx"] = 0xFFA0] = "Prx";
        })(ElfType || (ElfType = {}));

        var ElfMachine;
        (function (ElfMachine) {
            ElfMachine[ElfMachine["ALLEGREX"] = 8] = "ALLEGREX";
        })(ElfMachine || (ElfMachine = {}));

        var ElfPspModuleFlags;
        (function (ElfPspModuleFlags) {
            ElfPspModuleFlags[ElfPspModuleFlags["User"] = 0x0000] = "User";
            ElfPspModuleFlags[ElfPspModuleFlags["Kernel"] = 0x1000] = "Kernel";
        })(ElfPspModuleFlags || (ElfPspModuleFlags = {}));

        var ElfPspLibFlags;
        (function (ElfPspLibFlags) {
            ElfPspLibFlags[ElfPspLibFlags["DirectJump"] = 0x0001] = "DirectJump";
            ElfPspLibFlags[ElfPspLibFlags["Syscall"] = 0x4000] = "Syscall";
            ElfPspLibFlags[ElfPspLibFlags["SysLib"] = 0x8000] = "SysLib";
        })(ElfPspLibFlags || (ElfPspLibFlags = {}));

        var ElfPspModuleNids;
        (function (ElfPspModuleNids) {
            ElfPspModuleNids[ElfPspModuleNids["MODULE_INFO"] = 0xF01D73A7] = "MODULE_INFO";
            ElfPspModuleNids[ElfPspModuleNids["MODULE_BOOTSTART"] = 0xD3744BE0] = "MODULE_BOOTSTART";
            ElfPspModuleNids[ElfPspModuleNids["MODULE_REBOOT_BEFORE"] = 0x2F064FA6] = "MODULE_REBOOT_BEFORE";
            ElfPspModuleNids[ElfPspModuleNids["MODULE_START"] = 0xD632ACDB] = "MODULE_START";
            ElfPspModuleNids[ElfPspModuleNids["MODULE_START_THREAD_PARAMETER"] = 0x0F7C276C] = "MODULE_START_THREAD_PARAMETER";
            ElfPspModuleNids[ElfPspModuleNids["MODULE_STOP"] = 0xCEE8593C] = "MODULE_STOP";
            ElfPspModuleNids[ElfPspModuleNids["MODULE_STOP_THREAD_PARAMETER"] = 0xCF0CC697] = "MODULE_STOP_THREAD_PARAMETER";
        })(ElfPspModuleNids || (ElfPspModuleNids = {}));

        var ElfPspModuleImport = (function () {
            function ElfPspModuleImport() {
            }
            ElfPspModuleImport.struct = Struct.create([
                { type: UInt32, name: "nameOffset" },
                { type: UInt16, name: "version" },
                { type: UInt16, name: "flags" },
                { type: UInt8, name: "entrySize" },
                { type: UInt8, name: "variableCount" },
                { type: UInt16, name: "functionCount" },
                { type: UInt32, name: "nidAddress" },
                { type: UInt32, name: "callAddress" }
            ]);
            return ElfPspModuleImport;
        })();

        var ElfPspModuleExport = (function () {
            function ElfPspModuleExport() {
            }
            ElfPspModuleExport.struct = Struct.create([
                { type: UInt32, name: "name" },
                { type: UInt16, name: "version" },
                { type: UInt16, name: "flags" },
                { type: UInt8, name: "entrySize" },
                { type: UInt8, name: "variableCount" },
                { type: UInt16, name: "functionCount" },
                { type: UInt32, name: "exports" }
            ]);
            return ElfPspModuleExport;
        })();

        var ElfPspModuleInfoAtributesEnum;
        (function (ElfPspModuleInfoAtributesEnum) {
            ElfPspModuleInfoAtributesEnum[ElfPspModuleInfoAtributesEnum["UserMode"] = 0x0000] = "UserMode";
            ElfPspModuleInfoAtributesEnum[ElfPspModuleInfoAtributesEnum["KernelMode"] = 0x100] = "KernelMode";
        })(ElfPspModuleInfoAtributesEnum || (ElfPspModuleInfoAtributesEnum = {}));

        var ElfPspModuleInfo = (function () {
            function ElfPspModuleInfo() {
            }
            ElfPspModuleInfo.struct = StructClass.create(ElfPspModuleInfo, [
                { type: UInt16, name: "moduleAtributes" },
                { type: UInt16, name: "moduleVersion" },
                { type: Stringz(28), name: "name" },
                { type: UInt32, name: "gp" },
                { type: UInt32, name: "exportsStart" },
                { type: UInt32, name: "exportsEnd" },
                { type: UInt32, name: "importsStart" },
                { type: UInt32, name: "importsEnd" }
            ]);
            return ElfPspModuleInfo;
        })();
        _elf.ElfPspModuleInfo = ElfPspModuleInfo;

        var ElfRelocType;
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
        })(ElfRelocType || (ElfRelocType = {}));

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
                { type: UInt32, name: "pointerAddress" },
                { type: UInt32, name: "info" }
            ]);
            return ElfReloc;
        })();

        var ElfLoader = (function () {
            function ElfLoader() {
                this.header = null;
                this.stream = null;
            }
            ElfLoader.prototype.load = function (stream) {
                var _this = this;
                this.readAndCheckHeaders(stream);

                var programHeadersStream = stream.sliceWithLength(this.header.programHeaderOffset, this.header.programHeaderCount * this.header.programHeaderEntrySize);
                var sectionHeadersStream = stream.sliceWithLength(this.header.sectionHeaderOffset, this.header.sectionHeaderCount * this.header.sectionHeaderEntrySize);

                this.programHeaders = StructArray.create(ElfProgramHeader.struct, this.header.programHeaderCount).read(programHeadersStream);
                this.sectionHeaders = StructArray.create(ElfSectionHeader.struct, this.header.sectionHeaderCount).read(sectionHeadersStream);

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
                    return this.isPrx || (this.header.entryPoint < core.Memory.MAIN_OFFSET);
                },
                enumerable: true,
                configurable: true
            });
            return ElfLoader;
        })();

        var InstructionReader = (function () {
            function InstructionReader(memory) {
                this.memory = memory;
            }
            InstructionReader.prototype.read = function (address) {
                return new core.cpu.Instruction(address, this.memory.readUInt32(address));
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
                this.assembler = new core.cpu.MipsAssembler();
                this.baseAddress = 0;
            }
            PspElfLoader.prototype.load = function (stream) {
                this.elfLoader = ElfLoader.fromStream(stream);

                //ElfSectionHeaderFlags.Allocate
                this.allocateMemory();
                this.writeToMemory();
                this.relocateFromHeaders();
                this.readModuleInfo();
                this.updateModuleImports();

                console.log(this.moduleInfo);
            };

            PspElfLoader.prototype.getSectionHeaderMemoryStream = function (sectionHeader) {
                return this.memory.getPointerStream(this.baseAddress + sectionHeader.address, sectionHeader.size);
            };

            PspElfLoader.prototype.readModuleInfo = function () {
                this.moduleInfo = ElfPspModuleInfo.struct.read(this.getSectionHeaderMemoryStream(this.elfLoader.sectionHeadersByName['.rodata.sceModuleInfo']));
                this.moduleInfo.pc = this.baseAddress + this.elfLoader.header.entryPoint;
            };

            PspElfLoader.prototype.allocateMemory = function () {
                this.baseAddress = 0;

                if (this.elfLoader.needsRelocation) {
                    this.baseAddress = this.memoryManager.userPartition.childPartitions.sortBy(function (partition) {
                        return partition.size;
                    }).reverse().first().low;
                    this.baseAddress = MathUtils.nextAligned(this.baseAddress, 0x1000);
                }
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
                    switch (sectionHeader.type) {
                        case 9 /* Relocation */:
                            console.log(sectionHeader);
                            console.error("Not implemented ElfSectionHeaderType.Relocation");
                            break;

                        case ElfSectionHeaderType.PrxRelocation:
                            var relocs = StructArray.create(ElfReloc.struct, sectionHeader.stream.length / ElfReloc.struct.length).read(sectionHeader.stream);
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
                this.elfLoader.sectionHeaders.filter(function (sectionHeader) {
                    return ((sectionHeader.flags & 2 /* Allocate */) != 0);
                }).forEach(function (sectionHeader) {
                    var low = loadAddress + sectionHeader.address;

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

                            var memorySegment = _this.memoryManager.userPartition.allocateSet(length, low);

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
                var imports = StructArray.create(ElfPspModuleImport.struct, importsCount).read(importsStream);
                imports.forEach(function (_import) {
                    _import.name = _this.memory.readStringz(_import.nameOffset);
                    _this.updateModuleFunctions(_import);
                    _this.updateModuleVars(_import);
                });
                //console.log(imports);
            };

            PspElfLoader.prototype.updateModuleFunctions = function (moduleImport) {
                var _this = this;
                var _module = this.moduleManager.getByName(moduleImport.name);
                var nidsStream = this.memory.sliceWithSize(moduleImport.nidAddress, moduleImport.functionCount * 4);
                var callStream = this.memory.sliceWithSize(moduleImport.callAddress, moduleImport.functionCount * 8);

                var registerN = function (nid, n) {
                    var nfunc;
                    try  {
                        nfunc = _module.getByNid(nid);
                    } catch (e) {
                        console.warn(e);
                        nfunc = new core.NativeFunction();
                        nfunc.name = sprintf("%s:0x%08X", moduleImport.name, nid);
                        nfunc.nid = nid;
                        nfunc.firmwareVersion = 150;
                        nfunc.call = function (context, state) {
                            throw ("Not implemented '" + nfunc.name + "'");
                        };
                    }
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
            };

            PspElfLoader.prototype.updateModuleVars = function (moduleImport) {
            };
            return PspElfLoader;
        })();
        _elf.PspElfLoader = PspElfLoader;
    })(hle.elf || (hle.elf = {}));
    var elf = hle.elf;
})(hle || (hle = {}));
//# sourceMappingURL=elf.js.map
