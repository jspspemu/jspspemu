///<reference path="../../typings.d.ts" />

import memory = require('../memory');
import state = require('./state');
import codegen = require('./codegen');
import ast_builder = require('./ast_builder');
import instructions = require('./instructions');

import InstructionAst = codegen.InstructionAst;
import Memory = memory.Memory;
import Instructions = instructions.Instructions;
import Instruction = instructions.Instruction;
import DecodedInstruction = instructions.DecodedInstruction;
import CpuState = state.CpuState;
import MipsAstBuilder = ast_builder.MipsAstBuilder;

export interface InstructionUsage {
	name: string;
	count: number;
}

class PspInstructionStm extends ast_builder.ANodeStm {
	constructor(public PC: number, private code: ast_builder.ANodeStm, private di: DecodedInstruction) {
		super();
	}

	toJs() {
		return "/*" + IntUtils.toHexString(this.PC, 8) + "*/ /* " + StringUtils.padLeft(this.di.type.name, ' ', 6) + " */  " + this.code.toJs();
	}
	optimize() { return new PspInstructionStm(this.PC, this.code.optimize(), this.di); }
}

export class FunctionGenerator {
	private instructions: Instructions = Instructions.instance;
	private instructionAst = new InstructionAst();
	//private instructionGenerartorsByName = <StringDictionary<Function>>{ };
	private instructionUsageCount: StringDictionary<number> = {};

	constructor(public memory: Memory) {
	}

	getInstructionUsageCount(): InstructionUsage[] {
		var items: InstructionUsage[] = [];
		for (var key in this.instructionUsageCount) {
			var value = this.instructionUsageCount[key];
			items.push({ name: key, count: value });
		}
		items.sort((a, b) => compareNumbers(a.count, b.count)).reverse();
		return items;
	}

	private decodeInstruction(address: number) {
		var instruction = Instruction.fromMemoryAndPC(this.memory, address);
		var instructionType = this.getInstructionType(instruction);
		return new DecodedInstruction(instruction, instructionType);
	}

	private getInstructionType(i: Instruction) {
		return this.instructions.findByData(i.data, i.PC);
	}

	private generateInstructionAstNode(di: DecodedInstruction, PC: number): ast_builder.ANodeStm {
		var instruction = di.instruction;
		var instructionType = di.type;
		var func: Function = this.instructionAst[instructionType.name];
		if (func === undefined) throw (sprintf("Not implemented '%s' at 0x%08X", instructionType, di.instruction.PC));
		return func.call(this.instructionAst, instruction, PC);
	}

	create(address: number) {
		var code = this._create(address);
		try {
			return new Function('state', code);
		} catch (e) {
			console.info('code:\n', code);
			throw (e);
		}
	}

	_create(address: number) {
		//var enableOptimizations = false;
		var enableOptimizations = true;

		if (address == 0x00000000) {
			throw (new Error("Trying to execute 0x00000000"));
		}

		this.instructionAst.reset();

		var ast = new MipsAstBuilder();

		var startPC = address;
		var PC = address;
		var stms: ast_builder.ANodeStmList = new ast_builder.ANodeStmList([ast.functionPrefix()]);
		var mustDumpFunction = false;
		var pcToLabel: NumberDictionary<number> = {};

		var emitInstruction = () => {
			var di = this.decodeInstruction(PC);
			var result = new PspInstructionStm(PC, this.generateInstructionAstNode(di, PC), di);
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
				console.warn('**** NEW instruction: ', di.type.name);
			}
			this.instructionUsageCount[di.type.name]++;

			//if ([0x089162F8, 0x08916318].contains(PC)) stms.push(ast.debugger(sprintf('PC: %08X', PC)));

			if (di.type.isJumpOrBranch) {
				var di2 = this.decodeInstruction(PC + 4);
				if (di2.type.isJumpOrBranch) {
					stms.add(ast.debugger());
					console.error("branch in delayed slot!");
					//debugger;
				}

				var isBranch = di.type.isBranch;
				var isCall = di.type.isCall;
				var isUnconditionalNonLinkJump = (di.type.name == 'j');
				var jumpAddress = 0;
				var jumpBack = false;
				var jumpAhead = false;

				if (isBranch) {
					jumpAddress = PC + di.instruction.imm16 * 4 + 4;
				} else {
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
					} else if (isFunctionCall) {
						stms.add(ast.call('state.callPC', [ast.pc()]));
						//stms.add(ast.call('state.callUntilPCReaches', [ast.ra()]));
						// no break
					} else {
						break;
					}
				} else {
					break;
				}
			} else {
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

		if (n >= 100000) throw (new Error(sprintf("Too large function PC=%08X", address)));

		return stms.toJs();
	}
}
