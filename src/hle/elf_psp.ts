import {logger, ProgramExitException, sprintf} from "../global/utils";
import {
    Struct,
    StructArray,
    StructStructStringz,
    StructUInt16, StructUInt32, StructUInt8
} from "../global/struct";
import {Stream} from "../global/stream";
import {MathUtils} from "../global/math";
import {Memory} from "../core/memory";
import {
    ElfLoader,
    ElfProgramHeaderType, ElfReloc, ElfRelocType,
    ElfSectionHeader,
    ElfSectionHeaderFlags,
    ElfSectionHeaderType
} from "../format/elf";
import {MipsAssembler} from "../core/cpu/cpu_assembler";
import {ElfDwarfLoader} from "../format/elf_dwarf";
import {MemoryManager, MemoryPartition} from "./manager/memory";
import {ModuleManager} from "./manager/module";
import {NativeFunction, SyscallManager} from "../core/cpu/cpu_core";
import {Instruction} from "../core/cpu/cpu_instruction";
import {ModuleKnownFunctionNamesDatabase} from "./pspmodules_database";
import {ISymbol, ISymbolLookup} from "../emu/context";

const console = logger.named('elf.psp');

// http://hitmen.c02.at/files/yapspd/psp_doc/chap26.html
// 26.2.2.8
export class ElfPspModuleInfo extends Struct {
	@StructUInt16 moduleAtributes: number = 0
    @StructUInt16 moduleVersion: number = 0
	@StructStructStringz(28) name: string = ''
	@StructUInt32 gp: number = 0
    @StructUInt32 exportsStart: number = 0
    @StructUInt32 exportsEnd: number = 0
    @StructUInt32 importsStart: number = 0
    @StructUInt32 importsEnd: number = 0
    pc: number = 0
}

export class ElfPspModuleImport extends Struct {
	@StructUInt32 nameOffset: number = 0
    @StructUInt16 version: number = 0
    @StructUInt16 flags: number = 0
    @StructUInt8 entrySize: number = 0
    @StructUInt8 variableCount: number = 0
    @StructUInt16 functionCount: number = 0
    @StructUInt32 nidAddress: number = 0
    @StructUInt32 callAddress: number = 0

    name: string = ''
}

export class ElfPspModuleExport extends Struct {
    @StructUInt32 nameOffset: number = 0
	@StructUInt16 version: number = 0
	@StructUInt16 flags: number = 0
	@StructUInt8 entrySize: number = 0
    @StructUInt8 variableCount: number = 0
    @StructUInt16 functionCount: number = 0
    @StructUInt32 exports: number = 0

    name: string = ''
}

export const enum ElfPspModuleInfoAtributesEnum {
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
		this.memory.writeInt32(address, instruction.IDATA);
	}
}

export class PspElfLoader implements ISymbolLookup {
    // @ts-ignore
    private elfLoader: ElfLoader;
    // @ts-ignore
    moduleInfo: ElfPspModuleInfo;
	assembler = new MipsAssembler();
	baseAddress: number = 0;
    // @ts-ignore
	partition: MemoryPartition;
    // @ts-ignore
	elfDwarfLoader: ElfDwarfLoader;

	constructor(private memory: Memory, private memoryManager: MemoryManager, private moduleManager: ModuleManager, private syscallManager: SyscallManager) {
    }

	load(stream: Stream) {
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
	}

	getSymbolAt(address: number): ISymbol | null {
		return this.elfDwarfLoader.getSymbolAt(address);
	}

	private getSectionHeaderMemoryStream(sectionHeader: ElfSectionHeader) {
		return this.memory.getPointerStream(this.baseAddress + sectionHeader.address, sectionHeader.size)!;
	}

	private readModuleInfo() {
		this.moduleInfo = ElfPspModuleInfo.struct.read(this.getSectionHeaderMemoryStream(this.elfLoader.sectionHeadersByName['.rodata.sceModuleInfo']));
		this.moduleInfo.pc = this.baseAddress + this.elfLoader.header.entryPoint;
	}

	private allocateMemory() {
		this.baseAddress = 0;

		if (this.elfLoader.needsRelocation) {
			this.baseAddress = this.memoryManager.userPartition.childPartitions.sortBy(partition => partition.size).reverse().first()!.low;
			this.baseAddress = MathUtils.nextAligned(this.baseAddress, 0x1000);
			//this.baseAddress = 0x08800000 + 0x4000;
			
		}

        let lowest = 0xFFFFFFFF;
        let highest = 0;
        this.elfLoader.sectionHeaders.filter(section => ((section.flags & ElfSectionHeaderFlags.Allocate) != 0)).forEach(section => {
			lowest = Math.min(lowest, (this.baseAddress + section.address));
			highest = Math.max(highest, (this.baseAddress + section.address + section.size));
		});

		this.elfLoader.programHeaders.forEach(program => {
			lowest = Math.min(lowest, (this.baseAddress + program.virtualAddress));
			highest = Math.max(highest, (this.baseAddress + program.virtualAddress + program.memorySize));
		});

        const memorySegment = this.memoryManager.userPartition.allocateSet(highest - lowest, lowest, 'Elf');
    }

