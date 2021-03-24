import "../emu/global"
import {logger, StringDictionary} from "../global/utils";
import {Int16, Int32, Int8, Stringn, StructArray, StructClass, UInt16, UInt32} from "../global/struct";
import {Stream} from "../global/stream";
import {Memory} from "../core/memory";

const console = logger.named('elf');

export class ElfHeader {
	magic: string = ''
	class: number = 0
	data: number = 0
	idVersion: number = 0
	_padding: number[] = []
	type: ElfType = 0
	machine: ElfMachine = 0
	version: number = 0
	entryPoint: number = 0
	programHeaderOffset: number = 0
	sectionHeaderOffset: number = 0
	flags: number = 0
	elfHeaderSize: number = 0
	programHeaderEntrySize: number = 0
	programHeaderCount: number = 0
	sectionHeaderEntrySize: number = 0
	sectionHeaderCount: number = 0
	sectionHeaderStringTable: number = 0

	get hasValidMagic() {
		return this.magic == '\u007FELF';
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

export class ElfProgramHeader {
	type: ElfProgramHeaderType = ElfProgramHeaderType.NoLoad
	offset: number = 0
	virtualAddress: number = 0
	psysicalAddress: number = 0
	fileSize: number = 0
	memorySize: number = 0
	flags: ElfProgramHeaderFlags = ElfProgramHeaderFlags.Executable
	alignment: number = 0

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

export class ElfSectionHeader {
	nameOffset: number = 0
	name: string = ''
	// @ts-ignore
    stream: Stream
	type: ElfSectionHeaderType = ElfSectionHeaderType.Null
	flags: ElfSectionHeaderFlags = ElfSectionHeaderFlags.None
	address: number = 0
	offset: number = 0
	size: number = 0
	link: number = 0
	info: number = 0
	addressAlign: number = 0
	entitySize: number = 0

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

export class ElfReloc {
	pointerAddress: number = 0
	info: number = 0

	get pointeeSectionHeaderBase() { return (this.info >> 16) & 0xFF; }
	get pointerSectionHeaderBase() { return (this.info >> 8) & 0xFF; }
	get type() { return <ElfRelocType>((this.info >> 0) & 0xFF); }

	static struct = StructClass.create<ElfReloc>(ElfReloc, [
		{ pointerAddress: UInt32 },
		{ info: UInt32 },
	]);
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
