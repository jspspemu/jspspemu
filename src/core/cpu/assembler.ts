module core.cpu {
	export class MipsAssembler {
		private instructions: core.cpu.Instructions = core.cpu.Instructions.instance;

		constructor() {
		}

		assembleToMemory(memory: Memory, PC: number, lines: string[]) {
			for (var n = 0; n < lines.length; n++) {
				var instructions = this.assemble(PC, lines[n]);
				for (var m = 0; m < instructions.length; m++) {
					var instruction = instructions[m];
					memory.writeInt32(PC, instruction.data);
					PC += 4;
				}
			}
		}

		assemble(PC: number, line: string): core.cpu.Instruction[] {
			//console.log(line);

			var matches = line.match(/^\s*(\w+)(.*)$/);
			var instructionName = matches[1];
			var instructionArguments = matches[2].replace(/^\s+/, '').replace(/\s+$/, '');

			switch (instructionName) {
				case 'li':
					var parts = instructionArguments.split(',');
					//console.log(parts);
					return this.assemble(PC, 'addiu ' + parts[0] + ', r0, ' + parts[1]);
			}

			var instructionType = this.instructions.findByName(instructionName);
			var instruction = new core.cpu.Instruction(PC, instructionType.vm.value);
			var types = [];

			var formatPattern = instructionType.format
				.replace('(', '\\(')
				.replace(')', '\\)')
				.replace(/(%\w+)/g, (type) => {
					types.push(type);

					switch (type) {
						case '%J':
						case '%s': case '%d': case '%t': return '([$r]\\d+)';
						case '%i': return '((?:0b|0x|\\-)?[0-9A-Fa-f_]+)';
						case '%C': return '((?:0b|0x|\\-)?[0-9A-Fa-f_]+)';
						default: throw ("MipsAssembler.Transform: Unknown type '" + type + "'");
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
				this.update(instruction, type, match);
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

		private update(instruction: core.cpu.Instruction, type: string, value: string) {
			switch (type) {
				case '%J':
				case '%s': instruction.rs = this.decodeRegister(value); break;
				case '%d': instruction.rd = this.decodeRegister(value); break;
				case '%t': instruction.rt = this.decodeRegister(value); break;
				case '%i': instruction.imm16 = this.decodeInteger(value); break;
				case '%C': instruction.syscall = this.decodeInteger(value); break;
				default: throw ("MipsAssembler.Update: Unknown type '" + type + "'");
			}
		}
	}

	export class MipsDisassembler {
		private instructions: core.cpu.Instructions = core.cpu.Instructions.instance;

		constructor() {
		}

		private encodeRegister(index: number) {
			return '$' + index;
		}

		disassemble(instruction: core.cpu.Instruction) {
			var instructionType = this.instructions.findByData(instruction.data);
			var arguments = instructionType.format.replace(/(\%\w+)/g, (type) => {
				switch (type) {
					case '%s': return this.encodeRegister(instruction.rs); break;
					case '%d': return this.encodeRegister(instruction.rd); break;
					case '%t': return this.encodeRegister(instruction.rt); break;
					default: throw ("MipsDisassembler.Disassemble: Unknown type '" + type + "'");
				}
			});
			return instructionType.name + ' ' + arguments;
		}
	}
}
