///<reference path="./global.d.ts" />
export function ref() { } // Workaround to allow typescript to include this module

import _cpu = require('../src/core/cpu');
import _memory = require('../src/core/memory');

import Memory = _memory.Memory;
import MipsAssembler = _cpu.MipsAssembler;
import MipsDisassembler = _cpu.MipsDisassembler;
import CpuState = _cpu.CpuState;


var assembler = new _cpu.MipsAssembler();
var disassembler = new _cpu.MipsDisassembler();
var memory = _memory.getInstance();

class TestSyscallManager extends _cpu.SyscallManager {
    constructor() { super(null); }
    
	call(state: CpuState, id: number) {
    }
}

function executeProgram(gprInitial: any, program: string[]) {
    program = program.slice(0);
    program.push('break 0');
    var result = assembler.assembleToMemory(memory, 4, program);
	var state = new CpuState(memory, new TestSyscallManager());

	for (var key in gprInitial) {
		if (key.substr(0, 1) == '$') {
			state.gpr[parseInt(key.substr(1))] = gprInitial[key];
		} else {
			(<any>state)[key] = gprInitial[key];
		}
    }

    state.PC = result.entrypoint;
    state.SP = 0x10000;
   
    try {
        state.executeAtPC();
    } catch (e) {
        if (e.message != 'CpuBreakException') throw e;
    }
    return state;
}

function generateGpr3Matrix(op: string, vector: number[]) {
    var gprInitial: any = {};
    var outputMatrix: string[][] = [];
    for (var n = 0; n < vector.length; n++) gprInitial['$' + (15 + n)] = vector[n];

    for (var n = 0; n < vector.length; n++) {
        var program:string[] = [];
        for (var m = 0; m < vector.length; m++) {
            program.push(`${op} $${1 + m}, $${15 + n}, $${15 + m}`);
        }
        var state = executeProgram(gprInitial, program);
        var outputVector:string[] = [];
        for (var m = 0; m < vector.length; m++) outputVector.push(addressToHex2(state.gpr[1 + m]).toUpperCase());
        outputMatrix.push(outputVector);
        //console.log(state);
    }
    return outputMatrix;
}

function assertProgram(description:string, gprInitial: any, program: string[], gprAssertions: any) {
    var state = executeProgram(gprInitial, program);
    //console.log(state);
	for (var key in gprAssertions) {
		var value: number = 0;
		if (key.substr(0, 1) == '$') {
			value = state.gpr[parseInt(key.substr(1))];
		} else {
			value = (<any>state)[key];
		}
        assert.equal(addressToHex(value), addressToHex(gprAssertions[key]), description + ': ' + key + ' == ' + addressToHex(gprAssertions[key]));
    }
}

