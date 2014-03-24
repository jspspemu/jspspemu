var core;
(function (core) {
    (function (cpu) {
        var ADDR_TYPE_NONE = 0;
        var ADDR_TYPE_REG = 1;
        var ADDR_TYPE_16 = 2;
        var ADDR_TYPE_26 = 3;
        var INSTR_TYPE_PSP = (1 << 0);
        var INSTR_TYPE_SYSCALL = (1 << 1);
        var INSTR_TYPE_B = (1 << 2);
        var INSTR_TYPE_LIKELY = (1 << 3);
        var INSTR_TYPE_JAL = (1 << 4);
        var INSTR_TYPE_JUMP = (1 << 5);
        var INSTR_TYPE_BREAK = (1 << 6);

        function VM(format) {
            var counts = {
                "cstw": 1, "cstz": 1, "csty": 1, "cstx": 1,
                "absw": 1, "absz": 1, "absy": 1, "absx": 1,
                "mskw": 1, "mskz": 1, "msky": 1, "mskx": 1,
                "negw": 1, "negz": 1, "negy": 1, "negx": 1,
                "one": 1, "two": 1, "vt1": 1,
                "vt2": 2,
                "satw": 2, "satz": 2, "saty": 2, "satx": 2,
                "swzw": 2, "swzz": 2, "swzy": 2, "swzx": 2,
                "imm3": 3,
                "imm4": 4,
                "fcond": 4,
                "c0dr": 5, "c0cr": 5, "c1dr": 5, "c1cr": 5, "imm5": 5, "vt5": 5,
                "rs": 5, "rd": 5, "rt": 5, "sa": 5, "lsb": 5, "msb": 5, "fs": 5, "fd": 5, "ft": 5,
                "vs": 7, "vt": 7, "vd": 7, "imm7": 7,
                "imm8": 8,
                "imm14": 14,
                "imm16": 16,
                "imm20": 20,
                "imm26": 26
            };

            var value = 0;
            var mask = 0;

            format.split(':').forEach(function (item) {
                // normal chunk
                if (/^[01\-]+$/.test(item)) {
                    for (var n = 0; n < item.length; n++) {
                        value <<= 1;
                        mask <<= 1;
                        if (item[n] == '0') {
                            value |= 0;
                            mask |= 1;
                        }
                        if (item[n] == '1') {
                            value |= 1;
                            mask |= 1;
                        }
                        if (item[n] == '-') {
                            value |= 0;
                            mask |= 0;
                        }
                    }
                } else {
                    var displacement = counts[item];
                    if (displacement === undefined)
                        throw ("Invalid item '" + item + "'");
                    value <<= displacement;
                    mask <<= displacement;
                }
            });

            return { value: value, mask: mask };
        }

        var InstructionType = (function () {
            function InstructionType(name, vm, format, addressType, instructionType) {
                this.name = name;
                this.vm = vm;
                this.format = format;
                this.addressType = addressType;
                this.instructionType = instructionType;
            }
            InstructionType.prototype.match = function (i32) {
                //printf("%08X | %08X | %08X", i32, this.vm.value, this.vm.mask);
                return (i32 & this.vm.mask) == (this.vm.value & this.vm.mask);
            };

            InstructionType.prototype.isInstructionType = function (mask) {
                return (this.instructionType & mask) != 0;
            };

            Object.defineProperty(InstructionType.prototype, "isSyscall", {
                get: function () {
                    return this.isInstructionType(INSTR_TYPE_SYSCALL);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(InstructionType.prototype, "isBreak", {
                get: function () {
                    return this.isInstructionType(INSTR_TYPE_BREAK);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(InstructionType.prototype, "hasDelayedBranch", {
                get: function () {
                    return this.isInstructionType(INSTR_TYPE_B) || this.isInstructionType(INSTR_TYPE_JAL) || this.isInstructionType(INSTR_TYPE_JUMP);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(InstructionType.prototype, "isLikely", {
                get: function () {
                    return this.isInstructionType(INSTR_TYPE_LIKELY);
                },
                enumerable: true,
                configurable: true
            });

            InstructionType.prototype.toString = function () {
                return sprintf("InstructionType('%s', %08X, %08X)", this.name, this.vm.value, this.vm.mask);
            };
            return InstructionType;
        })();
        cpu.InstructionType = InstructionType;

        var Instructions = (function () {
            function Instructions() {
                var _this = this;
                this.instructionTypeListByName = {};
                this.instructionTypeList = [];
                var ID = function (name, vm, format, addressType, instructionType) {
                    _this.add(name, vm, format, addressType, instructionType);
                };

                // Arithmetic operations.
                ID("add", VM("000000:rs:rt:rd:00000:100000"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("addu", VM("000000:rs:rt:rd:00000:100001"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("addi", VM("001000:rs:rt:imm16"), "%t, %s, %i", ADDR_TYPE_NONE, 0);
                ID("addiu", VM("001001:rs:rt:imm16"), "%t, %s, %i", ADDR_TYPE_NONE, 0);
                ID("sub", VM("000000:rs:rt:rd:00000:100010"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("subu", VM("000000:rs:rt:rd:00000:100011"), "%d, %s, %t", ADDR_TYPE_NONE, 0);

                // Logical Operations.
                ID("and", VM("000000:rs:rt:rd:00000:100100"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("andi", VM("001100:rs:rt:imm16"), "%t, %s, %I", ADDR_TYPE_NONE, 0);
                ID("nor", VM("000000:rs:rt:rd:00000:100111"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("or", VM("000000:rs:rt:rd:00000:100101"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("ori", VM("001101:rs:rt:imm16"), "%t, %s, %I", ADDR_TYPE_NONE, 0);
                ID("xor", VM("000000:rs:rt:rd:00000:100110"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("xori", VM("001110:rs:rt:imm16"), "%t, %s, %I", ADDR_TYPE_NONE, 0);

                // Shift Left/Right Logical/Arithmethic (Variable).
                ID("sll", VM("000000:00000:rt:rd:sa:000000"), "%d, %t, %a", ADDR_TYPE_NONE, 0);
                ID("sllv", VM("000000:rs:rt:rd:00000:000100"), "%d, %t, %s", ADDR_TYPE_NONE, 0);
                ID("sra", VM("000000:00000:rt:rd:sa:000011"), "%d, %t, %a", ADDR_TYPE_NONE, 0);
                ID("srav", VM("000000:rs:rt:rd:00000:000111"), "%d, %t, %s", ADDR_TYPE_NONE, 0);
                ID("srl", VM("000000:00000:rt:rd:sa:000010"), "%d, %t, %a", ADDR_TYPE_NONE, 0);
                ID("srlv", VM("000000:rs:rt:rd:00000:000110"), "%d, %t, %s", ADDR_TYPE_NONE, 0);
                ID("rotr", VM("000000:00001:rt:rd:sa:000010"), "%d, %t, %a", ADDR_TYPE_NONE, 0);
                ID("rotrv", VM("000000:rs:rt:rd:00001:000110"), "%d, %t, %s", ADDR_TYPE_NONE, 0);

                // Set Less Than (Immediate) (Unsigned).
                ID("slt", VM("000000:rs:rt:rd:00000:101010"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("slti", VM("001010:rs:rt:imm16"), "%t, %s, %i", ADDR_TYPE_NONE, 0);
                ID("sltu", VM("000000:rs:rt:rd:00000:101011"), "%d, %s, %t", ADDR_TYPE_NONE, 0);
                ID("sltiu", VM("001011:rs:rt:imm16"), "%t, %s, %i", ADDR_TYPE_NONE, 0);

                // Load Upper Immediate.
                ID("lui", VM("001111:00000:rt:imm16"), "%t, %I", ADDR_TYPE_NONE, 0);

                // Sign Extend Byte/Half word.
                ID("seb", VM("011111:00000:rt:rd:10000:100000"), "%d, %t", ADDR_TYPE_NONE, 0);
                ID("seh", VM("011111:00000:rt:rd:11000:100000"), "%d, %t", ADDR_TYPE_NONE, 0);

                // BIT REVerse.
                ID("bitrev", VM("011111:00000:rt:rd:10100:100000"), "%d, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // MAXimum/MINimum.
                ID("max", VM("000000:rs:rt:rd:00000:101100"), "%d, %s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("min", VM("000000:rs:rt:rd:00000:101101"), "%d, %s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // DIVide (Unsigned).
                ID("div", VM("000000:rs:rt:00000:00000:011010"), "%s, %t", ADDR_TYPE_NONE, 0);
                ID("divu", VM("000000:rs:rt:00000:00000:011011"), "%s, %t", ADDR_TYPE_NONE, 0);

                // MULTiply (Unsigned).
                ID("mult", VM("000000:rs:rt:00000:00000:011000"), "%s, %t", ADDR_TYPE_NONE, 0);
                ID("multu", VM("000000:rs:rt:00000:00000:011001"), "%s, %t", ADDR_TYPE_NONE, 0);

                // Multiply ADD/SUBstract (Unsigned).
                ID("madd", VM("000000:rs:rt:00000:00000:011100"), "%s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("maddu", VM("000000:rs:rt:00000:00000:011101"), "%s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("msub", VM("000000:rs:rt:00000:00000:101110"), "%s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("msubu", VM("000000:rs:rt:00000:00000:101111"), "%s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Move To/From HI/LO.
                ID("mfhi", VM("000000:00000:00000:rd:00000:010000"), "%d", ADDR_TYPE_NONE, 0);
                ID("mflo", VM("000000:00000:00000:rd:00000:010010"), "%d", ADDR_TYPE_NONE, 0);
                ID("mthi", VM("000000:rs:00000:00000:00000:010001"), "%s", ADDR_TYPE_NONE, 0);
                ID("mtlo", VM("000000:rs:00000:00000:00000:010011"), "%s", ADDR_TYPE_NONE, 0);

                // Move if Zero/Non zero.
                ID("movz", VM("000000:rs:rt:rd:00000:001010"), "%d, %s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("movn", VM("000000:rs:rt:rd:00000:001011"), "%d, %s, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // EXTract/INSert.
                ID("ext", VM("011111:rs:rt:msb:lsb:000000"), "%t, %s, %a, %ne", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("ins", VM("011111:rs:rt:msb:lsb:000100"), "%t, %s, %a, %ni", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Count Leading Ones/Zeros in word.
                ID("clz", VM("000000:rs:00000:rd:00000:010110"), "%d, %s", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("clo", VM("000000:rs:00000:rd:00000:010111"), "%d, %s", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Word Swap Bytes Within Halfwords/Words.
                ID("wsbh", VM("011111:00000:rt:rd:00010:100000"), "%d, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("wsbw", VM("011111:00000:rt:rd:00011:100000"), "%d, %t", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("beq", VM("000100:rs:rt:imm16"), "%s, %t, %O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("beql", VM("010100:rs:rt:imm16"), "%s, %t, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);

                // Branch on Greater Equal Zero (And Link) (Likely).
                ID("bgez", VM("000001:rs:00001:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bgezl", VM("000001:rs:00011:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);
                ID("bgezal", VM("000001:rs:10001:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_JAL);
                ID("bgezall", VM("000001:rs:10011:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_JAL | INSTR_TYPE_LIKELY);

                // Branch on Less Than Zero (And Link) (Likely).
                ID("bltz", VM("000001:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bltzl", VM("000001:rs:00010:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);
                ID("bltzal", VM("000001:rs:10000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_JAL);
                ID("bltzall", VM("000001:rs:10010:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_JAL | INSTR_TYPE_LIKELY);

                // Branch on Less Or Equals than Zero (Likely).
                ID("blez", VM("000110:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("blezl", VM("010110:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);

                // Branch on Great Than Zero (Likely).
                ID("bgtz", VM("000111:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bgtzl", VM("010111:rs:00000:imm16"), "%s, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);

                // Branch on Not Equals (Likely).
                ID("bne", VM("000101:rs:rt:imm16"), "%s, %t, %O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bnel", VM("010101:rs:rt:imm16"), "%s, %t, %O", ADDR_TYPE_16, INSTR_TYPE_B | INSTR_TYPE_LIKELY);

                // Jump (And Link) (Register).
                ID("j", VM("000010:imm26"), "%j", ADDR_TYPE_26, INSTR_TYPE_JUMP);
                ID("jr", VM("000000:rs:00000:00000:00000:001000"), "%J", ADDR_TYPE_REG, INSTR_TYPE_JUMP);
                ID("jalr", VM("000000:rs:00000:rd:00000:001001"), "%J, %d", ADDR_TYPE_REG, INSTR_TYPE_JAL);
                ID("jal", VM("000011:imm26"), "%j", ADDR_TYPE_26, INSTR_TYPE_JAL);

                // Branch on C1 False/True (Likely).
                ID("bc1f", VM("010001:01000:00000:imm16"), "%O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bc1t", VM("010001:01000:00001:imm16"), "%O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bc1fl", VM("010001:01000:00010:imm16"), "%O", ADDR_TYPE_16, INSTR_TYPE_B);
                ID("bc1tl", VM("010001:01000:00011:imm16"), "%O", ADDR_TYPE_16, INSTR_TYPE_B);

                ID("lb", VM("100000:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("lh", VM("100001:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("lw", VM("100011:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("lwl", VM("100010:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("lwr", VM("100110:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("lbu", VM("100100:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("lhu", VM("100101:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);

                // Store Byte/Half word/Word (Left/Right).
                ID("sb", VM("101000:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("sh", VM("101001:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("sw", VM("101011:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("swl", VM("101010:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("swr", VM("101110:rs:rt:imm16"), "%t, %i(%s)", ADDR_TYPE_NONE, 0);

                // Load Linked word.
                // Store Conditional word.
                ID("ll", VM("110000:rs:rt:imm16"), "%t, %O", ADDR_TYPE_NONE, 0);
                ID("sc", VM("111000:rs:rt:imm16"), "%t, %O", ADDR_TYPE_NONE, 0);

                // Load Word to Cop1 floating point.
                // Store Word from Cop1 floating point.
                ID("lwc1", VM("110001:rs:ft:imm16"), "%T, %i(%s)", ADDR_TYPE_NONE, 0);
                ID("swc1", VM("111001:rs:ft:imm16"), "%T, %i(%s)", ADDR_TYPE_NONE, 0);

                // Binary Floating Point Unit Operations
                ID("add.s", VM("010001:10000:ft:fs:fd:000000"), "%D, %S, %T", ADDR_TYPE_NONE, 0);
                ID("sub.s", VM("010001:10000:ft:fs:fd:000001"), "%D, %S, %T", ADDR_TYPE_NONE, 0);
                ID("mul.s", VM("010001:10000:ft:fs:fd:000010"), "%D, %S, %T", ADDR_TYPE_NONE, 0);
                ID("div.s", VM("010001:10000:ft:fs:fd:000011"), "%D, %S, %T", ADDR_TYPE_NONE, 0);

                // Unary Floating Point Unit Operations
                ID("sqrt.s", VM("010001:10000:00000:fs:fd:000100"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("abs.s", VM("010001:10000:00000:fs:fd:000101"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("mov.s", VM("010001:10000:00000:fs:fd:000110"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("neg.s", VM("010001:10000:00000:fs:fd:000111"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("round.w.s", VM("010001:10000:00000:fs:fd:001100"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("trunc.w.s", VM("010001:10000:00000:fs:fd:001101"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("ceil.w.s", VM("010001:10000:00000:fs:fd:001110"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("floor.w.s", VM("010001:10000:00000:fs:fd:001111"), "%D, %S", ADDR_TYPE_NONE, 0);

                // Convert
                ID("cvt.s.w", VM("010001:10100:00000:fs:fd:100000"), "%D, %S", ADDR_TYPE_NONE, 0);
                ID("cvt.w.s", VM("010001:10000:00000:fs:fd:100100"), "%D, %S", ADDR_TYPE_NONE, 0);

                // Move float point registers
                ID("mfc1", VM("010001:00000:rt:c1dr:00000:000000"), "%t, %S", ADDR_TYPE_NONE, 0);
                ID("mtc1", VM("010001:00100:rt:c1dr:00000:000000"), "%t, %S", ADDR_TYPE_NONE, 0);

                // CFC1 -- move Control word from/to floating point (C1)
                ID("cfc1", VM("010001:00010:rt:c1cr:00000:000000"), "%t, %p", ADDR_TYPE_NONE, 0);
                ID("ctc1", VM("010001:00110:rt:c1cr:00000:000000"), "%t, %p", ADDR_TYPE_NONE, 0);

                // Compare <condition> Single.
                ID("c.f.s", VM("010001:10000:ft:fs:00000:11:0000"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.un.s", VM("010001:10000:ft:fs:00000:11:0001"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.eq.s", VM("010001:10000:ft:fs:00000:11:0010"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ueq.s", VM("010001:10000:ft:fs:00000:11:0011"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.olt.s", VM("010001:10000:ft:fs:00000:11:0100"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ult.s", VM("010001:10000:ft:fs:00000:11:0101"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ole.s", VM("010001:10000:ft:fs:00000:11:0110"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ule.s", VM("010001:10000:ft:fs:00000:11:0111"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.sf.s", VM("010001:10000:ft:fs:00000:11:1000"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ngle.s", VM("010001:10000:ft:fs:00000:11:1001"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.seq.s", VM("010001:10000:ft:fs:00000:11:1010"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ngl.s", VM("010001:10000:ft:fs:00000:11:1011"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.lt.s", VM("010001:10000:ft:fs:00000:11:1100"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.nge.s", VM("010001:10000:ft:fs:00000:11:1101"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.le.s", VM("010001:10000:ft:fs:00000:11:1110"), "%S, %T", ADDR_TYPE_NONE, 0);
                ID("c.ngt.s", VM("010001:10000:ft:fs:00000:11:1111"), "%S, %T", ADDR_TYPE_NONE, 0);

                // Syscall
                ID("syscall", VM("000000:imm20:001100"), "%C", ADDR_TYPE_NONE, INSTR_TYPE_SYSCALL);

                ID("cache", VM("101111--------------------------"), "%k, %o", ADDR_TYPE_NONE, 0);
                ID("sync", VM("000000:00000:00000:00000:00000:001111"), "", ADDR_TYPE_NONE, 0);

                ID("break", VM("000000:imm20:001101"), "%c", ADDR_TYPE_NONE, 0);
                ID("dbreak", VM("011100:00000:00000:00000:00000:111111"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP | INSTR_TYPE_BREAK);
                ID("halt", VM("011100:00000:00000:00000:00000:000000"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // (D?/Exception) RETurn
                ID("dret", VM("011100:00000:00000:00000:00000:111110"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("eret", VM("010000:10000:00000:00000:00000:011000"), "", ADDR_TYPE_NONE, 0);

                // Move (From/To) IC
                ID("mfic", VM("011100:rt:00000:00000:00000:100100"), "%t, %p", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("mtic", VM("011100:rt:00000:00000:00000:100110"), "%t, %p", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Move (From/To) DR
                ID("mfdr", VM("011100:00000:----------:00000:111101"), "%t, %r", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("mtdr", VM("011100:00100:----------:00000:111101"), "%t, %r", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // C? (From/To) Cop0
                ID("cfc0", VM("010000:00010:----------:00000:000000"), "%t, %p", ADDR_TYPE_NONE, INSTR_TYPE_PSP); // CFC0(010000:00010:rt:c0cr:00000:000000)
                ID("ctc0", VM("010000:00110:----------:00000:000000"), "%t, %p", ADDR_TYPE_NONE, INSTR_TYPE_PSP); // CTC0(010000:00110:rt:c0cr:00000:000000)

                // Move (From/To) Cop0
                ID("mfc0", VM("010000:00000:----------:00000:000000"), "%t, %0", ADDR_TYPE_NONE, 0); // MFC0(010000:00000:rt:c0dr:00000:000000)
                ID("mtc0", VM("010000:00100:----------:00000:000000"), "%t, %0", ADDR_TYPE_NONE, 0); // MTC0(010000:00100:rt:c0dr:00000:000000)

                // Move From/to Vfpu (C?).
                ID("mfv", VM("010010:00:011:rt:0:0000000:0:vd"), "%t, %zs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("mfvc", VM("010010:00:011:rt:0:0000000:1:vd"), "%t, %2d", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("mtv", VM("010010:00:111:rt:0:0000000:0:vd"), "%t, %zs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("mtvc", VM("010010:00:111:rt:0:0000000:1:vd"), "%t, %2d", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Load/Store Vfpu (Left/Right).
                ID("lv.s", VM("110010:rs:vt5:imm14:vt2"), "%Xs, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("lv.q", VM("110110:rs:vt5:imm14:0:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("lvl.q", VM("110101:rs:vt5:imm14:0:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("lvr.q", VM("110101:rs:vt5:imm14:1:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("sv.q", VM("111110:rs:vt5:imm14:0:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu DOT product
                // Vfpu SCaLe/ROTate
                ID("vdot", VM("011001:001:vt:two:vs:one:vd"), "%zs, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vscl", VM("011001:010:vt:two:vs:one:vd"), "%zp, %yp, %xs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsge", VM("011011:110:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                //ID("vslt",        VM("011011:100:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vslt", VM("011011:111:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP); // FIXED 2013-07-14

                // ROTate
                ID("vrot", VM("111100:111:01:imm5:two:vs:one:vd"), "%zp, %ys, %vr", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu ZERO/ONE
                ID("vzero", VM("110100:00:000:0:0110:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vone", VM("110100:00:000:0:0111:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu MOVe/SiGN/Reverse SQuare root/COSine/Arc SINe/LOG2
                ID("vmov", VM("110100:00:000:0:0000:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vabs", VM("110100:00:000:0:0001:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vneg", VM("110100:00:000:0:0010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vocp", VM("110100:00:010:0:0100:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsgn", VM("110100:00:010:0:1010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vrcp", VM("110100:00:000:1:0000:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vrsq", VM("110100:00:000:1:0001:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsin", VM("110100:00:000:1:0010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vcos", VM("110100:00:000:1:0011:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vexp2", VM("110100:00:000:1:0100:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vlog2", VM("110100:00:000:1:0101:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsqrt", VM("110100:00:000:1:0110:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vasin", VM("110100:00:000:1:0111:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vnrcp", VM("110100:00:000:1:1000:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vnsin", VM("110100:00:000:1:1010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vrexp2", VM("110100:00:000:1:1100:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vsat0", VM("110100:00:000:0:0100:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsat1", VM("110100:00:000:0:0101:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu ConSTant
                ID("vcst", VM("110100:00:011:imm5:two:0000000:one:vd"), "%zp, %vk", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu Matrix MULtiplication
                ID("vmmul", VM("111100:000:vt:two:vs:one:vd"), "%zm, %tym, %xm", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // -
                ID("vhdp", VM("011001:100:vt:two:vs:one:vd"), "%zs, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vcrs.t", VM("011001:101:vt:1:vs:0:vd"), "%zt, %yt, %xt", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vcrsp.t", VM("111100:101:vt:1:vs:0:vd"), "%zt, %yt, %xt", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu Integer to(2) Color
                ID("vi2c", VM("110100:00:001:11:101:two:vs:one:vd"), "%zs, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vi2uc", VM("110100:00:001:11:100:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // -
                ID("vtfm2", VM("111100:001:vt:0:vs:1:vd"), "%zp, %ym, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vtfm3", VM("111100:010:vt:1:vs:0:vd"), "%zt, %yn, %xt", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vtfm4", VM("111100:011:vt:1:vs:1:vd"), "%zq, %yo, %xq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vhtfm2", VM("111100:001:vt:0:vs:0:vd"), "%zp, %ym, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vhtfm3", VM("111100:010:vt:0:vs:1:vd"), "%zt, %yn, %xt", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vhtfm4", VM("111100:011:vt:1:vs:0:vd"), "%zq, %yo, %xq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vsrt3", VM("110100:00:010:01000:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vfad", VM("110100:00:010:00110:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu MINimum/MAXium/ADD/SUB/DIV/MUL
                ID("vmin", VM("011011:010:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmax", VM("011011:011:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vadd", VM("011000:000:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsub", VM("011000:001:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vdiv", VM("011000:111:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmul", VM("011001:000:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Vfpu (Matrix) IDenTity
                ID("vidt", VM("110100:00:000:0:0011:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmidt", VM("111100:111:00:00011:two:0000000:one:vd"), "%zm", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("viim", VM("110111:11:0:vd:imm16"), "%xs, %vi", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vmmov", VM("111100:111:00:00000:two:vs:one:vd"), "%zm, %ym", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmzero", VM("111100:111:00:00110:two:0000000:one:vd"), "%zm", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmone", VM("111100:111:00:00111:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vnop", VM("111111:1111111111:00000:00000000000"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsync", VM("111111:1111111111:00000:01100100000"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vflush", VM("111111:1111111111:00000:10000001101"), "", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vpfxd", VM("110111:10:------------:mskw:mskz:msky:mskx:satw:satz:saty:satx"), "[%vp4, %vp5, %vp6, %vp7]", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vpfxs", VM("110111:00:----:negw:negz:negy:negx:cstw:cstz:csty:cstx:absw:absz:absy:absx:swzw:swzz:swzy:swzx"), "[%vp0, %vp1, %vp2, %vp3]", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vpfxt", VM("110111:01:----:negw:negz:negy:negx:cstw:cstz:csty:cstx:absw:absz:absy:absx:swzw:swzz:swzy:swzx"), "[%vp0, %vp1, %vp2, %vp3]", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vdet", VM("011001:110:vt:two:vs:one:vd"), "%zs, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vrnds", VM("110100:00:001:00:000:two:vs:one:0000000"), "%ys", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vrndi", VM("110100:00:001:00:001:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vrndf1", VM("110100:00:001:00:010:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vrndf2", VM("110100:00:001:00:011:two:0000000:one:vd"), "%zp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vcmp", VM("011011:000:vt:two:vs:one:000:imm4"), "%Zn, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vcmovf", VM("110100:10:101:01:imm3:two:vs:one:vd"), "%zp, %yp, %v3", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vcmovt", VM("110100:10:101:00:imm3:two:vs:one:vd"), "%zp, %yp, %v3", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vavg", VM("110100:00:010:00111:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vf2id", VM("110100:10:011:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vf2in", VM("110100:10:000:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vf2iu", VM("110100:10:010:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vf2iz", VM("110100:10:001:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vi2f", VM("110100:10:100:imm5:two:vs:one:vd"), "%zp, %yp, %v5", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vscmp", VM("011011:101:vt:two:vs:one:vd"), "%zp, %yp, %xp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmscl", VM("111100:100:vt:two:vs:one:vd"), "%zm, %ym, %xs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vt4444.q", VM("110100:00:010:11001:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vt5551.q", VM("110100:00:010:11010:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vt5650.q", VM("110100:00:010:11011:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vmfvc", VM("110100:00:010:10000:1:imm7:0:vd"), "%zs, %2s", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vmtvc", VM("110100:00:010:10001:0:vs:1:imm7"), "%2d, %ys", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("mfvme", VM("011010--------------------------"), "%t, %i", ADDR_TYPE_NONE, 0);
                ID("mtvme", VM("101100--------------------------"), "%t, %i", ADDR_TYPE_NONE, 0);

                ID("sv.s", VM("111010:rs:vt5:imm14:vt2"), "%Xs, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vfim", VM("110111:11:1:vt:imm16"), "%xs, %vh", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("svl.q", VM("111101:rs:vt5:imm14:0:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("svr.q", VM("111101:rs:vt5:imm14:1:vt1"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vbfy1", VM("110100:00:010:00010:two:vs:one:vd"), "%zp, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vbfy2", VM("110100:00:010:00011:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vf2h", VM("110100:00:001:10:010:two:vs:one:vd"), "%zs, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vh2f", VM("110100:00:001:10:011:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vi2s", VM("110100:00:001:11:111:two:vs:one:vd"), "%zs, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vi2us", VM("110100:00:001:11:110:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vlgb", VM("110100:00:001:10:111:two:vs:one:vd"), "%zs, %ys", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vqmul", VM("111100:101:vt:1:vs:1:vd"), "%zq, %yq, %xq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vs2i", VM("110100:00:001:11:011:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                // Working on it.
                //"110100:00:001:11:000:1000000010000001"
                ID("vc2i", VM("110100:00:001:11:001:two:vs:one:vd"), "%zs, %ys, %xs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vuc2i", VM("110100:00:001:11:000:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vsbn", VM("011000:010:vt:two:vs:one:vd"), "%zs, %ys, %xs", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vsbz", VM("110100:00:001:10110:two:vs:one:vd"), "%zs, %ys", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsocp", VM("110100:00:010:00101:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsrt1", VM("110100:00:010:00000:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsrt2", VM("110100:00:010:00001:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vsrt4", VM("110100:00:010:01001:two:vs:one:vd"), "%zq, %yq", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("vus2i", VM("110100:00:001:11010:two:vs:one:vd"), "%zq, %yp", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                ID("vwbn", VM("110100:11:imm8:two:vs:one:vd"), "%zs, %xs, %I", ADDR_TYPE_NONE, INSTR_TYPE_PSP);

                //ID("vwb.q",       VM("111110------------------------1-"), "%Xq, %Y", ADDR_TYPE_NONE, INSTR_TYPE_PSP);
                ID("bvf", VM("010010:01:000:imm3:00:imm16"), "%Zc, %O", ADDR_TYPE_16, INSTR_TYPE_PSP | INSTR_TYPE_B);
                ID("bvt", VM("010010:01:000:imm3:01:imm16"), "%Zc, %O", ADDR_TYPE_16, INSTR_TYPE_PSP | INSTR_TYPE_B);
                ID("bvfl", VM("010010:01:000:imm3:10:imm16"), "%Zc, %O", ADDR_TYPE_16, INSTR_TYPE_PSP | INSTR_TYPE_B | INSTR_TYPE_LIKELY);
                ID("bvtl", VM("010010:01:000:imm3:11:imm16"), "%Zc, %O", ADDR_TYPE_16, INSTR_TYPE_PSP | INSTR_TYPE_B | INSTR_TYPE_LIKELY);
            }
            Object.defineProperty(Instructions, "instance", {
                get: function () {
                    if (!Instructions._instance)
                        Instructions._instance = new Instructions();
                    return Instructions._instance;
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instructions.prototype, "instructions", {
                get: function () {
                    return this.instructionTypeList.slice(0);
                },
                enumerable: true,
                configurable: true
            });

            Instructions.prototype.add = function (name, vm, format, addressType, instructionType) {
                var it = new InstructionType(name, vm, format, addressType, instructionType);
                this.instructionTypeListByName[name] = it;
                this.instructionTypeList.push(it);
            };

            Instructions.prototype.findByName = function (name) {
                var instructionType = this.instructionTypeListByName[name];
                if (!instructionType)
                    throw ("Cannot find instruction " + sprintf("%s", name));
                return instructionType;
            };

            Instructions.prototype.findByData = function (i32, pc) {
                if (typeof pc === "undefined") { pc = 0; }
                //return this.slowFindByData(i32, pc);
                return this.fastFindByData(i32, pc);
            };

            Instructions.prototype.fastFindByData = function (i32, pc) {
                if (typeof pc === "undefined") { pc = 0; }
                if (!this.decoder) {
                    var switchCode = DecodingTable.createSwitch(this.instructionTypeList);
                    this.decoder = (new Function('instructionsByName', 'value', 'pc', switchCode));
                }
                try  {
                    return this.decoder(this.instructionTypeListByName, i32, pc);
                } catch (e) {
                    console.log(this.decoder);
                    console.log(this.instructionTypeListByName);
                    console.log(this.instructionTypeList);
                    throw (e);
                }
            };

            Instructions.prototype.slowFindByData = function (i32, pc) {
                if (typeof pc === "undefined") { pc = 0; }
                for (var n = 0; n < this.instructionTypeList.length; n++) {
                    var instructionType = this.instructionTypeList[n];
                    if (instructionType.match(i32))
                        return instructionType;
                }
                throw (sprintf("Cannot find instruction 0x%08X at 0x%08X", i32, pc));
            };
            return Instructions;
        })();
        cpu.Instructions = Instructions;

        var DecodingTable = (function () {
            function DecodingTable() {
                this.lastId = 0;
            }
            DecodingTable.prototype.getCommonMask = function (instructions, baseMask) {
                if (typeof baseMask === "undefined") { baseMask = 0xFFFFFFFF; }
                return instructions.reduce(function (left, item) {
                    return left & item.vm.mask;
                }, baseMask);
            };

            DecodingTable.createSwitch = function (instructions) {
                var writer = new IndentStringGenerator();
                var decodingTable = new DecodingTable();
                decodingTable._createSwitch(writer, instructions);
                return writer.output;
            };

            DecodingTable.prototype._createSwitch = function (writer, instructions, baseMask, level) {
                var _this = this;
                if (typeof baseMask === "undefined") { baseMask = 0xFFFFFFFF; }
                if (typeof level === "undefined") { level = 0; }
                if (level >= 10)
                    throw ('ERROR: Recursive detection');
                var commonMask = this.getCommonMask(instructions, baseMask);
                var groups = {};
                instructions.forEach(function (item) {
                    var commonValue = item.vm.value & commonMask;
                    if (!groups[commonValue])
                        groups[commonValue] = [];
                    groups[commonValue].push(item);
                });

                writer.write('switch ((value & ' + sprintf('0x%08X', commonMask) + ') >>> 0) {\n');
                writer.indent(function () {
                    for (var groupKey in groups) {
                        var group = groups[groupKey];
                        writer.write('case ' + sprintf('0x%08X', groupKey) + ':');
                        writer.indent(function () {
                            if (group.length == 1) {
                                writer.write(' return instructionsByName[' + JSON.stringify(group[0].name) + '];');
                            } else {
                                writer.write('\n');
                                _this._createSwitch(writer, group, ~commonMask, level + 1);
                                writer.write('break;\n');
                            }
                        });
                    }
                    writer.write('default: throw(sprintf("Invalid instruction 0x%08X at 0x%08X (' + _this.lastId++ + ') failed mask 0x%08X", value, pc, ' + commonMask + '));\n');
                });
                writer.write('}\n');
            };
            return DecodingTable;
        })();

        var Instruction = (function () {
            function Instruction(PC, data) {
                this.PC = PC;
                this.data = data;
            }
            Instruction.fromMemoryAndPC = function (memory, PC) {
                return new Instruction(PC, memory.readInt32(PC));
            };

            Instruction.prototype.extract = function (offset, length) {
                return BitUtils.extract(this.data, offset, length);
            };
            Instruction.prototype.insert = function (offset, length, value) {
                this.data = BitUtils.insert(this.data, offset, length, value);
            };

            Object.defineProperty(Instruction.prototype, "rd", {
                get: function () {
                    return this.extract(11 + 5 * 0, 5);
                },
                set: function (value) {
                    this.insert(11 + 5 * 0, 5, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "rt", {
                get: function () {
                    return this.extract(11 + 5 * 1, 5);
                },
                set: function (value) {
                    this.insert(11 + 5 * 1, 5, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "rs", {
                get: function () {
                    return this.extract(11 + 5 * 2, 5);
                },
                set: function (value) {
                    this.insert(11 + 5 * 2, 5, value);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instruction.prototype, "fd", {
                get: function () {
                    return this.extract(6 + 5 * 0, 5);
                },
                set: function (value) {
                    this.insert(6 + 5 * 0, 5, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "fs", {
                get: function () {
                    return this.extract(6 + 5 * 1, 5);
                },
                set: function (value) {
                    this.insert(6 + 5 * 1, 5, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "ft", {
                get: function () {
                    return this.extract(6 + 5 * 2, 5);
                },
                set: function (value) {
                    this.insert(6 + 5 * 2, 5, value);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instruction.prototype, "pos", {
                get: function () {
                    return this.lsb;
                },
                set: function (value) {
                    this.lsb = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "size_e", {
                get: function () {
                    return this.msb + 1;
                },
                set: function (value) {
                    this.msb = value - 1;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "size_i", {
                get: function () {
                    return this.msb - this.lsb + 1;
                },
                set: function (value) {
                    this.msb = this.lsb + value - 1;
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instruction.prototype, "lsb", {
                get: function () {
                    return this.extract(6 + 5 * 0, 5);
                },
                set: function (value) {
                    this.insert(6 + 5 * 0, 5, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "msb", {
                get: function () {
                    return this.extract(6 + 5 * 1, 5);
                },
                set: function (value) {
                    this.insert(6 + 5 * 1, 5, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "c1cr", {
                get: function () {
                    return this.extract(6 + 5 * 1, 5);
                },
                set: function (value) {
                    this.insert(6 + 5 * 1, 5, value);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instruction.prototype, "syscall", {
                get: function () {
                    return this.extract(6, 20);
                },
                set: function (value) {
                    this.insert(6, 20, value);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instruction.prototype, "imm16", {
                get: function () {
                    var res = this.u_imm16;
                    if (res & 0x8000)
                        res |= 0xFFFF0000;
                    return res;
                },
                set: function (value) {
                    this.insert(0, 16, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "u_imm16", {
                get: function () {
                    return this.extract(0, 16);
                },
                set: function (value) {
                    this.insert(0, 16, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "u_imm26", {
                get: function () {
                    return this.extract(0, 26);
                },
                set: function (value) {
                    this.insert(0, 26, value);
                },
                enumerable: true,
                configurable: true
            });

            Object.defineProperty(Instruction.prototype, "jump_bits", {
                get: function () {
                    return this.extract(0, 26);
                },
                set: function (value) {
                    this.insert(0, 26, value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Instruction.prototype, "jump_real", {
                get: function () {
                    return (this.jump_bits * 4) >>> 0;
                },
                set: function (value) {
                    this.jump_bits = (value / 4) >>> 0;
                },
                enumerable: true,
                configurable: true
            });
            return Instruction;
        })();
        cpu.Instruction = Instruction;

        var DecodedInstruction = (function () {
            function DecodedInstruction(instruction, type) {
                this.instruction = instruction;
                this.type = type;
            }
            return DecodedInstruction;
        })();
        cpu.DecodedInstruction = DecodedInstruction;
    })(core.cpu || (core.cpu = {}));
    var cpu = core.cpu;
})(core || (core = {}));
//# sourceMappingURL=instructions.js.map