	private relocateFromHeaders() {
        const RelocProgramIndex = 0;
        this.elfLoader.programHeaders.forEach((programHeader) => {
			switch (programHeader.type) {
				case ElfProgramHeaderType.Reloc1:
					console.warn("SKIPPING Elf.ProgramHeader.TypeEnum.Reloc1!");
					break;
				case ElfProgramHeaderType.Reloc2:
					throw ("Not implemented");
			}
		});

        const RelocSectionIndex = 0;
        this.elfLoader.sectionHeaders.forEach((sectionHeader) => {
			//RelocOutput.WriteLine("Section Header: %d : %s".Sprintf(RelocSectionIndex++, SectionHeader.ToString()));
			//console.info(sprintf('Section Header: '));

			switch (sectionHeader.type) {
				case ElfSectionHeaderType.Relocation:
					console.log(sectionHeader);
					console.error("Not implemented ElfSectionHeaderType.Relocation");
					break;

				case ElfSectionHeaderType.PrxRelocation:
                    const relocs = StructArray<ElfReloc>(ElfReloc.struct, sectionHeader.stream.length / ElfReloc.struct.length).read(sectionHeader.stream);
                    this.relocateRelocs(relocs);
					break;

				case ElfSectionHeaderType.PrxRelocation_FW5:
					throw ("Not implemented ElfSectionHeader.Type.PrxRelocation_FW5");
			}
		});
	}