describe('testasm cpu running', function () {
    it('simple', function () {
        assertProgram("subtract 1", {}, ["li r1, 100", "addiu r1, r1, -1"], { $1: 99 });
        assertProgram("xor", {"$1" : 0xFF00FF00, "$2" : 0x00FFFF00 }, ["xor r3, r1, r2"], { $3: 0xFFFF0000 });

        assertProgram(
            "some arithmetic",
            { $1: -1, $2: -1, $3: -1, $4: -1, $11: 11, $12: 12 },
            [
                "add  r1, r0, r11",
			    "add  r2, r0, r12",
			    "sub  r3, r2, r1",
			    "addi r4, r0, 1234",
            ],
            { $1 : 11, $2 : 12, $3: 1, $4 : 1234 }
        );
    });
    it('set less than', function () {
        assertProgram(
            "set less than",
            { "$1": 0x77777777, "$10": 0, "$11": -100, "$12": +100, "$20": 0, "$21": 7, "$22": -200 },
            [
                "sltu r1, r10, r20",
                "sltu r2, r10, r21",
                "sltu r3, r11, r22",
                "slt  r4, r11, r22",
            ],
            { "$1": 0, "$2": 1, "$3": 0, "$4": 0 }
        );
    });
    it('divide', function () {
        assertProgram("divide", {}, ["li r10, 100", "li r11, 12", "div r10, r11"], { HI: 4, LO: 8 });
    });
    it('branch1', function () {
        assertProgram(
            "branch beq",
            { "$1": 0, "$2": 0 },
            [
                ":label1",
                "addi r2, r2, 1",
                "beq r1, r0, label1",
                "addi r1, r1, 1",
            ],
            { "$1": 2, "$2": 2 }
        );
    });
    it('branch1_likely', function () {
        assertProgram(
            "branch beql",
            { "$1": 0, "$2": 0 },
            [
                ":label1",
                "addi r2, r2, 1",
                "beql r1, r0, label1",
                "addi r1, r1, 1",
            ],
            { "$1": 1, "$2": 2 }
        );
    });
    it('branch2', function () {
        assertProgram(
            "branch bne",
            { "$1": 0, "$2": 10 },
            [
                ":label1",
                "bne r1, r2, label1",
                "addi r1, r1, 1",
            ],
            { "$1": 11 }
        );
    });

    it('jal', function () {
        assertProgram(
            "jal",
            { "$1": 0 },
            [
                "jal func1",
                "addi r1, r0, 1",

                "j end",
                "nop",                
                ":func1",
                "jr r31",
                "add r1, r1, r1",
                
                ":end",
            ],
            { "$1": 2 }
        );
    });

    it('j_inside', function () {
        assertProgram(
            "j_inside",
            { "$1": 0, "$2": 20 },
            [
                ":start",
                "addi r1, r1, 1",
                "beq r1, r2, end",
                "nop",
                "j start",
                "nop",
                ":end",
            ],
            { "$1": 20 }
        );
    });
    
    it('j_inside2', function () {
        assertProgram(
            "j_inside2",
            { "$1": 0, "$30": 20 },
            [
                ":start",
                "addi r2, r2, 1",
                ".entrypoint",
                "addi r1, r1, 1",
                "beq r1, r30, end",
                "nop",
                "j start",
                "nop",
                ":end",
            ],
            { "$1": 20, "$2": 19 }
        );
    });

    it('shift', function () {
    });

    it('load/write', function () {
        assertProgram(
            "loadwrite",
            { "$1" : 0x7F, "$2" : 0x100 },
            [
                "sb r1, 4(r2)",
                "sb r1, 5(r2)",
                "sb r1, 6(r2)",
                "sb r1, 7(r2)",
                "lw r3, 4(r2)",
                "sw r3, 8(r2)",
                "lw r5, 8(r2)",
                "addi r5, r5, 1",
            ],
            { "$3": 0x7F7F7F7F, "$5": 0x7F7F7F80 }
        );
    });

    it('opcode add/addu', function () {
        var combineValues = [0x00000000, 0x00000001, 0x00000309, 0x80000000, 0x7FFFFFFF, 0xFFFFFFFF];
        var expectedMatrix = [
            ["00000000", "00000001", "00000309", "80000000", "7FFFFFFF", "FFFFFFFF"],
            ["00000001", "00000002", "0000030A", "80000001", "80000000", "00000000"],
            ["00000309", "0000030A", "00000612", "80000309", "80000308", "00000308"],
            ["80000000", "80000001", "80000309", "00000000", "FFFFFFFF", "7FFFFFFF"],
            ["7FFFFFFF", "80000000", "80000308", "FFFFFFFF", "FFFFFFFE", "7FFFFFFE"],
            ["FFFFFFFF", "00000000", "00000308", "7FFFFFFF", "7FFFFFFE", "FFFFFFFE"]
        ];
        var matrix_add = generateGpr3Matrix('add', combineValues);
        var matrix_addu = generateGpr3Matrix('addu', combineValues);

        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix_add));
        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix_addu));
    });

    it('opcode sub/subu', function () {
        var combineValues = [0x00000000, 0x00000001, 0x00000309, 0x80000000, 0x7FFFFFFF, 0xFFFFFFFF];
        var expectedMatrix = [
            ["00000000", "FFFFFFFF", "FFFFFCF7", "80000000", "80000001", "00000001"],
            ["00000001", "00000000", "FFFFFCF8", "80000001", "80000002", "00000002"],
            ["00000309", "00000308", "00000000", "80000309", "8000030A", "0000030A"],
            ["80000000", "7FFFFFFF", "7FFFFCF7", "00000000", "00000001", "80000001"],
            ["7FFFFFFF", "7FFFFFFE", "7FFFFCF6", "FFFFFFFF", "00000000", "80000000"],
            ["FFFFFFFF", "FFFFFFFE", "FFFFFCF6", "7FFFFFFF", "80000000", "00000000"]
        ];
        var matrix_sub = generateGpr3Matrix('sub', combineValues);
        var matrix_subu = generateGpr3Matrix('subu', combineValues);

        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix_sub));
        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix_subu));
    });

    it('opcode slvl', function () {
        var combineValues = [0x00000000, 0x00000001, 0x00000002, 0x0000000A, 0x0000001F, 0x00000020, 0x80000000, 0x7FFFFFFF, 0xFFFFFFFF];
		var expectedMatrix = [
			["00000000", "00000000", "00000000", "00000000", "00000000", "00000000", "00000000", "00000000", "00000000"],
			["00000001", "00000002", "00000004", "00000400", "80000000", "00000001", "00000001", "80000000", "80000000"],
			["00000002", "00000004", "00000008", "00000800", "00000000", "00000002", "00000002", "00000000", "00000000"],
			["0000000A", "00000014", "00000028", "00002800", "00000000", "0000000A", "0000000A", "00000000", "00000000"],
			["0000001F", "0000003E", "0000007C", "00007C00", "80000000", "0000001F", "0000001F", "80000000", "80000000"],
			["00000020", "00000040", "00000080", "00008000", "00000000", "00000020", "00000020", "00000000", "00000000"],
			["80000000", "00000000", "00000000", "00000000", "00000000", "80000000", "80000000", "00000000", "00000000"],
			["7FFFFFFF", "FFFFFFFE", "FFFFFFFC", "FFFFFC00", "80000000", "7FFFFFFF", "7FFFFFFF", "80000000", "80000000"],
			["FFFFFFFF", "FFFFFFFE", "FFFFFFFC", "FFFFFC00", "80000000", "FFFFFFFF", "FFFFFFFF", "80000000", "80000000"]
		];
        var matrix = generateGpr3Matrix('sllv', combineValues);
        assert.equal(JSON.stringify(expectedMatrix), JSON.stringify(matrix));
    });

    it('opcode mult', function () {
        assertProgram("mult", { "$1": 7, "$2": 9 }, ["mult $1, $2", ], { "LO": 7 * 9, "HI": 0 });
        assertProgram("mult", { "$1": -1, "$2": 9 }, ["mult $1, $2", ], { "LO": -1 * 9, "HI": -1 });
    });
});
