import "../emu/global"
import {logger, StringDictionary} from "../global/utils";
import {
    Int8, Struct,
    StructArray,
    StructInt16, StructInt32, StructInt8,
    StructStructArray, StructStructStringn, StructUInt16, StructUInt32
} from "../global/struct";
import {Stream} from "../global/stream";
import {Memory} from "../core/memory";

const console = logger.named('elf');

export class ElfHeader extends Struct {
    @StructStructStringn(4) magic: string = ''
	@StructInt8 class: number = 0
	@StructInt8 data: number = 0
	@StructInt8 idVersion: number = 0
	@StructStructArray(Int8, 9) _padding: number[] = []
	@StructUInt16 type: ElfType = 0
	@StructInt16 machine: ElfMachine = 0
	@StructInt32 version: number = 0
	@StructInt32 entryPoint: number = 0
	@StructInt32 programHeaderOffset: number = 0
	@StructInt32 sectionHeaderOffset: number = 0
	@StructInt32 flags: number = 0
	@StructInt16 elfHeaderSize: number = 0
	@StructInt16 programHeaderEntrySize: number = 0
	@StructInt16 programHeaderCount: number = 0
	@StructInt16 sectionHeaderEntrySize: number = 0
	@StructInt16 sectionHeaderCount: number = 0
	@StructInt16 sectionHeaderStringTable: number = 0

	get hasValidMagic() {
		return this.magic == '\u007FELF';
	}

	get hasValidMachine() {
		return this.machine == ElfMachine.ALLEGREX;
	}

	get hasValidType() {
		return [ElfType.Executable, ElfType.Prx].indexOf(this.type) >= 0;
	}
}

export class ElfProgramHeader extends Struct {
	@StructUInt32 type: ElfProgramHeaderType = ElfProgramHeaderType.NoLoad
    @StructUInt32 offset: number = 0
    @StructUInt32 virtualAddress: number = 0
    @StructUInt32 psysicalAddress: number = 0
    @StructUInt32 fileSize: number = 0
    @StructUInt32 memorySize: number = 0
    @StructUInt32 flags: ElfProgramHeaderFlags = ElfProgramHeaderFlags.Executable
    @StructUInt32 alignment: number = 0
}

export class ElfSectionHeader extends Struct {
    @StructUInt32 nameOffset: number = 0
    @StructUInt32 type: ElfSectionHeaderType = ElfSectionHeaderType.Null
    @StructUInt32 flags: ElfSectionHeaderFlags = ElfSectionHeaderFlags.None
    @StructUInt32 address: number = 0
    @StructUInt32 offset: number = 0
    @StructUInt32 size: number = 0
    @StructUInt32 link: number = 0
    @StructUInt32 info: number = 0
    @StructUInt32 addressAlign: number = 0
    @StructUInt32 entitySize: number = 0

    name: string = ''
    // @ts-ignore
    stream: Stream
}

export const enum ElfProgramHeaderType {
	NoLoad = 0,
	Load = 1,
	Reloc1 = 0x700000A0,
	Reloc2 = 0x700000A1,
}

