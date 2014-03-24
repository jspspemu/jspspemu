var core;
(function (core) {
    (function (cpu) {
        var MipsAssembler = (function () {
            function MipsAssembler() {
                this.instructions = core.cpu.Instructions.instance;
            }
            MipsAssembler.prototype.assembleToMemory = function (memory, PC, lines) {
                for (var n = 0; n < lines.length; n++) {
                    var instructions = this.assemble(PC, lines[n]);
                    for (var m = 0; m < instructions.length; m++) {
                        var instruction = instructions[m];
                        memory.writeInt32(PC, instruction.data);
                        PC += 4;
                    }
                }
            };

            MipsAssembler.prototype.assemble = function (PC, line) {
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

                var formatPattern = instructionType.format.replace('(', '\\(').replace(')', '\\)').replace(/(%\w+)/g, function (type) {
                    types.push(type);

                    switch (type) {
                        case '%J':
                        case '%s':
                        case '%d':
                        case '%t':
                            return '([$r]\\d+)';
                        case '%i':
                            return '((?:0b|0x|\\-)?[0-9A-Fa-f_]+)';
                        case '%C':
                            return '((?:0b|0x|\\-)?[0-9A-Fa-f_]+)';
                        default:
                            throw ("MipsAssembler.Transform: Unknown type '" + type + "'");
                    }
                }).replace(/\s+/g, '\\s*');

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
            };

            MipsAssembler.prototype.decodeRegister = function (name) {
                //console.log(name);
                if (name.charAt(0) == '$')
                    return parseInt(name.substr(1));
                if (name.charAt(0) == 'r')
                    return parseInt(name.substr(1));
                throw ('Invalid register "' + name + '"');
            };

            MipsAssembler.prototype.decodeInteger = function (str) {
                str = str.replace(/_/g, '');
                if (str.substr(0, 2) == '0b')
                    return parseInt(str.substr(2), 2);
                if (str.substr(0, 2) == '0x')
                    return parseInt(str.substr(2), 16);
                return parseInt(str, 10);
            };

            MipsAssembler.prototype.update = function (instruction, type, value) {
                switch (type) {
                    case '%J':
                    case '%s':
                        instruction.rs = this.decodeRegister(value);
                        break;
                    case '%d':
                        instruction.rd = this.decodeRegister(value);
                        break;
                    case '%t':
                        instruction.rt = this.decodeRegister(value);
                        break;
                    case '%i':
                        instruction.imm16 = this.decodeInteger(value);
                        break;
                    case '%C':
                        instruction.syscall = this.decodeInteger(value);
                        break;
                    default:
                        throw ("MipsAssembler.Update: Unknown type '" + type + "'");
                }
            };
            return MipsAssembler;
        })();
        cpu.MipsAssembler = MipsAssembler;

        var MipsDisassembler = (function () {
            function MipsDisassembler() {
                this.instructions = core.cpu.Instructions.instance;
            }
            MipsDisassembler.prototype.encodeRegister = function (index) {
                return '$' + index;
            };

            MipsDisassembler.prototype.disassemble = function (instruction) {
                var _this = this;
                var instructionType = this.instructions.findByData(instruction.data);
                var arguments = instructionType.format.replace(/(\%\w+)/g, function (type) {
                    switch (type) {
                        case '%s':
                            return _this.encodeRegister(instruction.rs);
                            break;
                        case '%d':
                            return _this.encodeRegister(instruction.rd);
                            break;
                        case '%t':
                            return _this.encodeRegister(instruction.rt);
                            break;
                        default:
                            throw ("MipsDisassembler.Disassemble: Unknown type '" + type + "'");
                    }
                });
                return instructionType.name + ' ' + arguments;
            };
            return MipsDisassembler;
        })();
        cpu.MipsDisassembler = MipsDisassembler;
    })(core.cpu || (core.cpu = {}));
    var cpu = core.cpu;
})(core || (core = {}));
//# sourceMappingURL=assembler.js.map
