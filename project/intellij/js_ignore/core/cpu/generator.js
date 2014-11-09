///<reference path="../../global.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var memory = require('../memory');
var state = require('./state');
var codegen = require('./codegen');
var ast_builder = require('./ast_builder');
var instructions = require('./instructions');
var InstructionAst = codegen.InstructionAst;
var Instructions = instructions.Instructions;
var Instruction = instructions.Instruction;
var DecodedInstruction = instructions.DecodedInstruction;
var MipsAstBuilder = ast_builder.MipsAstBuilder;
var PspInstructionStm = (function (_super) {
    __extends(PspInstructionStm, _super);
    function PspInstructionStm(PC, code, di) {
        _super.call(this);
        this.PC = PC;
        this.code = code;
        this.di = di;
    }
    PspInstructionStm.prototype.toJs = function () {
        return "/*" + IntUtils.toHexString(this.PC, 8) + "*/ /* " + StringUtils.padLeft(this.di.type.name, ' ', 6) + " */  " + this.code.toJs();
    };
    PspInstructionStm.prototype.optimize = function () {
        return new PspInstructionStm(this.PC, this.code.optimize(), this.di);
    };
    return PspInstructionStm;
})(ast_builder.ANodeStm);
var FunctionGenerator = (function () {
    function FunctionGenerator(memory) {
        this.memory = memory;
        this.instructions = Instructions.instance;
        this.instructionAst = new InstructionAst();
        //private instructionGenerartorsByName = <StringDictionary<Function>>{ };
        this.instructionUsageCount = {};
    }
    FunctionGenerator.prototype.getInstructionUsageCount = function () {
        var items = [];
        for (var key in this.instructionUsageCount) {
            var value = this.instructionUsageCount[key];
            items.push({ name: key, count: value });
        }
        items.sort(function (a, b) { return compareNumbers(a.count, b.count); }).reverse();
        return items;
    };
    FunctionGenerator.prototype.decodeInstruction = function (address) {
        var instruction = Instruction.fromMemoryAndPC(this.memory, address);
        var instructionType = this.getInstructionType(instruction);
        return new DecodedInstruction(instruction, instructionType);
    };
    FunctionGenerator.prototype.getInstructionType = function (i) {
        return this.instructions.findByData(i.data, i.PC);
    };
    FunctionGenerator.prototype.generateInstructionAstNode = function (di, PC) {
        var instruction = di.instruction;
        var instructionType = di.type;
        var func = this.instructionAst[instructionType.name];
        if (func === undefined)
            throw (sprintf("Not implemented '%s' at 0x%08X", instructionType, di.instruction.PC));
        return func.call(this.instructionAst, instruction, PC);
    };
    FunctionGenerator.prototype.create = function (address) {
        var code = this._create(address);
        try {
            return new Function('state', '"use strict";' + code);
        }
        catch (e) {
            console.info('code:\n', code);
            throw (e);
        }
    };
    FunctionGenerator.prototype._create = function (address) {
        var _this = this;
        //var enableOptimizations = false;
        var enableOptimizations = true;
        if (address == 0x00000000) {
            throw (new Error("Trying to execute 0x00000000"));
        }
        this.instructionAst.reset();
        var ast = new MipsAstBuilder();
        var startPC = address;
        var PC = address;
        var stms = new ast_builder.ANodeStmList([ast.functionPrefix()]);
        var mustDumpFunction = false;
        var pcToLabel = {};
        var emitInstruction = function () {
            var di = _this.decodeInstruction(PC);
            var result = new PspInstructionStm(PC, _this.generateInstructionAstNode(di, PC), di);
            PC += 4;
            return result;
        };
        stms.add(ast.raw_stm('var expectedRA = state.getRA();'));
        function returnWithCheck() {
            stms.add(ast.raw_stm('return;'));
        }
        for (var n = 0; n < 100000; n++) {
            var di = this.decodeInstruction(PC + 0);
            //console.log(di);
            pcToLabel[PC] = stms.createLabel(PC);
            if (this.instructionUsageCount[di.type.name] === undefined) {
                this.instructionUsageCount[di.type.name] = 0;
            }
            this.instructionUsageCount[di.type.name]++;
            //if ([0x089162F8, 0x08916318].contains(PC)) stms.push(ast.debugger(sprintf('PC: %08X', PC)));
            if (di.type.isJumpOrBranch) {
                var di2 = this.decodeInstruction(PC + 4);
                if (di2.type.isJumpOrBranch) {
                    stms.add(ast.debugger());
                    console.error("branch in delayed slot!");
                }
                var isBranch = di.type.isBranch;
                var isCall = di.type.isCall;
                var isUnconditionalNonLinkJump = (di.type.name == 'j');
                var jumpAddress = 0;
                var jumpBack = false;
                var jumpAhead = false;
                if (isBranch) {
                    jumpAddress = PC + di.instruction.imm16 * 4 + 4;
                }
                else {
                    jumpAddress = di.instruction.u_imm26 * 4;
                }
                jumpAhead = jumpAddress > PC;
                jumpBack = !jumpAhead;
                // SIMPLE LOOP
                var isSimpleLoop = (isBranch || isUnconditionalNonLinkJump) && jumpBack && (jumpAddress >= startPC);
                var isFunctionCall = isCall;
                stms.add(emitInstruction());
                var delayedSlotInstruction = emitInstruction();
                if (di2.type.isSyscall) {
                    stms.add(this.instructionAst._postBranch(PC));
                    stms.add(ast.raw_stm('if (!state.BRANCHFLAG) {'));
                    returnWithCheck();
                    stms.add(ast.raw_stm('}'));
                    stms.add(this.instructionAst._likely(di.type.isLikely, delayedSlotInstruction));
                }
                else {
                    stms.add(this.instructionAst._likely(di.type.isLikely, delayedSlotInstruction));
                    stms.add(this.instructionAst._postBranch(PC));
                    stms.add(ast.raw_stm('if (!state.BRANCHFLAG) {'));
                    returnWithCheck();
                    stms.add(ast.raw_stm('}'));
                }
                if (enableOptimizations) {
                    if (isSimpleLoop) {
                        stms.add(ast.jump(pcToLabel[jumpAddress]));
                        break;
                    }
                    else if (isFunctionCall) {
                        stms.add(ast.call('state.callPC', [ast.pc()]));
                    }
                    else {
                        break;
                    }
                }
                else {
                    break;
                }
            }
            else {
                if (di.type.isSyscall) {
                    stms.add(this.instructionAst._storePC(PC + 4));
                }
                stms.add(emitInstruction());
                if (di.type.isBreak) {
                    stms.add(this.instructionAst._storePC(PC));
                    break;
                }
            }
        }
        returnWithCheck();
        if (mustDumpFunction) {
            console.debug("// function_" + IntUtils.toHexString(address, 8) + ":\n" + stms.toJs());
        }
        if (n >= 100000)
            throw (new Error(sprintf("Too large function PC=%08X", address)));
        return stms.toJs();
    };
    return FunctionGenerator;
})();
exports.FunctionGenerator = FunctionGenerator;
//# sourceMappingURL=generator.js.map