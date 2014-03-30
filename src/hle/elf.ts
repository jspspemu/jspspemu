module hle.elf {
    class ElfHeader {
        magic: string;
        class: number;
        data: number;
        idVersion: number;
        _padding: number[];
        type: ElfType;
        machine: ElfMachine;
        version: number;
        entryPoint: number;
        programHeaderOffset: number;
        sectionHeaderOffset: number;
        flags: number;
        elfHeaderSize: number;
        programHeaderEntrySize: number;
        programHeaderCount: number;
        sectionHeaderEntrySize: number;
        sectionHeaderCount: number;
        sectionHeaderStringTable: number;

        get hasValidMagic() {
            return this.magic == String.fromCharCode(0x7F) + 'ELF';
        }

        get hasValidMachine() {
            return this.machine == ElfMachine.ALLEGREX;
        }

        get hasValidType() {
            return [ElfType.Executable, ElfType.Prx].indexOf(this.type) >= 0;
        }

        static struct = StructClass.create<ElfHeader>(ElfHeader, [
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
    }

    class ElfProgramHeader {
        type: ElfProgramHeaderType;
        offset: number;
        virtualAddress: number;
        psysicalAddress: number;
        fileSize: number;
        memorySize: number;
        flags: ElfProgramHeaderFlags;
        alignment: number;

        static struct = StructClass.create<ElfProgramHeader>(ElfProgramHeader, [
			{ type: UInt32 },
			{ offset: UInt32 },
			{ virtualAddress: UInt32 },
			{ psysicalAddress: UInt32 },
			{ fileSize: UInt32 },
			{ memorySize: UInt32 },
			{ flags: UInt32 },
			{ alignment: UInt32 },
        ]);
    }

    class ElfSectionHeader {
        nameOffset: number;
        name: string;
        stream: Stream = null;
        type: ElfSectionHeaderType;
        flags: ElfSectionHeaderFlags;
        address: number;
        offset: number;
        size: number;
        link: number;
        info: number;
        addressAlign: number;
        entitySize: number;

        static struct = StructClass.create<ElfSectionHeader>(ElfSectionHeader, [
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
    }


    enum ElfProgramHeaderType {
        NoLoad = 0,
        Load = 1,
        Reloc1 = 0x700000A0,
        Reloc2 = 0x700000A1,
    }

    enum ElfSectionHeaderType {
        Null = 0,
        ProgramBits = 1,
        SYMTAB = 2,
        STRTAB = 3,
        RELA = 4,
        HASH = 5,
        DYNAMIC = 6,
        NOTE = 7,
        NoBits = 8,
        Relocation = 9,
        SHLIB = 10,
        DYNSYM = 11,

        LOPROC = 0x70000000, HIPROC = 0x7FFFFFFF,
        LOUSER = 0x80000000, HIUSER = 0xFFFFFFFF,

        PrxRelocation = (LOPROC | 0xA0),
        PrxRelocation_FW5 = (LOPROC | 0xA1),
    }

    enum ElfSectionHeaderFlags {
        None = 0,
        Write = 1,
        Allocate = 2,
        Execute = 4
    }

    enum ElfProgramHeaderFlags {
        Executable = 0x1,
        // Note: demo PRX's were found to be not writable
        Writable = 0x2,
        Readable = 0x4,
    }

    enum ElfType {
        Executable = 0x0002,
        Prx = 0xFFA0,
    }

    enum ElfMachine {
        ALLEGREX = 8,
    }

    enum ElfPspModuleFlags // ushort
    {
        User = 0x0000,
        Kernel = 0x1000,
    }

    enum ElfPspLibFlags // ushort
    {
        DirectJump = 0x0001,
        Syscall = 0x4000,
        SysLib = 0x8000,
    }

    enum ElfPspModuleNids // uint
    {
        MODULE_INFO = 0xF01D73A7,
        MODULE_BOOTSTART = 0xD3744BE0,
        MODULE_REBOOT_BEFORE = 0x2F064FA6,
        MODULE_START = 0xD632ACDB,
        MODULE_START_THREAD_PARAMETER = 0x0F7C276C,
        MODULE_STOP = 0xCEE8593C,
        MODULE_STOP_THREAD_PARAMETER = 0xCF0CC697,
    }

    class ElfPspModuleImport {
        name: string;
        nameOffset: number;
        version: number;
        flags: number;
        entrySize: number;
        functionCount: number;
        variableCount: number;
        nidAddress: number;
        callAddress: number;

        static struct = Struct.create<ElfPspModuleImport>([
			{ nameOffset: UInt32 },
			{ version: UInt16 },
			{ flags: UInt16 },
			{ entrySize: UInt8 },
			{ variableCount: UInt8 },
			{ functionCount: UInt16 },
			{ nidAddress: UInt32 },
			{ callAddress: UInt32 },
        ]);
    }

    class ElfPspModuleExport {
        name: string;
        version: number;
        flags: number;
        entrySize: number;
        variableCount: number;
        functionCount: number;
        exports: number;

        static struct = Struct.create([
			{ name: UInt32 },
			{ version: UInt16 },
			{ flags: UInt16 },
			{ entrySize: UInt8 },
			{ variableCount: UInt8 },
			{ functionCount: UInt16 },
			{ exports: UInt32 },
        ]);
    }

    enum ElfPspModuleInfoAtributesEnum // ushort
    {
        UserMode = 0x0000,
        KernelMode = 0x100,
    }

    export class ElfPspModuleInfo {
        moduleAtributes: number;
        moduleVersion: number;
        name: string;
        gp: number;
        pc: number;
        exportsStart: number;
        exportsEnd: number;
        importsStart: number;
        importsEnd: number;

        // http://hitmen.c02.at/files/yapspd/psp_doc/chap26.html
        // 26.2.2.8
        static struct = StructClass.create<ElfPspModuleInfo>(ElfPspModuleInfo, [
			{ moduleAtributes: UInt16 },
			{ moduleVersion: UInt16 },
			{ name: Stringz(28) },
			{ gp: UInt32 },
			{ exportsStart: UInt32 },
			{ exportsEnd: UInt32 },
			{ importsStart: UInt32 },
			{ importsEnd: UInt32 },
        ]);
    }

	enum ElfRelocType {
		None = 0,
		Mips16 = 1,
		Mips32 = 2,
		MipsRel32 = 3,
		Mips26 = 4,
		MipsHi16 = 5,
		MipsLo16 = 6,
		MipsGpRel16 = 7,
		MipsLiteral = 8,
		MipsGot16 = 9,
		MipsPc16 = 10,
		MipsCall16 = 11,
		MipsGpRel32 = 12,
		StopRelocation = 0xFF,
	}

	class ElfReloc
	{
		pointerAddress: number;
		info: number;

		get pointeeSectionHeaderBase() { return (this.info >> 16) & 0xFF; }
		get pointerSectionHeaderBase() { return (this.info >> 8) & 0xFF; }
		get type() { return <ElfRelocType>((this.info >> 0) & 0xFF); }

		static struct = StructClass.create<ElfReloc>(ElfReloc, [
			{ pointerAddress: UInt32 },
			{ info: UInt32 },
		]);
	}


    class ElfLoader {
        public header: ElfHeader = null;
        private stream: Stream = null;
        public programHeaders: ElfProgramHeader[];
        public sectionHeaders: ElfSectionHeader[];
        public sectionHeadersByName: StringDictionary<ElfSectionHeader>;
        private sectionHeaderStringTable: ElfSectionHeader;
        private stringTableStream: Stream;

        constructor() {
        }

		load(stream: Stream) {
			this.readAndCheckHeaders(stream);

			var programHeadersStream = stream.sliceWithLength(this.header.programHeaderOffset, this.header.programHeaderCount * this.header.programHeaderEntrySize);
			var sectionHeadersStream = stream.sliceWithLength(this.header.sectionHeaderOffset, this.header.sectionHeaderCount * this.header.sectionHeaderEntrySize);

			this.programHeaders = StructArray<ElfProgramHeader>(ElfProgramHeader.struct, this.header.programHeaderCount).read(programHeadersStream);
			this.sectionHeaders = StructArray<ElfSectionHeader>(ElfSectionHeader.struct, this.header.sectionHeaderCount).read(sectionHeadersStream);

			this.sectionHeaderStringTable = this.sectionHeaders[this.header.sectionHeaderStringTable];
            this.stringTableStream = this.getSectionHeaderFileStream(this.sectionHeaderStringTable);

            this.sectionHeadersByName = {};
            this.sectionHeaders.forEach((sectionHeader) => {
                var name = this.getStringFromStringTable(sectionHeader.nameOffset);
                sectionHeader.name = name;
                if (sectionHeader.type != ElfSectionHeaderType.Null) {
                    sectionHeader.stream = this.getSectionHeaderFileStream(sectionHeader);
                }
                this.sectionHeadersByName[name] = sectionHeader;
            });
		}

		private readAndCheckHeaders(stream: Stream) {
			this.stream = stream;
			var header = this.header = ElfHeader.struct.read(stream);
			if (!header.hasValidMagic) throw ('Not an ELF file');
			if (!header.hasValidMachine) throw ('Not a PSP ELF file');
			if (!header.hasValidType) throw ('Not a executable or a Prx but has type ' + header.type);
		}

        private getStringFromStringTable(index: number) {
            this.stringTableStream.position = index;
            return this.stringTableStream.readStringz();
        }

        private getSectionHeaderFileStream(sectionHeader: ElfSectionHeader) {
            //console.log('::' + sectionHeader.type + ' ; ' + sectionHeader.offset + ' ; ' + sectionHeader.size);
            switch (sectionHeader.type) {
                case ElfSectionHeaderType.NoBits: case ElfSectionHeaderType.Null:
                    return this.stream.sliceWithLength(0, 0);
                    break;
                default:
                    return this.stream.sliceWithLength(sectionHeader.offset, sectionHeader.size);
            }
        }

        static fromStream(stream: Stream) {
            var elf = new ElfLoader();
            elf.load(stream);
            return elf;
		}

		get isPrx() { return (this.header.type & ElfType.Prx) != 0; }
		get needsRelocation() { return this.isPrx || (this.header.entryPoint < core.Memory.MAIN_OFFSET); }
	}

	class InstructionReader {
		constructor(private memory: core.Memory) {
		}

		read(address: number) {
			return new core.cpu.Instruction(address, this.memory.readUInt32(address));
		}

		write(address: number, instruction: core.cpu.Instruction) {
			this.memory.writeInt32(address, instruction.data);
		}
	}

    export class PspElfLoader {
        private elfLoader: ElfLoader;
        moduleInfo: ElfPspModuleInfo;
		assembler = new core.cpu.MipsAssembler();
		baseAddress: number = 0;
		partition: MemoryPartition;

		constructor(private memory: core.Memory, private memoryManager: MemoryManager, private moduleManager: hle.ModuleManager, private syscallManager: core.SyscallManager) {
        }

        load(stream: Stream) {
			this.elfLoader = ElfLoader.fromStream(stream);

			//ElfSectionHeaderFlags.Allocate

			this.allocateMemory();
			this.writeToMemory();
			this.relocateFromHeaders();
			this.readModuleInfo();
			this.updateModuleImports();

			console.log(this.moduleInfo);
		}

		private getSectionHeaderMemoryStream(sectionHeader: ElfSectionHeader) {
			return this.memory.getPointerStream(this.baseAddress + sectionHeader.address, sectionHeader.size);
		}

		private readModuleInfo() {
			this.moduleInfo = ElfPspModuleInfo.struct.read(this.getSectionHeaderMemoryStream(this.elfLoader.sectionHeadersByName['.rodata.sceModuleInfo']));
			this.moduleInfo.pc = this.baseAddress + this.elfLoader.header.entryPoint;
		}

		private allocateMemory() {
			this.baseAddress = 0;

			if (this.elfLoader.needsRelocation) {
				this.baseAddress = this.memoryManager.userPartition.childPartitions.sortBy(partition => partition.size).reverse().first().low
				this.baseAddress = MathUtils.nextAligned(this.baseAddress, 0x1000);
			}

			var lowest = 0xFFFFFFFF;
			var highest = 0;
			this.elfLoader.sectionHeaders.filter(section => ((section.flags & ElfSectionHeaderFlags.Allocate) != 0)).forEach(section => {
				lowest = Math.min(lowest, (this.baseAddress + section.address));
				highest = Math.max(highest, (this.baseAddress + section.address + section.size));
			});

			this.elfLoader.programHeaders.forEach(program => {
				lowest = Math.min(lowest, (this.baseAddress + program.virtualAddress));
				highest = Math.max(highest, (this.baseAddress + program.virtualAddress + program.memorySize));
			});

			var memorySegment = this.memoryManager.userPartition.allocateSet(highest - lowest, lowest, 'Elf');
		}

		private relocateFromHeaders() {
			var RelocProgramIndex = 0;
			this.elfLoader.programHeaders.forEach((programHeader) => {
				switch (programHeader.type) {
					case ElfProgramHeaderType.Reloc1:
						console.warn("SKIPPING Elf.ProgramHeader.TypeEnum.Reloc1!");
						break;
					case ElfProgramHeaderType.Reloc2:
						throw ("Not implemented");
				}
			});

			var RelocSectionIndex = 0;
			this.elfLoader.sectionHeaders.forEach((sectionHeader) => {
				//RelocOutput.WriteLine("Section Header: %d : %s".Sprintf(RelocSectionIndex++, SectionHeader.ToString()));

				switch (sectionHeader.type) {
					case ElfSectionHeaderType.Relocation:
						console.log(sectionHeader);
						console.error("Not implemented ElfSectionHeaderType.Relocation");
						break;

					case ElfSectionHeaderType.PrxRelocation:
						var relocs = StructArray<ElfReloc>(ElfReloc.struct, sectionHeader.stream.length / ElfReloc.struct.length).read(sectionHeader.stream);
						this.relocateRelocs(relocs);
						break;
					case ElfSectionHeaderType.PrxRelocation_FW5:
						throw ("Not implemented ElfSectionHeader.Type.PrxRelocation_FW5");
				}
			});
		}

		private relocateRelocs(relocs: ElfReloc[]) {
			var baseAddress = this.baseAddress;
			var hiValue: number;
			var deferredHi16: number[] = [];
			var instructionReader = new InstructionReader(this.memory);

			for (var index = 0; index < relocs.length; index++) {
				var reloc = relocs[index];
				if (reloc.type == ElfRelocType.StopRelocation) break;

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
					case ElfRelocType.None: break;
					case ElfRelocType.Mips16: break;
					//case ElfRelocType.Mips16: instruction.u_imm16 += S; break;
					case ElfRelocType.Mips32: instruction.data += S; break;
					case ElfRelocType.MipsRel32: throw ("Not implemented MipsRel32"); 
					case ElfRelocType.Mips26: instruction.jump_real = instruction.jump_real + S; break;
					case ElfRelocType.MipsHi16: hiValue = instruction.u_imm16; deferredHi16.push(RelocatedPointerAddress); break;
					case ElfRelocType.MipsLo16:
						var A = instruction.u_imm16;

						instruction.u_imm16 = ((hiValue << 16) | (A & 0x0000FFFF)) + S;

						deferredHi16.forEach(data_addr2 => {
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
					case ElfRelocType.MipsGpRel16:
						break;
					default: throw (new Error(sprintf("RelocType %d not implemented", reloc.type)));
				}

				instructionReader.write(RelocatedPointerAddress, instruction);
			}
		}

        private writeToMemory() {
			var needsRelocate = this.elfLoader.needsRelocation;

            //var loadAddress = this.elfLoader.programHeaders[0].psysicalAddress;
            var loadAddress = this.baseAddress;

            console.info(sprintf("PspElfLoader: needsRelocate=%s, loadAddress=%08X", needsRelocate, loadAddress));
            //console.log(moduleInfo);

			this.elfLoader.sectionHeaders.filter(sectionHeader => ((sectionHeader.flags & ElfSectionHeaderFlags.Allocate) != 0)).forEach(sectionHeader => {
				var low = loadAddress + sectionHeader.address;

                //console.log(sectionHeader);
                switch (sectionHeader.type) {
					case ElfSectionHeaderType.NoBits:
						for (var n = 0; n < sectionHeader.size; n++) this.memory.writeInt8(low + n, 0);
						break;
					default:
						//console.log(sprintf('low: %08X type: %08X', low, sectionHeader.type));
						break;
                    case ElfSectionHeaderType.ProgramBits:
                        var stream = sectionHeader.stream;

						var length = stream.length;
							
						//console.log(sprintf('low: %08X, %08X, size: %08X', sectionHeader.address, low, stream.length));
                        this.memory.writeStream(low, stream);

                        break;
                }
			});

        }

        private updateModuleImports() {
			var moduleInfo = this.moduleInfo;
			console.log(moduleInfo);
            var importsBytesSize = moduleInfo.importsEnd - moduleInfo.importsStart;
            var importsStream = this.memory.sliceWithBounds(moduleInfo.importsStart, moduleInfo.importsEnd);
            var importsCount = importsBytesSize / ElfPspModuleImport.struct.length;
            var imports = StructArray<ElfPspModuleImport>(ElfPspModuleImport.struct, importsCount).read(importsStream);
            imports.forEach(_import => {
                _import.name = this.memory.readStringz(_import.nameOffset)
                this.updateModuleFunctions(_import);
                this.updateModuleVars(_import);
            });
            //console.log(imports);
        }

        private updateModuleFunctions(moduleImport: ElfPspModuleImport) {
            var _module = this.moduleManager.getByName(moduleImport.name);
            var nidsStream = this.memory.sliceWithSize(moduleImport.nidAddress, moduleImport.functionCount * 4);
            var callStream = this.memory.sliceWithSize(moduleImport.callAddress, moduleImport.functionCount * 8);

            var registerN = (nid: number, n: number) => {
                var nfunc: core.NativeFunction;
                try {
                    nfunc = _module.getByNid(nid)
                } catch (e) {
                    console.warn(e);
					nfunc = new core.NativeFunction();
                    nfunc.name = sprintf("%s:0x%08X", moduleImport.name, nid);
                    nfunc.nid = nid;
                    nfunc.firmwareVersion = 150;
					nfunc.call = (context: EmulatorContext, state: core.cpu.CpuState) => {
                        throw ("Not implemented '" + nfunc.name + "'");
                    };
                }
                var syscallId = this.syscallManager.register(nfunc);
                //printf("%s:%08X -> %s", moduleImport.name, nid, syscallId);
                return syscallId;
            };

            for (var n = 0; n < moduleImport.functionCount; n++) {
                var nid = nidsStream.readUInt32();
                var syscall = registerN(nid, n);

                callStream.writeInt32(this.assembler.assemble(0, sprintf('jr $31'))[0].data);
                callStream.writeInt32(this.assembler.assemble(0, sprintf('syscall %d', syscall))[0].data);
            }
        }

        private updateModuleVars(moduleImport: ElfPspModuleImport) {
        }
    }
}
