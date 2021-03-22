import "../../emu/global"

import {addressToHex, sprintf, StringDictionary} from "../../global/utils";
import {Instructions} from "./cpu_instructions";
import {Memory} from "../memory";
import {Instruction} from "./cpu_instruction";
import {parseIntFormat, xrange} from "../../global/math";

class Labels {
	public labels: StringDictionary<number> = {};
}

export class MipsAssemblerResult {
	public constructor(public entrypoint:number) {
		
	}
}

export class MipsAssembler {
	private instructions: Instructions = Instructions.instance;

	constructor() {
	}

	assembleToMemory(memory: Memory, startPC: number, lines: string[]):MipsAssemblerResult {
        const labels = new Labels();
        let entryPoint = startPC;
        for (let n = 0; n < 2; n++) { // hack to get labels working without patching or extra code
            let PC = startPC;
            for (let line of lines) {
				switch (line.substr(0, 1)) {
					case '.':
						switch (line) {
							case '.entrypoint': entryPoint = PC; break;
							default: throw new Error(`Invalid ${line}`);
						}
						break;
					case ':':
						labels.labels[line.substr(1)] = PC;
						break;
					default:
                        const instructions = this.assemble(PC, line, labels);
                        for (let instruction of instructions) {
							memory.writeInt32(PC, instruction.IDATA);
							PC += 4;
						}
						break;
				}
			}
		}
		return new MipsAssemblerResult(entryPoint);
	}

	assemble(PC: number, line: string, labels?:Labels): Instruction[] {
		if (labels == null) labels = new Labels();
		//console.log(line);

        let matches = line.match(/^\s*(\w+)(.*)$/);
        if (matches == null) throw new Error(`Invalid assembly line '${line}'`)
        const instructionName = matches[1];
        const instructionArguments = matches[2].replace(/^\s+/, '').replace(/\s+$/, '');

        switch (instructionName) {
			case 'nop': return this.assemble(PC, 'sll r0, r0, 0');
			case 'li':
                const parts = instructionArguments.split(',');
                //console.log(parts);
				return this.assemble(PC, `addiu ${parts[0]}, r0, ${parts[1]}`);
		}

        const instructionType = this.instructions.findByName(instructionName);
        const instruction = new Instruction(PC, instructionType.vm.value);
        const types: string[] = [];

        const formatPattern = instructionType.format
			.replace('(', '\\(')
			.replace(')', '\\)')
			.replace(/(%\w+)/g, (type) => {
				types.push(type);

				switch (type) {
					// Register
					case '%J': case '%s': case '%d': case '%t': return '([$r]\\d+)';
					// Immediate
					case '%i': case '%C': case '%c': case '%a': return '((?:0b|0x|\\-)?[0-9A-Fa-f_]+)';
					// Label
					case '%j': case '%O': return '(\\w+)';
					default: throw (new Error("MipsAssembler.Transform: Unknown type '" + type + "'"));
				}
			})
			.replace(/\s+/g, '\\s*')
		;
		//console.log(formatPattern);
        const regex = new RegExp(`^${formatPattern}$`, '');

        //console.log(line);
		//console.log(formatPattern);

        matches = instructionArguments.match(regex);
        //console.log(matches);
		//console.log(types);

		if (matches === null) {
			throw ('Not matching ' + instructionArguments + ' : ' + regex + ' : ' + instructionType.format);
		}

		for (let n = 0; n < types.length; n++) {
            const type = types[n];
            const match = matches[n + 1];
            //console.log(type + ' = ' + match);
			this.update(instruction, type, match, labels);
		}

		//console.log(instructionType);
		//console.log(matches);

		return [instruction];
	}

	private decodeRegister(name: string) {
		//console.log(name);
		if (name.charAt(0) == '$') return parseInt(name.substr(1));
		if (name.charAt(0) == 'r') return parseInt(name.substr(1));
		throw ('Invalid register "' + name + '"');
	}

	private decodeInteger(str: string) { return parseIntFormat(str) }

	private update(instruction: Instruction, type: string, value: string, labels: Labels) {
		switch (type) {
			case '%J': case '%s': instruction.rs = this.decodeRegister(value); break;
			case '%d': instruction.rd = this.decodeRegister(value); break;
			case '%t': instruction.rt = this.decodeRegister(value); break;
			case '%a': case '%i': instruction.imm16 = this.decodeInteger(value); break;
			case '%C': instruction.vsyscall = this.decodeInteger(value); break;
			case '%c': instruction.vsyscall = this.decodeInteger(value); break;
			case '%O': instruction.branch_address = labels.labels[value]; break;
			case '%j': instruction.jump_address = labels.labels[value]; break;
			default: throw (`MipsAssembler.Update: Unknown type '${type}' with value '${value}'`);
		}
	}
}

export class MipsDisassembler {
	private instructions: Instructions = Instructions.instance;

	constructor() {
	}

	// noinspection JSMethodCanBeStatic
    private encodeRegister(index: number) { return `$${index}`; }

	disassemble(instruction: Instruction) {
	    if (instruction.IDATA == 0) return 'nop'

        const instructionType = this.instructions.findByData(instruction.IDATA);
        const args = instructionType.format.replace(/(%\w+)/g, (type) => {
			switch (type) {
                case '%J': case '%s': return this.encodeRegister(instruction.rs);
				case '%d': return this.encodeRegister(instruction.rd);
				case '%t': return this.encodeRegister(instruction.rt);
                case '%i': return `${instruction.imm16}`;
                case '%I': return `${addressToHex(instruction.imm16 << 16)}`;
                case '%j': return `${addressToHex(instruction.jump_real)}`;
                case '%a': return `${instruction.pos}`;
				default: return `UNHANDLED[${type}]`
			}
		});
		return `${instructionType.name} ${args}`;
	}

	disassembleMemory(memory: Memory, PC: number) {
	    return this.disassemble(Instruction.fromMemoryAndPC(memory, PC))
    }

    disassembleMemoryWithAddress(memory: Memory, PC: number) {
        return sprintf("0x%08X[0x%08X]: %s", PC, memory.readInt32(PC), this.disassembleMemory(memory, PC))
    }

    disassembleMemoryWithAddressArray(memory: Memory, PC: number, count: number): string[] {
	    return xrange(0, count).map(n => this.disassembleMemoryWithAddress(memory, PC + n * 4))
    }

    dump(memory: Memory, PC: number, count: number, print: ((msg: String) => void) = (it => console.log(it))) {
	    for (const line of this.disassembleMemoryWithAddressArray(memory, PC, count)) {
            print(line)
        }
    }
}

