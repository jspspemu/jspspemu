import _memory = require('../core/memory');
import _cpu = require('../core/cpu');
import _format_elf = require('../format/elf');
import _format_elf_dwarf = require('../format/elf_dwarf');
import _manager = require('./manager');

import CpuState = _cpu.CpuState;
import NativeFunction = _cpu.NativeFunction;
import Memory = _memory.Memory;
import SyscallManager = _cpu.SyscallManager;
import MipsAssembler = _cpu.MipsAssembler;
import Instruction = _cpu.Instruction;

import ElfLoader = _format_elf.ElfLoader;
import ElfSectionHeader = _format_elf.ElfSectionHeader;
import ElfSectionHeaderFlags = _format_elf.ElfSectionHeaderFlags;
import ElfSectionHeaderType = _format_elf.ElfSectionHeaderType;
import ElfReloc = _format_elf.ElfReloc;
import ElfRelocType = _format_elf.ElfRelocType;
import ElfProgramHeaderType = _format_elf.ElfProgramHeaderType;
import ElfDwarfLoader = _format_elf_dwarf.ElfDwarfLoader;

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

export class ElfPspModuleImport {
	name: string;
	nameOffset: number;
	version: number;
	flags: number;
	entrySize: number;
	functionCount: number;
	variableCount: number;
	nidAddress: number;
	callAddress: number;

	static struct = StructClass.create<ElfPspModuleImport>(ElfPspModuleImport, [
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

export class ElfPspModuleExport {
	name: string;
	version: number;
	flags: number;
	entrySize: number;
	variableCount: number;
	functionCount: number;
	exports: number;

	static struct = StructClass.create<ElfPspModuleExport>(ElfPspModuleExport, [
		{ name: UInt32 },
		{ version: UInt16 },
		{ flags: UInt16 },
		{ entrySize: UInt8 },
		{ variableCount: UInt8 },
		{ functionCount: UInt16 },
		{ exports: UInt32 },
	]);
}

export enum ElfPspModuleInfoAtributesEnum {
	UserMode = 0x0000,
	KernelMode = 0x100,
}

	
class InstructionReader {
	constructor(private memory: Memory) {
	}

	read(address: number) {
		return new Instruction(address, this.memory.readUInt32(address));
	}

	write(address: number, instruction: Instruction) {
		this.memory.writeInt32(address, instruction.data);
	}
}

export class PspElfLoader {
    private elfLoader: ElfLoader;
    moduleInfo: ElfPspModuleInfo;
	assembler = new MipsAssembler();
	baseAddress: number = 0;
	partition: _manager.MemoryPartition;
	elfDwarfLoader: ElfDwarfLoader;

	constructor(private memory: Memory, private memoryManager: _manager.MemoryManager, private moduleManager: _manager.ModuleManager, private syscallManager: SyscallManager) {
    }

	load(stream: Stream) {
		console.warn('PspElfLoader.load');
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

		console.log(this.moduleInfo);
	}

	getSymbolAt(address: number) {
		return this.elfDwarfLoader.getSymbolAt(address);
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
			this.baseAddress = this.memoryManager.userPartition.childPartitions.sortBy(partition => partition.size).reverse().first().low;
			this.baseAddress = MathUtils.nextAligned(this.baseAddress, 0x1000);
			//this.baseAddress = 0x08800000 + 0x4000;
			
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
			//console.info(sprintf('Section Header: '));

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
				case ElfRelocType.Mips16: instruction.u_imm16 += S; break;
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

		this.elfLoader.programHeaders.filter(programHeader => (programHeader.type == 1)).forEach(programHeader => {
			var fileOffset = programHeader.offset;
			var memOffset = this.baseAddress + programHeader.virtualAddress;
			var fileSize = programHeader.fileSize;
			var memSize = programHeader.memorySize;

			this.elfLoader.stream.sliceWithLength(fileOffset, fileSize).copyTo(this.memory.getPointerStream(memOffset, fileSize));
			this.memory.memset(memOffset + fileSize, 0, memSize - fileSize);

			//this.getSectionHeaderMemoryStream
			console.info('Program Header: ', sprintf("%08X:%08X, %08X:%08X", fileOffset, fileSize, memOffset, memSize));
		});

		this.elfLoader.sectionHeaders.filter(sectionHeader => ((sectionHeader.flags & ElfSectionHeaderFlags.Allocate) != 0)).forEach(sectionHeader => {
			var low = loadAddress + sectionHeader.address;

			console.info('Section Header: ', sectionHeader, sprintf('LOW:%08X, SIZE:%08X', low, sectionHeader.size));

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
            var imported = this.updateModuleFunctions(_import);
			this.updateModuleVars(_import);
			console.info('Imported: ', imported.name, imported.registeredNativeFunctions.map(i => i.name));
        });
        //console.log(imports);
    }

    private updateModuleFunctions(moduleImport: ElfPspModuleImport) {
        var _module = this.moduleManager.getByName(moduleImport.name);
        var nidsStream = this.memory.sliceWithSize(moduleImport.nidAddress, moduleImport.functionCount * 4);
		var callStream = this.memory.sliceWithSize(moduleImport.callAddress, moduleImport.functionCount * 8);
		var registeredNativeFunctions = <NativeFunction[]>[];
		var unknownFunctions = []

        var registerN = (nid: number, n: number) => {
            var nfunc: NativeFunction;
			nfunc = _module.getByNid(nid);
			if (!nfunc) {
				unknownFunctions.push(sprintf("'%s':0x%08X", _module.moduleName, nid));

				nfunc = new NativeFunction();
                nfunc.name = sprintf("%s:0x%08X", moduleImport.name, nid);
                nfunc.nid = nid;
				nfunc.firmwareVersion = 150;
				nfunc.nativeCall = () => {
					console.info(_module);
					throw (new Error("updateModuleFunctions: Not implemented '" + nfunc.name + "'"));
				};
				nfunc.call = (context, state) => {
					nfunc.nativeCall();
				};
            }

			registeredNativeFunctions.push(nfunc);

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

		console.warn("Can't find functions", unknownFunctions);

		return {
			name : moduleImport.name,
			registeredNativeFunctions : registeredNativeFunctions,
		};
    }

    private updateModuleVars(moduleImport: ElfPspModuleImport) {
    }
}
