import "../../emu/global"

import {StringDictionary} from "../../global/utils";
import {Instruction, Instructions} from "./cpu_instructions";
import {Memory} from "../memory";

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
		var labels = new Labels();
		var entryPoint = startPC;
		for (var n = 0; n < 2; n++) { // hack to get labels working without patching or extra code
			var PC = startPC;
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
						var instructions = this.assemble(PC, line, labels);
						for (let instruction of instructions) {
							memory.writeInt32(PC, instruction.data);
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
		
		var matches = line.match(/^\s*(\w+)(.*)$/);
		var instructionName = matches[1];
		var instructionArguments = matches[2].replace(/^\s+/, '').replace(/\s+$/, '');

		switch (instructionName) {
			case 'nop': return this.assemble(PC, 'sll r0, r0, 0');
			case 'li':
				var parts = instructionArguments.split(',');
				//console.log(parts);
				return this.assemble(PC, 'addiu ' + parts[0] + ', r0, ' + parts[1]);
		}

		var instructionType = this.instructions.findByName(instructionName);
		var instruction = new Instruction(PC, instructionType.vm.value);
		var types:string[] = [];

		var formatPattern = instructionType.format
			.replace('(', '\\(')
			.replace(')', '\\)')
			.replace(/(%\w+)/g, (type) => {
				types.push(type);

				switch (type) {
					// Register
					case '%J': case '%s': case '%d': case '%t':
						return '([$r]\\d+)';
					// Immediate
					case '%i': case '%C': case '%c': case '%a': 
						return '((?:0b|0x|\\-)?[0-9A-Fa-f_]+)';
					// Label
					case '%j': case '%O':
						return '(\\w+)';
					default: throw (new Error("MipsAssembler.Transform: Unknown type '" + type + "'"));
				}
			})
			.replace(/\s+/g, '\\s*')
		;
		//console.log(formatPattern);
		var regex = new RegExp('^' + formatPattern + '$', '');

		//console.log(line);
		//console.log(formatPattern);

		var matches = instructionArguments.match(regex);
		//console.log(matches);
		//console.log(types);

		if (matches === null) {
			throw ('Not matching ' + instructionArguments + ' : ' + regex + ' : ' + instructionType.format);
		}

		for (var n = 0; n < types.length; n++) {
			var type = types[n];
			var match = matches[n + 1];
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

	private decodeInteger(str: string) {
		str = str.replace(/_/g, '');
		if (str.substr(0, 2) == '0b') return parseInt(str.substr(2), 2);
		if (str.substr(0, 2) == '0x') return parseInt(str.substr(2), 16);
		return parseInt(str, 10);
	}

	private update(instruction: Instruction, type: string, value: string, labels: Labels) {
		switch (type) {
			case '%J':
			case '%s': instruction.rs = this.decodeRegister(value); break;
			case '%d': instruction.rd = this.decodeRegister(value); break;
			case '%t': instruction.rt = this.decodeRegister(value); break;
			case '%a':
			case '%i': instruction.imm16 = this.decodeInteger(value); break;
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

	private encodeRegister(index: number) {
		return '$' + index;
	}

	disassemble(instruction: Instruction) {
		var instructionType = this.instructions.findByData(instruction.data);
		var args = instructionType.format.replace(/(\%\w+)/g, (type) => {
			switch (type) {
				case '%s': return this.encodeRegister(instruction.rs);
				case '%d': return this.encodeRegister(instruction.rd);
				case '%t': return this.encodeRegister(instruction.rt);
				default: throw ("MipsDisassembler.Disassemble: Unknown type '" + type + "'");
			}
		});
		return instructionType.name + ' ' + args;
	}
}

