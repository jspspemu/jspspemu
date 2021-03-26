import "../emu/global"

import {addressToHex, logger} from "../global/utils";
import {
    Int8,
    IType,
    StringzVariable,
    Struct,
    StructArray,
    StructClass, StructInt8, StructMember, StructStructStringzVariable, StructUInt16, StructUInt32, StructUInt8,
    UInt16,
    UInt32,
    UInt8
} from "../global/struct";
import {Stream} from "../global/stream";
import {BitUtils} from "../global/math";
import {ElfLoader} from "./elf";
import {ISymbol} from "../emu/context";

const console = logger.named('elf.dwarf');

// https://github.com/soywiz/pspemu/blob/master/src/pspemu/hle/elf/ElfDwarf.d

class Uleb128Class implements IType<number> {
	read(stream: Stream): number {
        let val = 0;
        let b = 0x80;

        for (let shift = 0; ((stream.available) > 0 && (b & 0x80)); shift += 7) {
			b = stream.readUInt8();
			val |= (b & 0x7F) << shift;
		}

		return val;
	}
	write(stream: Stream, value: number): void {
		throw(new Error("Not implemented"));
	}
	get length() { return 0; }
}

const Uleb128 = new Uleb128Class();
export const StructUleb128: any = StructMember(Uleb128)

class ElfDwarfHeader extends Struct {
	@StructUInt32 total_length: number = 0
	@StructUInt16 version: number = 0
	@StructUInt32 prologue_length: number = 0
    @StructUInt8 minimum_instruction_length: number = 0
    @StructUInt8 default_is_stmt: number = 0
    @StructInt8 line_base: number = 0
    @StructInt8 line_range: number = 0
    @StructInt8 opcode_base: number = 0

	get total_length_real() { return this.total_length + 4; }
}

enum DW_LNS {
	extended_op = 0,
	copy = 1,
	advance_pc = 2,
	advance_line = 3,
	set_file = 4,
	set_column = 5,
	negate_stmt = 6,
	set_basic_block = 7,
	const_add_pc = 8,
	fixed_advance_pc = 9,
}

enum DW_LNE {
	end_sequence = 1,
	set_address = 2,
	define_file = 3,
}

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

class FileEntry extends Struct {
	@StructStructStringzVariable name: string = '';
	@StructUleb128 directory_index: number = 0;
    @StructUleb128 time_mod: number = 0;
    @StructUleb128 size: number = 0;

    directory: string = '';

    full_path() {
		if (this.directory.length) {
			return this.directory + "/" + this.name;
		} else {
			return name;
		}
	}
}

export class ElfSymbol extends Struct {
	@StructUInt32 nameIndex: number = 0;
	@StructUInt32 value: number = 0;
	@StructUInt32 size: number = 0;
	@StructUInt8 info: number = 0;
	@StructUInt8 other: number = 0;
	@StructUInt16 shndx: number = 0;

    name: string = '';
    index: number = -1;

    get type() { return <SymInfoType>BitUtils.extract(this.info, 0, 4); }
	get bind() { return <SymInfoBind>BitUtils.extract(this.info, 4, 4); }

	get typeName(): string { return SymInfoType[this.type]; }
	get bindName(): string { return SymInfoBind[this.bind]; }

	get address() { return this.value; }
	get low() { return this.value; }
	get high() { return this.value + this.size; }

	toString() {
		return `ElfSymbol("${this.name}", ${addressToHex(this.low)}-${addressToHex(this.high)}`;
	}

	contains(address: number) {
		return (address >= this.low) && (address < (this.high));
	}
}

export enum SymInfoBind {
	LOCAL = 0,
	GLOBAL = 1,
	WEAK = 2,
	OS_1 = 10,
	OS_2 = 11,
	OS_3 = 12,
	PROC_1 = 13,
	PROC_2 = 14,
	PROC_3 = 15
}

export enum SymInfoType {
	NOTYPE = 0,
	OBJECT = 1,
	FUNC = 2,
	SECTION = 3,
	FILE = 4,
	OS_1 = 10,
	OS_2 = 11,
	OS_3 = 12,
	PROC_1 = 13,
	PROC_2 = 14,
	PROC_3 = 15
}

export class ElfDwarfLoader {
	private symbolEntries: ElfSymbol[] = [];

	constructor() {
	}

	parseElfLoader(elf: ElfLoader) {
		//this.parseDebugLine(elf);
		this.parseSymtab(elf);
	}

	private parseSymtab(elf: ElfLoader) {
		console.log('ElfDwarfLoader.parseSymtab');
        const symtabHeader = elf.sectionHeadersByName[".symtab"];
        if (!symtabHeader) return;

        const nameSection = elf.sectionHeaders[symtabHeader.link];

        const nameStream = nameSection.stream!.sliceWithLength(0);
        const stream = symtabHeader.stream!.sliceWithLength(0);

        let n = 0;
        try {
			while (stream.available > 0) {
                const entry = ElfSymbol.struct.read(stream);
                entry.name = nameStream.sliceWithLength(entry.nameIndex).readStringz();
				entry.index = n;
				this.symbolEntries.push(entry);
				n++;
			}
		} catch (e) {
			console.warn(e);
		}

		this.symbolEntries.sortBy(item => item.value);
	}

	getSymbolAt(address: number): ISymbol | null {
		//console.log(`this.symbolEntries: ${this.symbolEntries.length}`);
		for (let n = 0; n < this.symbolEntries.length; n++) {
            const entry = this.symbolEntries[n];
            if (entry.contains(address)) return entry;
		}
		/*
		return this.symbolEntries.binarySearchValue((item) => {
			if (address < item.value) return +1;
			if (address >= item.value + item.size) return -1;
			return 0;
		});
		*/
		return null;
	}

	private parseDebugLine(elf: ElfLoader) {
		console.log('ElfDwarfLoader.parseDebugLine');
        const sectionHeader = elf.sectionHeadersByName[".debug_line"];
        console.log(sectionHeader);
        const stream = sectionHeader.stream!.sliceWithLength(0);
        const header = ElfDwarfHeader.struct.read(stream);
        console.log(header);
        const opcodes = StructArray<number>(Uleb128, header.opcode_base).read(stream);
        console.log(opcodes);
		while (stream.available > 0) {
			console.log('item:');
            const item = StringzVariable.read(stream);
            if (!item.length) break;
			console.log(item);
		}

		while (stream.available > 0) {
            const entry = FileEntry.struct.read(stream);
            console.log(entry);
			if (!entry.name.length) break;
		}
	}
}