	private relocateRelocs(relocs: ElfReloc[]) {
		const baseAddress = this.baseAddress;
		let hiValue: number = 0;
		let deferredHi16: number[] = [];
		const instructionReader = new InstructionReader(this.memory);

		for (let index = 0; index < relocs.length; index++) {
			const reloc = relocs[index];
			if (reloc.type == ElfRelocType.StopRelocation) break;

			const pointerBaseOffset = this.elfLoader.programHeaders[reloc.pointerSectionHeaderBase].virtualAddress;
			const pointeeBaseOffset = this.elfLoader.programHeaders[reloc.pointeeSectionHeaderBase].virtualAddress;

			// Address of data to relocate
            const RelocatedPointerAddress = (baseAddress + reloc.pointerAddress + pointerBaseOffset);

			// Value of data to relocate
            const instruction = instructionReader.read(RelocatedPointerAddress);

			const S = baseAddress + pointeeBaseOffset;
			const GP_ADDR = (baseAddress + reloc.pointerAddress);
			const GP_OFFSET = GP_ADDR - (baseAddress & 0xFFFF0000);

			switch (reloc.type) {
				case ElfRelocType.None: break;
				case ElfRelocType.Mips16: instruction.u_imm16 += S; break;
				case ElfRelocType.Mips32: instruction.IDATA += S; break;
				case ElfRelocType.MipsRel32: throw ("Not implemented MipsRel32"); 
				case ElfRelocType.Mips26: instruction.jump_real = instruction.jump_real + S; break;
				case ElfRelocType.MipsHi16: hiValue = instruction.u_imm16; deferredHi16.push(RelocatedPointerAddress); break;
				case ElfRelocType.MipsLo16:
                    const A = instruction.u_imm16;

					instruction.u_imm16 = ((hiValue << 16) | (A & 0x0000FFFF)) + S;

					deferredHi16.forEach(data_addr2 => {
						const data2 = instructionReader.read(data_addr2);
						let result = ((data2.IDATA & 0x0000FFFF) << 16) + A + S;
						if ((A & 0x8000) != 0) result -= 0x10000;
                        if ((result & 0x8000) != 0) result += 0x10000;
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
        const needsRelocate = this.elfLoader.needsRelocation;

        //const loadAddress = this.elfLoader.programHeaders[0].psysicalAddress;
        const loadAddress = this.baseAddress;

        console.info(sprintf("PspElfLoader: needsRelocate=%s, loadAddress=%08X", needsRelocate, loadAddress));
		//console.log(moduleInfo);

		this.elfLoader.programHeaders.filter(programHeader => (programHeader.type == 1)).forEach(programHeader => {
			const fileOffset = programHeader.offset
			const memOffset = this.baseAddress + programHeader.virtualAddress
			const fileSize = programHeader.fileSize
			const memSize = programHeader.memorySize

			this.elfLoader.stream.sliceWithLength(fileOffset, fileSize).copyTo(this.memory.getPointerStream(memOffset, fileSize)!)
			this.memory.memset(memOffset + fileSize, 0, memSize - fileSize)

			//this.getSectionHeaderMemoryStream
			console.info('Program Header: ', sprintf("%08X:%08X, %08X:%08X", fileOffset, fileSize, memOffset, memSize))
		});

		this.elfLoader.sectionHeaders.filter(sectionHeader => ((sectionHeader.flags & ElfSectionHeaderFlags.Allocate) != 0)).forEach(sectionHeader => {
			const low = loadAddress + sectionHeader.address;

			console.info('Section Header: ', sectionHeader, sprintf('LOW:%08X, SIZE:%08X', low, sectionHeader.size));

            //console.log(sectionHeader);
            switch (sectionHeader.type) {
				case ElfSectionHeaderType.NoBits:
					for (let n = 0; n < sectionHeader.size; n++) this.memory.writeInt8(low + n, 0);
					break;
				default:
					//console.log(sprintf('low: %08X type: %08X', low, sectionHeader.type));
					break;
                case ElfSectionHeaderType.ProgramBits:
                    const stream = sectionHeader.stream;
                    const length = stream.length;
					//console.log(sprintf('low: %08X, %08X, size: %08X', sectionHeader.address, low, stream.length));
                    this.memory.writeStream(low, stream);

                    break;
            }
		});

    }

    private updateModuleImports() {
        const moduleInfo = this.moduleInfo;
        console.log(moduleInfo);
        const importsBytesSize = moduleInfo.importsEnd - moduleInfo.importsStart;
        const importsStream = this.memory.sliceWithBounds(moduleInfo.importsStart, moduleInfo.importsEnd);
        const importsCount = importsBytesSize / ElfPspModuleImport.struct.length;
        const imports = StructArray<ElfPspModuleImport>(ElfPspModuleImport.struct, importsCount).read(importsStream);
        imports.forEach(_import => {
            _import.name = this.memory.readStringz(_import.nameOffset)!
            const imported = this.updateModuleFunctions(_import);
            this.updateModuleVars(_import);
			console.info('Imported: ', imported.name, imported.registeredNativeFunctions.map(i => i.name));
        });
        //console.log(imports);
    }

    private updateModuleFunctions(moduleImport: ElfPspModuleImport) {
        const _module = this.moduleManager.getByName(moduleImport.name);
        const nidsStream = this.memory.sliceWithSize(moduleImport.nidAddress, moduleImport.functionCount * 4);
        const callStream = this.memory.sliceWithSize(moduleImport.callAddress, moduleImport.functionCount * 8);
        const registeredNativeFunctions = <NativeFunction[]>[];
        const unknownFunctions:string[] = []

        const registerN = (nid: number, n: number) => {
            let nfunc: NativeFunction;
            nfunc = _module.getByNid(nid);

			if (!nfunc) {
			    const nidHex = sprintf("0x%08X", nid)
				unknownFunctions.push(sprintf("'%s':%s", _module.moduleName, nidHex));
			    const knownModule = ModuleKnownFunctionNamesDatabase?.[_module.moduleName]
                const knownFuncName = knownModule?.[nidHex]

				nfunc = new NativeFunction();
			    if (knownFuncName) {
                    nfunc.name = sprintf("%s:%s:0x%08X", _module.moduleName, knownFuncName, nid)
                } else {
                    nfunc.name = sprintf("%s:0x%08X", moduleImport.name, nid);
                }
                nfunc.nid = nid;
				nfunc.firmwareVersion = 150;
                nfunc.nativeCall = () => {
				    const errorString = `updateModuleFunctions: Not implemented '${nfunc.name}'`
					console.info(_module);
					console.error(errorString);
					debugger;
					throw new ProgramExitException(errorString);
				};
				nfunc.call = (context, state) => {
					nfunc.nativeCall();
				};
            }

			registeredNativeFunctions.push(nfunc);

            //printf("%s:%08X -> %s", moduleImport.name, nid, syscallId);
            return this.syscallManager.register(nfunc)
        };

        for (let n = 0; n < moduleImport.functionCount; n++) {
            const nid = nidsStream.readUInt32();
            const syscall = registerN(nid, n);

            callStream.writeInt32(this.assembler.assemble(0, sprintf('jr $31'))[0].IDATA);
            callStream.writeInt32(this.assembler.assemble(0, sprintf('syscall %d', syscall))[0].IDATA);
		}

		if (unknownFunctions.length > 0) {
			console.warn("Can't find functions", unknownFunctions);
		}

		return {
			name : moduleImport.name,
			registeredNativeFunctions : registeredNativeFunctions,
		};
    }

    private updateModuleVars(moduleImport: ElfPspModuleImport) {
    }
}