export const enum ElfSectionHeaderType {
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

export const enum ElfSectionHeaderFlags {
	None = 0,
	Write = 1,
	Allocate = 2,
	Execute = 4
}

export const enum ElfProgramHeaderFlags {
	Executable = 0x1,
	// Note: demo PRX's were found to be not writable
	Writable = 0x2,
	Readable = 0x4,
}

export const enum ElfType {
	Executable = 0x0002,
	Prx = 0xFFA0,
}

export const enum ElfMachine {
	ALLEGREX = 8,
}

export const enum ElfPspModuleFlags // ushort
{
	User = 0x0000,
	Kernel = 0x1000,
}

export const enum ElfPspLibFlags // ushort
{
	DirectJump = 0x0001,
	Syscall = 0x4000,
	SysLib = 0x8000,
}

export const enum ElfPspModuleNids // uint
{
	MODULE_INFO = 0xF01D73A7,
	MODULE_BOOTSTART = 0xD3744BE0,
	MODULE_REBOOT_BEFORE = 0x2F064FA6,
	MODULE_START = 0xD632ACDB,
	MODULE_START_THREAD_PARAMETER = 0x0F7C276C,
	MODULE_STOP = 0xCEE8593C,
	MODULE_STOP_THREAD_PARAMETER = 0xCF0CC697,
}

	
export const enum ElfRelocType {
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

export class ElfReloc extends Struct {
	@StructUInt32 pointerAddress: number = 0
    @StructUInt32 info: number = 0

	get pointeeSectionHeaderBase() { return (this.info >> 16) & 0xFF; }
	get pointerSectionHeaderBase() { return (this.info >> 8) & 0xFF; }
	get type() { return <ElfRelocType>((this.info >> 0) & 0xFF); }
}


export class ElfLoader {
	// @ts-ignore
    public header: ElfHeader;
    // @ts-ignore
	stream: Stream;
	public programHeaders: ElfProgramHeader[] = []
	public sectionHeaders: ElfSectionHeader[] = []
	// @ts-ignore
    public sectionHeadersByName: StringDictionary<ElfSectionHeader>;
    // @ts-ignore
	private sectionHeaderStringTable: ElfSectionHeader;
    // @ts-ignore
	private stringTableStream: Stream;

	constructor() {
	}

	load(stream: Stream) {
		this.stream = stream;
		this.readAndCheckHeaders(stream);

        const programHeadersStream = stream.sliceWithLength(this.header.programHeaderOffset, this.header.programHeaderCount * this.header.programHeaderEntrySize);
        const sectionHeadersStream = stream.sliceWithLength(this.header.sectionHeaderOffset, this.header.sectionHeaderCount * this.header.sectionHeaderEntrySize);

        this.programHeaders = StructArray<ElfProgramHeader>(ElfProgramHeader.struct, this.header.programHeaderCount).read(programHeadersStream);
		this.sectionHeaders = StructArray<ElfSectionHeader>(ElfSectionHeader.struct, this.header.sectionHeaderCount).read(sectionHeadersStream);

		this.sectionHeaderStringTable = this.sectionHeaders[this.header.sectionHeaderStringTable];
		this.stringTableStream = this.getSectionHeaderFileStream(this.sectionHeaderStringTable);

		this.sectionHeadersByName = {};
		this.sectionHeaders.forEach((sectionHeader) => {
            const name = this.getStringFromStringTable(sectionHeader.nameOffset);
            sectionHeader.name = name;
			if (sectionHeader.type != ElfSectionHeaderType.Null) {
				sectionHeader.stream = this.getSectionHeaderFileStream(sectionHeader);
			}
			this.sectionHeadersByName[name] = sectionHeader;
		});

		console.log(this.sectionHeadersByName);
	}

	private readAndCheckHeaders(stream: Stream) {
		this.stream = stream;
        const header = this.header = ElfHeader.struct.read(stream);
        if (!header.hasValidMagic) throw new Error('Not an ELF file')
		if (!header.hasValidMachine) throw new Error('Not a PSP ELF file')
		if (!header.hasValidType) throw new Error(`Not a executable or a Prx but has type ${header.type}`)
	}

	private getStringFromStringTable(index: number) {
		this.stringTableStream.position = index;
		return this.stringTableStream.readStringz();
	}

	private getSectionHeaderFileStream(sectionHeader: ElfSectionHeader) {
		//console.log(`::${sectionHeader.type} ; ${sectionHeader.offset} ; ${sectionHeader.size}`);
		switch (sectionHeader.type) {
			case ElfSectionHeaderType.NoBits: case ElfSectionHeaderType.Null:
				return this.stream!.sliceWithLength(0, 0);
			default:
				return this.stream!.sliceWithLength(sectionHeader.offset, sectionHeader.size);
		}
	}

	static fromStream(stream: Stream) {
        const elf = new ElfLoader();
        elf.load(stream);
		return elf;
	}

	get isPrx() { return (this.header.type & ElfType.Prx) != 0; }
	get needsRelocation() { return this.isPrx || (this.header.entryPoint < Memory.MAIN_OFFSET); }
}
