///<reference path="../../typings.d.ts" />

import instructions = require('./instructions');
import _ast = require('./ast_builder');
import Instruction = instructions.Instruction;

var ast: _ast.MipsAstBuilder;

function assignGpr(index: number, expr: _ast.ANodeStm) { return ast.assignGpr(index, expr); }
function assignFpr(index: number, expr: _ast.ANodeStm) { return ast.assignFpr(index, expr); }
function assignFpr_I(index: number, expr: _ast.ANodeStm) { return ast.assignFpr_I(index, expr); }
function assignIC(expr: _ast.ANodeStm) { return ast.assignIC(expr); }

function fcr31_cc() { return ast.fcr31_cc(); }
function fpr(index: number) { return ast.fpr(index); }
function fpr_i(index: number) { return ast.fpr_i(index); }
function gpr(index: number) { return ast.gpr(index); }
function gpr_f(index: number) { return ast.gpr_f(index); }
function tempr(index: number) { return ast.tempr(index); }
function vfpr(reg: number) { return ast.vfpr(reg); }
function vfprc(reg: number) { return ast.vfprc(reg); }
function vfpr_i(index: number) { return ast.vfpr_i(index); }
function immBool(value: boolean) { return ast.imm32(value ? 1 : 0); }
function imm32(value: number) { return ast.imm32(value); }
function imm_f(value: number) { return ast.imm_f(value); }
function u_imm32(value: number) { return ast.u_imm32(value); }
function unop(op: string, right: _ast.ANodeExpr) { return ast.unop(op, right); }
function binop(left: _ast.ANodeExpr, op: string, right: _ast.ANodeExpr) { return ast.binop(left, op, right); }
function binop_i(left: _ast.ANodeExpr, op: string, right: number) { return ast.binop_i(left, op, right); }
function _if(cond: _ast.ANodeExpr, codeTrue: _ast.ANodeStm, codeFalse?: _ast.ANodeStm) { return ast._if(cond, codeTrue, codeFalse); }
function call(name: string, exprList: _ast.ANodeExpr[]) { return ast.call(name, exprList); }
function call_stm(name: string, exprList: _ast.ANodeExpr[]) { return stm(ast.call(name, exprList)); }
function stm(expr: _ast.ANodeExpr) { return ast.stm(expr); }
function stms(stms: _ast.ANodeStm[]) { return ast.stms(stms); }
function pc() { return ast.pc(); }
function lo() { return ast.lo(); }
function hi() { return ast.hi(); }
function ic() { return ast.ic(); }
function branchflag() { return ast.branchflag(); }
function branchpc() { return ast.branchpc(); }
function assign(ref: _ast.ANodeExprLValue, value: _ast.ANodeExpr) { return ast.assign(ref, value); }
function assign_stm(ref: _ast.ANodeExprLValue, value: _ast.ANodeExpr) { return stm(ast.assign(ref, value)); }
function i_simm16(i: Instruction) { return imm32(i.imm16); }
function i_uimm16(i: Instruction) { return u_imm32(i.u_imm16); }
function rs_imm16(i: Instruction) { return binop(binop(gpr(i.rs), '+', imm32(i.imm16)), '|', imm32(0)); }
function cast_uint(expr: _ast.ANodeExpr) { return binop(expr, '>>>', ast.imm32(0)); }

class VMatRegClass {
	constructor(private reg: number) {
	}

	_setMatrix(generator: (column: number, row: number) => _ast.ANodeExpr) {
		// @TODO
		var array = <_ast.ANodeExpr[]>[];
		for (var column = 0; column < 4; column++) {
			for (var row = 0; row < 4; row++) {
				array.push(generator(column, row));
			}
		}

		return stm(ast.call('state.vfpuSetMatrix', <_ast.ANodeExpr[]>[imm32(this.reg), ast.array(array)]));
	}

	setMatrix(generator: (column: number, row: number) => _ast.ANodeExpr) {
		return stms([
			this._setMatrix(generator),
			stm(ast.debugger('wip vfpu'))
		]);
	}

	setMatrixDebug(generator: (column: number, row: number) => _ast.ANodeExpr) {
		return stms([
			this._setMatrix(generator),
			stm(ast.debugger('wip vfpu'))
		]);
	}
}

class VVecRegClass {
	constructor(private reg: number, size:VectorSize) {
	}

	private _setVector(generator: (index: number) => _ast.ANodeExpr) {
		// @TODO
		var array = <_ast.ANodeExpr[]>[];
		var statements = [];
		var regs = getVectorRegs(this.reg, VectorSize.Quad);
	
		statements.push(stm(ast.call('state.vfpuStore', [
			ast.array(regs.map(item => imm32(item))),
			ast.array([0, 1, 2, 3].map(index => generator(index)))
		])));

		return stms(statements);
	}

	setVector(generator: (index: number) => _ast.ANodeExpr) {
		return stms([
			this._setVector(generator),
			stm(ast.debugger('wip vfpu'))
		]);
	}

}


function VMatReg(index: number) {
	return new VMatRegClass(index);
}

function VVecReg(index: number, size:VectorSize) {
	return new VVecRegClass(index, size);
}

export enum VectorSize { Single = 1, Pair = 2, Triple = 3, Quad = 4 }
export enum MatrixSize { M_2x2 = 2, M_3x3 = 3, M_4x4 = 4 };

function getVectorRegs(vectorReg: number, N: VectorSize) {
	var mtx = (vectorReg >>> 2) & 7;
	var col = vectorReg & 3;
	var row = 0;
	var length = 0;
	var transpose = (vectorReg >>> 5) & 1;

	switch (N) {
		case VectorSize.Single: transpose = 0; row = (vectorReg >>> 5) & 3; length = 1; break;
		case VectorSize.Pair: row = (vectorReg >>> 5) & 2; length = 2; break;
		case VectorSize.Triple: row = (vectorReg >>> 6) & 1; length = 3; break;
		case VectorSize.Quad: row = (vectorReg >>> 5) & 2; length = 4; break;
		default: debugger;
	}

	var regs: number[] = new Array(length);
	for (var i = 0; i < length; i++) {
		var index = mtx * 4;
		if (transpose) {
			index += ((row + i) & 3) + col * 32;
		} else {
			index += col + ((row + i) & 3) * 32;
		}
		regs[i] = index;
	}
	return regs;
}

function getMatrixRegs(matrixReg: number, N: MatrixSize) {
	var mtx = (matrixReg >> 2) & 7;
	var col = matrixReg & 3;

	var row = 0;
	var side = 0;

	switch (N) {
		case MatrixSize.M_2x2: row = (matrixReg >> 5) & 2; side = 2; break;
		case MatrixSize.M_3x3: row = (matrixReg >> 6) & 1; side = 3; break;
		case MatrixSize.M_4x4: row = (matrixReg >> 5) & 2; side = 4; break;
		default: debugger;
	}

	var transpose = (matrixReg >> 5) & 1;

	var regs: number[] = new Array(side * side);
	for (var i = 0; i < side; i++) {
		for (var j = 0; j < side; j++) {
			var index = mtx * 4;
			if (transpose) {
				index += ((row + i) & 3) + ((col + j) & 3) * 32;
			} else {
				index += ((col + j) & 3) + ((row + i) & 3) * 32;
			}
			regs[j * side + i] = index;
		}
	}
	return regs;
}

function readVector(vectorReg: number, N: VectorSize) {
	return getVectorRegs(vectorReg, N).map(index => vfpr(index));
}

function readVector_i(vectorReg: number, N: VectorSize) {
	return getVectorRegs(vectorReg, N).map(index => vfpr_i(index));
}

function readMatrix(vectorReg: number, N: MatrixSize) {
	return getMatrixRegs(vectorReg, N).map(index => vfpr(index));
}

function setMemoryVector(offset: _ast.ANodeExpr, items: _ast.ANodeExpr[]) {
	return call_stm('state.storeFloats', [offset, ast.array(items)]);
}

function memoryRef(type: string, address: _ast.ANodeExpr) {
	switch (type) {
		case 'float': return new _ast.ANodeExprLValueSetGet('state.swc1($0, #)', 'state.lwc1($0)', [address]);
		default: throw(new Error("Not implemented memoryRef type '" + type + "'"));
	}
	
}

function getMemoryVector(offset: _ast.ANodeExpr, count: number) {
	return ArrayUtils.range(0, count).map(item => memoryRef('float', binop(offset, '+', imm32(item * 4))));
}

function setItems(leftList: _ast.ANodeExprLValue[], values: _ast.ANodeExpr[]) {
	return stms(leftList.map((left, index) => ast.assign(left, values[index])));
}

function address_RS_IMM14(i: Instruction, offset: number = 0) {
	return binop(gpr(i.rs), '+', imm32(i.IMM14 * 4 + offset));
}

function setMatrix(leftList: number[], generator: (column: number, row: number, index?:number) => _ast.ANodeExpr) {
	var side = Math.sqrt(leftList.length);
	return stm(call('state.vfpuStore', [
		ast.array(leftList.map(item => imm32(item))),
		ast.array(ArrayUtils.range(0, leftList.length).map(index => generator(Math.floor(index % side), Math.floor(index / side), index)))
	]));
}

function setVector(leftList: number[], generator: (index: number) => _ast.ANodeExpr) {
	return stm(call('state.vfpuStore', [
		ast.array(leftList.map(item => imm32(item))),
		ast.array(ArrayUtils.range(0, leftList.length).map(index => generator(index)))
	]));
}

function setVector_i(leftList: number[], generator: (index: number) => _ast.ANodeExpr) {
	return stm(call('state.vfpuStore_i', [
		ast.array(leftList.map(item => imm32(item))),
		ast.array(ArrayUtils.range(0, leftList.length).map(index => generator(index)))
	]));
}

/*
private AstNodeExpr Address_RS_IMM14(int Offset = 0)
{
return ast.Cast<uint>(ast.Binary(ast.GPR_s(RS), "+", Instruction.IMM14 * 4 + Offset), false);
}
*/


var VfpuConstants = [
	{ name: "VFPU_ZERO", value: 0.0 },
	{ name: "VFPU_HUGE", value: 340282346638528859811704183484516925440 },
	{ name: "VFPU_SQRT2", value: Math.sqrt(2.0) },
	{ name: "VFPU_SQRT1_2", value: Math.sqrt(1.0 / 2.0) },
	{ name: "VFPU_2_SQRTPI", value: 2.0 / Math.sqrt(Math.PI) },
	{ name: "VFPU_2_PI", value: 2.0 / Math.PI },
	{ name: "VFPU_1_PI", value: 1.0 / Math.PI },
	{ name: "VFPU_PI_4", value: Math.PI / 4.0 },
	{ name: "VFPU_PI_2", value: Math.PI / 2.0 },
	{ name: "VFPU_PI", value: Math.PI },
	{ name: "VFPU_E", value: Math.E },
	{ name: "VFPU_LOG2E", value: Math.log2(Math.E) },
	{ name: "VFPU_LOG10E", value: Math.log10(Math.E) },
	{ name: "VFPU_LN2", value: Math.log(2) },
	{ name: "VFPU_LN10", value: Math.log(10) },
	{ name: "VFPU_2PI", value: 2.0 * Math.PI },
	{ name: "VFPU_PI_6", value: Math.PI / 6.0 },
	{ name: "VFPU_LOG10TWO", value: Math.log10(2.0) },
	{ name: "VFPU_LOG2TEN", value: Math.log2(10.0) },
	{ name: "VFPU_SQRT3_2", value: Math.sqrt(3.0) / 2.0 },
];

function getMatrixRegsVD(i: Instruction) {
	return getMatrixRegs(i.VD, i.ONE_TWO);
}

export class InstructionAst {
	constructor() {
		ast = new _ast.MipsAstBuilder();
	}

	lui(i: Instruction) { return assignGpr(i.rt, u_imm32(i.imm16 << 16)); }

	private _vset1(i: Instruction, generate: (index: number) => _ast.ANodeExpr, destSize: number = 0) {
		if (destSize <= 0) destSize = i.ONE_TWO;

		var dest = getVectorRegs(i.VD, destSize);

		var st = [];
		st.push(call_stm('state.storeVd_prefixed', [
			ast.arrayNumbers(dest),
			ast.array(ArrayUtils.range(0, destSize).map(index => generate(index))),
		]));
		return stms(st);
	}

	private _vset2(i: Instruction, generate: (index: number, src: _ast.ANodeExprLValue[]) => _ast.ANodeExpr, destSize: number = 0, srcSize: number = 0) {
		if (destSize <= 0) destSize = i.ONE_TWO;
		if (srcSize <= 0) srcSize = i.ONE_TWO;

		var dest = getVectorRegs(i.VD, destSize);
		var src = [ast.vector_vs(0), ast.vector_vs(1), ast.vector_vs(2), ast.vector_vs(3)].slice(0, srcSize);

		var st = [];
		st.push(call_stm('state.loadVs_prefixed', [ast.array(readVector(i.VS, srcSize))]));
		st.push(call_stm('state.storeVd_prefixed', [
			ast.arrayNumbers(dest),
			ast.array(ArrayUtils.range(0, destSize).map(index => generate(index, src))),
		]));
		//st.push(setVector(dest, index => generate(index, src)));
		return stms(st);
	}

	private _vset2_i(i: Instruction, generate: (index: number, src: _ast.ANodeExprLValue[]) => _ast.ANodeExpr, destSize = 0, srcSize = 0) {
		if (destSize <= 0) destSize = i.ONE_TWO;
		if (srcSize <= 0) srcSize = i.ONE_TWO;
		var dest = getVectorRegs(i.VD, destSize);
		var src = [ast.vector_vs(0), ast.vector_vs(1), ast.vector_vs(2), ast.vector_vs(3)].slice(0, srcSize);

		var st = [];
		st.push(call_stm('state.loadVs_prefixed', [ast.array(readVector_i(i.VS, srcSize))]));
		st.push(call_stm('state.storeVd_prefixed_i', [
			ast.arrayNumbers(dest),
			ast.array(ArrayUtils.range(0, destSize).map(index => generate(index, src))),
		]));
		//st.push(setVector(dest, index => generate(index, src)));
		return stms(st);
	}

	private _vset3(i: Instruction, generate: (index: number, src: _ast.ANodeExprLValue[], target: _ast.ANodeExprLValue[]) => _ast.ANodeExpr, destSize = 0, srcSize = 0, targetSize = 0) {
		if (destSize <= 0) destSize = i.ONE_TWO;
		if (srcSize <= 0) srcSize = i.ONE_TWO;
		if (targetSize <= 0) targetSize = i.ONE_TWO;
		var dest = getVectorRegs(i.VD, destSize);
		var src = [ast.vector_vs(0), ast.vector_vs(1), ast.vector_vs(2), ast.vector_vs(3)].slice(0, srcSize);
		var target = [ast.vector_vt(0), ast.vector_vt(1), ast.vector_vt(2), ast.vector_vt(3)].slice(0, targetSize);
		var st = [];
		st.push(call_stm('state.loadVs_prefixed', [ast.array(readVector(i.VS, srcSize))]));
		st.push(call_stm('state.loadVt_prefixed', [ast.array(readVector(i.VT, targetSize))]));
		st.push(call_stm('state.storeVd_prefixed', [
			ast.arrayNumbers(dest),
			ast.array(ArrayUtils.range(0, destSize).map(index => generate(index, src, target))),
		]));
		//st.push(setVector(dest, index => generate(index, src, target)));
		return stms(st);
	}

	// Prefixes
	vpfxt(i: Instruction) { return stm(call('state.setVpfxt', [imm32(i.data)])); }
	vpfxs(i: Instruction) { return stm(call('state.setVpfxs', [imm32(i.data)])); }
	vpfxd(i: Instruction) { return stm(call('state.setVpfxd', [imm32(i.data)])); }

	// Memory read/write

	"lv.s"(i: Instruction) { return assign_stm(vfpr(i.VT5_2), call('state.lwc1', [address_RS_IMM14(i, 0)])); }
	"sv.s"(i: Instruction) { return call_stm('state.swc1', [vfpr(i.VT5_2), address_RS_IMM14(i, 0)]); }

	"lv.q"(i: Instruction) { return setItems(readVector(i.VT5_1, VectorSize.Quad), getMemoryVector(address_RS_IMM14(i), 4)); }
	"lvl.q"(i: Instruction) { return stm(call('state.lvl_q', [address_RS_IMM14(i, 0), ast.array(getVectorRegs(i.VT5_1, VectorSize.Quad).map(item => imm32(item)))])); }
	"lvr.q"(i: Instruction) { return stm(call('state.lvr_q', [address_RS_IMM14(i, 0), ast.array(getVectorRegs(i.VT5_1, VectorSize.Quad).map(item => imm32(item)))])); }
	"sv.q"(i: Instruction) { return setMemoryVector(address_RS_IMM14(i), readVector(i.VT5_1, VectorSize.Quad)); }
	"svl.q"(i: Instruction) { return stm(call('state.svl_q', [address_RS_IMM14(i, 0), ast.array(getVectorRegs(i.VT5_1, VectorSize.Quad).map(item => imm32(item)))])); }
	"svr.q"(i: Instruction) { return stm(call('state.svr_q', [address_RS_IMM14(i, 0), ast.array(getVectorRegs(i.VT5_1, VectorSize.Quad).map(item => imm32(item)))])); }

	// Constants
	vfim(i: Instruction) { return assign_stm(vfpr(i.VT), imm_f(i.IMM_HF)); }
	vcst(i: Instruction) { return assign_stm(vfpr(i.VD), imm_f(VfpuConstants[i.IMM5].value)); }
	vhdp(i: Instruction) {
		var vectorSize = i.ONE_TWO;
		var st = [];
		st.push(call_stm('state.loadVs_prefixed', [ast.array(readVector(i.VS, vectorSize))]));
		st.push(call_stm('state.loadVt_prefixed', [ast.array(readVector(i.VT, vectorSize))]));
		st.push(assign_stm(vfpr(i.VD), this._aggregateV(imm_f(0), vectorSize, (aggregate, index) => {
			return binop(aggregate, '+', binop(ast.vector_vt(index), '*', (index == vectorSize - 1) ? <_ast.ANodeExpr>imm_f(1) : <_ast.ANodeExpr>ast.vector_vs(index)))
		})));
		return stms(st);
	}
	viim(i: Instruction) { return stm(assign(vfpr(i.VT), imm32(i.imm16))); }

	vmidt(i: Instruction) { return setMatrix(getMatrixRegsVD(i), (c, r) => imm32((c == r) ? 1 : 0)); }
	vmzero(i: Instruction) { return setMatrix(getMatrixRegsVD(i), (c, r) => imm32(0)); }
	vmone(i: Instruction) { return setMatrix(getMatrixRegsVD(i), (c, r) => imm32(1)); }

	_vtfm_x(i: Instruction, vectorSize: number) {
		var srcMat = readMatrix(i.VS, vectorSize);

		var aggregateds = [];
		for (var n = 0; n < vectorSize; n++) {
			aggregateds[n] = imm_f(0);
			for (var m = 0; m < vectorSize; m++) {
				aggregateds[n] = binop(aggregateds[n], '+', binop(srcMat[n * vectorSize + m], '*', ast.vector_vt(m)));
			}
		}

		var st = [];
		st.push(call_stm('state.loadVt_prefixed', [ast.array(readVector(i.VT, vectorSize))]));
		st.push(call_stm('state.storeVd_prefixed', [
			ast.arrayNumbers(getVectorRegs(i.VD, vectorSize)),
			ast.array(xrange(0, vectorSize).map(index => aggregateds[index])),
		]));
		return stms(st);
	}

	_vhtfm_x(i: Instruction, vectorSize: number) {
		var srcMat = readMatrix(i.VS, vectorSize);

		var aggregateds = [];
		for (var n = 0; n < vectorSize; n++) {
			aggregateds[n] = imm_f(0);
			for (var m = 0; m < vectorSize; m++) {
				aggregateds[n] = binop(aggregateds[n], '+', binop(srcMat[n * vectorSize + m], '*', ((m == vectorSize - 1) ? <_ast.ANodeExpr>imm_f(1) : <_ast.ANodeExpr>ast.vector_vt(m))));
			}
		}

		var st = [];
		st.push(call_stm('state.loadVt_prefixed', [ast.array(readVector(i.VT, vectorSize))]));
		st.push(call_stm('state.storeVd_prefixed', [
			ast.arrayNumbers(getVectorRegs(i.VD, vectorSize)),
			ast.array(xrange(0, vectorSize).map(index => aggregateds[index])),
		]));
		return stms(st);
	}

	vtfm2(i: Instruction) { return this._vtfm_x(i, 2); }
	vtfm3(i: Instruction) { return this._vtfm_x(i, 3); }
	vtfm4(i: Instruction) { return this._vtfm_x(i, 4); }

	vhtfm2(i: Instruction) { return this._vhtfm_x(i, 2); }
	vhtfm3(i: Instruction) { return this._vhtfm_x(i, 3); }
	vhtfm4(i: Instruction) { return this._vhtfm_x(i, 4); }

	vmscl(i: Instruction) {
		var vectorSize = i.ONE_TWO;
		//return ast.stm(ast.debugger('not implemented'));
		var src = readMatrix(i.VS, vectorSize);
		return setMatrix(getMatrixRegsVD(i), (c, r, index) => binop(src[index], '*', vfpr(i.VT)));
	}

	vzero(i: Instruction) { return this._vset1(i, (index) => imm_f(0)); }
	vone(i: Instruction) { return this._vset1(i, (index) => imm_f(1)); }

	vmov(i: Instruction) {
		//return stms([ast.debugger(), this._vset2(i, (index, src) => src[index])]);
		return this._vset3(i, (index, src, dest) => src[index]);
		//return this._vset2(i, (index, src) => src[index]);
	}
	vrcp(i: Instruction) { return this._vset2(i, (index, src) => binop(imm32(1), '/', src[index])); }

	vmul(i: Instruction) {
		//return stms([ast.debugger(), this._vset3(i, (i, src, target) => binop(src[i], '*', target[i]))]);
		return this._vset3(i, (i, src, target) => binop(src[i], '*', target[i]));
	}

	vbfy1(i: Instruction) {
		return this._vset2(i, (i, src) => {
			switch (i) {
				case 0: return binop(src[0], '+', src[1]);
				case 1: return binop(src[0], '-', src[1]);
				case 2: return binop(src[2], '+', src[3]);
				case 3: return binop(src[2], '-', src[3]);
				default: throw (new Error("vbfy1: Invalid operation"));
			}
		});
	}
	vbfy2(i: Instruction) {
		return this._vset2(i, (i, src) => {
			switch (i) {
				case 0: return binop(src[0], '+', src[2]);
				case 1: return binop(src[1], '+', src[3]);
				case 2: return binop(src[0], '-', src[2]);
				case 3: return binop(src[1], '-', src[3]);
				default: throw (new Error("vbfy1: Invalid operation"));
			}
		});
	}
	vsrt1(i: Instruction) {
		return this._vset2(i, (i, src) => {
			switch (i) {
				case 0: return call('MathFloat.min', [src[0], src[1]]);
				case 1: return call('MathFloat.max', [src[0], src[1]]);
				case 2: return call('MathFloat.min', [src[2], src[3]]);
				case 3: return call('MathFloat.max', [src[2], src[3]]);
				default: throw (new Error("vbfy1: Invalid operation"));
			}
		});
	}
	vsrt2(i: Instruction) {
		return this._vset2(i, (i, src) => {
			switch (i) {
				case 0: return call('MathFloat.min', [src[0], src[3]]);
				case 1: return call('MathFloat.min', [src[1], src[2]]);
				case 2: return call('MathFloat.max', [src[1], src[2]]);
				case 3: return call('MathFloat.max', [src[0], src[3]]);
				default: throw (new Error("vbfy2: Invalid operation"));
			}
		});
	}
	vsrt3(i: Instruction) {
		return this._vset2(i, (i, src) => {
			switch (i) {
				case 0: return call('MathFloat.max', [src[0], src[1]]);
				case 1: return call('MathFloat.min', [src[0], src[1]]);
				case 2: return call('MathFloat.max', [src[2], src[3]]);
				case 3: return call('MathFloat.min', [src[2], src[3]]);
				default: throw (new Error("vbfy3: Invalid operation"));
			}
		});
	}
	vsrt4(i: Instruction) {
		return this._vset2(i, (i, src) => {
			switch (i) {
				case 0: return call('MathFloat.max', [src[0], src[3]]);
				case 1: return call('MathFloat.max', [src[1], src[2]]);
				case 2: return call('MathFloat.min', [src[1], src[2]]);
				case 3: return call('MathFloat.min', [src[0], src[3]]);
				default: throw (new Error("vbfy4: Invalid operation"));
			}
		});
	}

	_aggregateV(val: _ast.ANodeExpr, size: number, generator: (value: _ast.ANodeExpr, index: number) => _ast.ANodeExpr) {
		for (var n = 0; n < size; n++) val = generator(val, n);
		return val;
	}

	vfad(i: Instruction) {
		var vectorSize = i.ONE_TWO;
		var st = [];
		st.push(call_stm('state.loadVs_prefixed', [ast.array(readVector(i.VS, vectorSize))]));
		st.push(assign_stm(vfpr(i.VD), this._aggregateV(imm_f(0), vectorSize, (value, index) => binop(value, '+', ast.vector_vs(index)))));
		return stms(st);
	}
	vavg(i: Instruction) {
		var vectorSize = i.ONE_TWO;
		var st = [];
		st.push(call_stm('state.loadVs_prefixed', [ast.array(readVector(i.VS, vectorSize))]));
		st.push(assign_stm(vfpr(i.VD), binop(this._aggregateV(imm_f(0), vectorSize, (value, index) => binop(value, '+', ast.vector_vs(index))), '/', imm_f(vectorSize))));
		return stms(st);
	}

	vidt(i: Instruction) {
		return this._vset1(i, (index) => imm_f((index == (i.IMM7 % i.ONE_TWO)) ? 1 : 0));
	}

	"vcrs.t"(i: Instruction) {
		return this._vset3(i, (index, src, target) => {
			switch (index) {
				case 0: return binop(src[1], '*', target[2]);
				case 1: return binop(src[2], '*', target[0]);
				case 2: return binop(src[0], '*', target[1]);
				default: throw(new Error("vcrs_t not implemented"));
			}
		}, 3, 3, 3);
	}
	"vcrsp.t"(i: Instruction) {
		return this._vset3(i, (index, src, target) => {
			switch (index) {
				case 0: return binop(binop(src[1], '*', target[2]), '-', binop(src[2], '*', target[1]));
				case 1: return binop(binop(src[2], '*', target[0]), '-', binop(src[0], '*', target[2]));
				case 2: return binop(binop(src[0], '*', target[1]), '-', binop(src[1], '*', target[0]));
				default: throw (new Error("vcrs_t not implemented"));
			}
		}, 3, 3, 3);
	}

	vc2i(i: Instruction) { return this._vset2_i(i, (index, src) => call('MathVfpu.vc2i', [imm32(index), src[0]]), 0, 1); }
	vuc2i(i: Instruction) { return this._vset2_i(i, (index, src) => call('MathVfpu.vuc2i', [imm32(index), src[0]]), 0, 1); }
	vs2i(i: Instruction) { return this._vset2_i(i, (index, src) => call('MathVfpu.vs2i', [imm32(index), src[Math.floor(index / 2)]]), i.ONE_TWO * 2, i.ONE_TWO); }
	vi2f(i: Instruction) { return this._vset2(i, (index, src) => call('MathVfpu.vi2f', [src[index], imm32(-i.IMM5)])); }
	vi2uc(i: Instruction) { return this._vset2_i(i, (index, src) => call('MathVfpu.vi2uc', [imm32(index), src[index]])); }
	vf2id(i: Instruction) { return this._vset2_i(i, (index, src) => call('MathVfpu.vf2id', [imm32(index), src[index]])); }
	vf2in(i: Instruction) { return this._vset2_i(i, (index, src) => call('MathVfpu.vf2in', [imm32(index), src[index]])); }
	vf2iz(i: Instruction) { return this._vset2_i(i, (index, src) => call('MathVfpu.vf2iz', [imm32(index), src[index]])); }
	vf2iu(i: Instruction) { return this._vset2_i(i, (index, src) => call('MathVfpu.vf2iu', [imm32(index), src[index]])); }
	vf2h(i: Instruction) { return this._vset2_i(i, (index, src) => call('MathVfpu.vf2h', [imm32(index), src[index]])); }
	vh2f(i: Instruction) { return this._vset2_i(i, (index, src) => call('MathVfpu.vh2f', [imm32(index), src[index]])); }

	vdet(i: Instruction) {
		var st = [];
		st.push(call_stm('state.loadVs_prefixed', [ast.array(readVector(i.VS, 2))]));
		st.push(call_stm('state.loadVt_prefixed', [ast.array(readVector(i.VT, 2))]));
		st.push(assign_stm(vfpr(i.VD), binop(binop(ast.vector_vs(0), '*', ast.vector_vt(1)), '-', binop(ast.vector_vs(1), '*', ast.vector_vt(0)))));
		return stms(st);
	}

	vqmul(i: Instruction) {
		return this._vset3(i, (i, s, t) => {
			switch (i) {
				case 0: return call('MathVfpu.vqmul0', [s[0], s[1], s[2], s[3], t[0], t[1], t[2], t[3]]);
				case 1: return call('MathVfpu.vqmul1', [s[0], s[1], s[2], s[3], t[0], t[1], t[2], t[3]]);
				case 2: return call('MathVfpu.vqmul2', [s[0], s[1], s[2], s[3], t[0], t[1], t[2], t[3]]);
				case 3: return call('MathVfpu.vqmul3', [s[0], s[1], s[2], s[3], t[0], t[1], t[2], t[3]]);
			}
		}, 4, 4, 4);
	}

	vslt(i: Instruction) { return this._vset3(i, (i, s, t) => call('MathFloat.vslt', [s[i], t[i]])); }
	vsle(i: Instruction) { return this._vset3(i, (i, s, t) => call('MathFloat.vsle', [s[i], t[i]])); }
	vsge(i: Instruction) { return this._vset3(i, (i, s, t) => call('MathFloat.vsge', [s[i], t[i]])); }
	vsgt(i: Instruction) { return this._vset3(i, (i, s, t) => call('MathFloat.vsgt', [s[i], t[i]])); }
	vscmp(i: Instruction) { return this._vset3(i, (i, s, t) => call('MathFloat.sign2', [s[i], t[i]])); }

	private _bvtf(i:Instruction, cond: boolean) {
		var reg = i.IMM3;
		var branchExpr = <_ast.ANodeExpr>ast.VCC(reg);
		if (!cond) branchExpr = unop("!", branchExpr);
		return this._branch(i, branchExpr);
	}
	
	bvf(i: Instruction) { return this._bvtf(i, false); }
	bvfl(i: Instruction) { return this._bvtf(i, false); }
	bvt(i: Instruction) { return this._bvtf(i, true); }
	bvtl(i: Instruction) { return this._bvtf(i, true); }

	mtv(i: Instruction) { return assign_stm(vfpr_i(i.VD), gpr(i.rt)); }
	mtvc(i: Instruction) { return assign_stm(vfprc(i.VD), gpr(i.rt)); }

	mfv(i: Instruction) { return assign_stm(gpr(i.rt), vfpr_i(i.VD)); }
	mfvc(i: Instruction) { return assign_stm(gpr(i.rt), vfprc(i.VD)); }

	private _vcmovtf(i: Instruction, True: boolean) {
		return call_stm('state.vcmovtf', [
			imm32(i.IMM3),
			immBool(True),
			ast.arrayNumbers(getVectorRegs(i.VD, i.ONE_TWO)),
			ast.arrayNumbers(getVectorRegs(i.VS, i.ONE_TWO))
		]);
	}

	vcmovt(i: Instruction) { return this._vcmovtf(i, true); }
	vcmovf(i: Instruction) { return this._vcmovtf(i, false); }

	vcmp(i: Instruction) {
		var st = [];
		st.push(ast.debugger());
		st.push(call_stm('state.vcmp', [
			imm32(i.IMM4),
			ast.arrayNumbers(getVectorRegs(i.VS, i.ONE_TWO)),
			ast.arrayNumbers(getVectorRegs(i.VT, i.ONE_TWO))
		]));
		return stms(st);
	}

	// @TODO:
	//vwbn(i: Instruction) { return ast.stm(ast.debugger('not implemented')); }
	//vsbn(i: Instruction) { return ast.stm(ast.debugger('not implemented')); }
	vwbn(i: Instruction) { return ast.stm(); }
	vsbn(i: Instruction) { return ast.stm(); }

	vabs(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.abs', [src[i]])); }
	vocp(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.ocp', [src[i]])); }
	vneg(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.neg', [src[i]])); }
	vsgn(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.sign', [src[i]])); }
	vsat0(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.sat0', [src[i]])); }
	vsat1(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.sat1', [src[i]])); }
	vrsq(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.rsq', [src[i]])); }
	vsin(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.sinv1', [src[i]])); }
	vcos(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.cosv1', [src[i]])); }
	vexp2(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.exp2', [src[i]])); }
	vrexp2(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.rexp2', [src[i]])); }
	vlog2(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.log2', [src[i]])); }
	vsqrt(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.sqrt', [src[i]])); }
	vasin(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.asinv1', [src[i]])); }
	vnsin(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.nsinv1', [src[i]])); }
	vnrcp(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.nrcp', [src[i]])); }

	vmin(i: Instruction) { return this._vset3(i, (i, src, target) => call('MathFloat.min', [src[i], target[i]])); }
	vmax(i: Instruction) { return this._vset3(i, (i, src, target) => call('MathFloat.max', [src[i], target[i]])); }
	vdiv(i: Instruction) { return this._vset3(i, (i, src, target) => binop(src[i], '/', target[i])); }
	vadd(i: Instruction) { return this._vset3(i, (i, src, target) => binop(src[i], '+', target[i])); }
	vsub(i: Instruction) { return this._vset3(i, (i, src, target) => binop(src[i], '-', target[i])); }
	vscl(i: Instruction) { return this._vset3(i, (index, src, target) => binop(src[index], '*', target[0]), 0, 0, 1); }
	vdot(i: Instruction) {
		var result = <_ast.ANodeExpr>imm_f(0);
		var vectorSize = i.ONE_TWO;

		for (var n = 0; n < vectorSize; n++) result = binop(result, '+', binop(ast.vector_vs(n), '*', ast.vector_vt(n)));

		var st = [];
		st.push(call_stm('state.loadVs_prefixed', [ast.array(readVector(i.VS, vectorSize))]));
		st.push(call_stm('state.loadVt_prefixed', [ast.array(readVector(i.VT, vectorSize))]));
		st.push(assign_stm(vfpr(i.VD), result));
		return stms(st);
	}
	vrot(i: Instruction) {
		var imm5 = i.IMM5;
		var CosIndex = BitUtils.extract(imm5, 0, 2);
		var SinIndex = BitUtils.extract(imm5, 2, 2);
		var NegateSin = BitUtils.extractBool(imm5, 4);

		//var Dest = VEC_VD;
		//var Src = CEL_VS;

		var dest = getVectorRegs(i.VD, i.ONE_TWO);

		var Sine = <_ast.ANodeExpr>call('MathFloat.sinv1', [ast.vector_vs(0)]);
		var Cosine = <_ast.ANodeExpr>call('MathFloat.cosv1', [ast.vector_vs(0)]);
		// @TODO: WHY!?
		if (NegateSin) Sine = unop('-', Sine);

		//Console.WriteLine("{0},{1},{2}", CosIndex, SinIndex, NegateSin);

		var st = [];
		//st.push(ast.debugger('vrot'));
		st.push(call_stm('state.loadVs_prefixed', [ast.array(readVector(i.VS, 1))]));
		st.push(setVector(dest, (Index) => {
			if (Index == CosIndex) return Cosine;
			if (Index == SinIndex) return Sine;
			return (SinIndex == CosIndex) ? Sine : imm32(0);
		}));

		return stms(st);
	}
	vmmov(i: Instruction) {
		var VectorSize = i.ONE_TWO;
		var dest = getMatrixRegs(i.VD, VectorSize);
		var src = readMatrix(i.VS, VectorSize);
		//var target = readMatrix(i.VT, i.ONE_TWO);
		return setMatrix(dest, (column, row, index) => src[index]);
	}

	vmmul(i: Instruction) {
		var VectorSize = i.ONE_TWO;
		var dest = getMatrixRegs(i.VD, VectorSize);
		var src = readMatrix(i.VS, VectorSize);
		var target = readMatrix(i.VT, VectorSize);

		var st = [];
		//st.push(ast.debugger());
		st.push(setMatrix(dest, (Column, Row, Index) =>
		{
			var adder = <_ast.ANodeExpr>imm_f(0);
			for (var n = 0; n < VectorSize; n++) {
				adder = binop(adder, '+', binop(target[Row * VectorSize + n], '*', src[Column * VectorSize + n]));
			}
			return adder;
		}));
		return stms(st);
	}

	'vt4444.q'(i: Instruction) { return this._vtXXX_q(i, '_vt4444_step'); }
	'vt5551.q'(i: Instruction) { return this._vtXXX_q(i, '_vt5551_step'); }
	'vt5650.q'(i: Instruction) { return this._vtXXX_q(i, '_vt5650_step'); }

	_vtXXX_q(i: Instruction, func: string) {
		var size = i.ONE_TWO;
		if (size != 4) throw (new Error("Not implemented _vtXXXX_q for VectorSize=" + size));
		var dest = getVectorRegs(i.VD, 2);
		var src = readVector_i(i.VS, 4);
		return setVector_i(dest, (index) => ast.call('state.' + func, [src[index * 2 + 0], src[index * 2 + 1]]));
	}

	// CPU
	add(i: Instruction) { return this.addu(i); }
	addu(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rs), '+', gpr(i.rt))); }
	addi(i: Instruction) { return this.addiu(i); }
	addiu(i: Instruction) { return assignGpr(i.rt, binop(gpr(i.rs), '+', imm32(i.imm16))); }

	sub(i: Instruction) { return this.subu(i); }
	subu(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rs), '-', gpr(i.rt))); }

	sll(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rt), '<<', imm32(i.pos))); }
	sra(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rt), '>>', imm32(i.pos))); }
	srl(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rt), '>>>', imm32(i.pos))); }
	rotr(i: Instruction) { return assignGpr(i.rd, call('BitUtils.rotr', [gpr(i.rt), imm32(i.pos)])); }

	sllv(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rt), '<<', binop(gpr(i.rs), '&', imm32(31)))); }
	srav(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rt), '>>', binop(gpr(i.rs), '&', imm32(31)))); }
	srlv(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rt), '>>>', binop(gpr(i.rs), '&', imm32(31)))); }
	//srlv(i: Instruction) { return assignGpr(i.rd, call('BitUtils.srl', [gpr(i.rt), gpr(i.rs)])); }
	rotrv(i: Instruction) { return assignGpr(i.rd, call('BitUtils.rotr', [gpr(i.rt), gpr(i.rs)])); }

	bitrev(i: Instruction) { return assignGpr(i.rd, call('BitUtils.bitrev32', [gpr(i.rt)])); }

	and(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rs), '&', gpr(i.rt))); }
	or(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rs), '|', gpr(i.rt))); }
	xor(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rs), '^', gpr(i.rt))); }
	nor(i: Instruction) { return assignGpr(i.rd, unop('~', binop(gpr(i.rs), '|', gpr(i.rt)))); }

	andi(i: Instruction) { return assignGpr(i.rt, binop(gpr(i.rs), '&', u_imm32(i.u_imm16))); }
	ori(i: Instruction) { return assignGpr(i.rt, binop(gpr(i.rs), '|', u_imm32(i.u_imm16))); }
	xori(i: Instruction) { return assignGpr(i.rt, binop(gpr(i.rs), '^', u_imm32(i.u_imm16))); }

	mflo(i: Instruction) { return assignGpr(i.rd, lo()); }
	mfhi(i: Instruction) { return assignGpr(i.rd, hi()); }
	mfic(i: Instruction) { return assignGpr(i.rt, ic()); }

	mtlo(i: Instruction) { return assign(lo(), gpr(i.rs)); }
	mthi(i: Instruction) { return assign(hi(), gpr(i.rs)); }
	mtic(i: Instruction) { return assignIC(gpr(i.rt)); }

	slt(i: Instruction) { return assignGpr(i.rd, call('state.slt', [gpr(i.rs), gpr(i.rt)])); }
	sltu(i: Instruction) { return assignGpr(i.rd, call('state.sltu', [gpr(i.rs), gpr(i.rt)])); }
	slti(i: Instruction) { return assignGpr(i.rt, call('state.slt', [gpr(i.rs), imm32(i.imm16)])); }
	sltiu(i: Instruction) { return assignGpr(i.rt, call('state.sltu', [gpr(i.rs), <any>u_imm32(i.imm16)])); }

	movz(i: Instruction) { return _if(binop(gpr(i.rt), '==', imm32(0)), assignGpr(i.rd, gpr(i.rs))); }
	movn(i: Instruction) { return _if(binop(gpr(i.rt), '!=', imm32(0)), assignGpr(i.rd, gpr(i.rs))); }

	ext(i: Instruction) { return assignGpr(i.rt, call('BitUtils.extract', [gpr(i.rs), imm32(i.pos), imm32(i.size_e)])); }
	ins(i: Instruction) { return assignGpr(i.rt, call('BitUtils.insert', [gpr(i.rt), imm32(i.pos), imm32(i.size_i), gpr(i.rs)])); }

	clz(i: Instruction) { return assignGpr(i.rd, call('BitUtils.clz', [gpr(i.rs)])); }
	clo(i: Instruction) { return assignGpr(i.rd, call('BitUtils.clo', [gpr(i.rs)])); }
	seb(i: Instruction) { return assignGpr(i.rd, call('BitUtils.seb', [gpr(i.rt)])); }
	seh(i: Instruction) { return assignGpr(i.rd, call('BitUtils.seh', [gpr(i.rt)])); }

	wsbh(i: Instruction) { return assignGpr(i.rd, call('BitUtils.wsbh', [gpr(i.rt)])); }
	wsbw(i: Instruction) { return assignGpr(i.rd, call('BitUtils.wsbw', [gpr(i.rt)])); }

	_trace_state() { return stm(ast.call('state._trace_state', [])); }

	"mov.s"(i: Instruction) { return assignFpr(i.fd, fpr(i.fs)); }
	"add.s"(i: Instruction) { return assignFpr(i.fd, binop(fpr(i.fs), '+', fpr(i.ft))); }
	"sub.s"(i: Instruction) { return assignFpr(i.fd, binop(fpr(i.fs), '-', fpr(i.ft))); }
	"mul.s"(i: Instruction) { return assignFpr(i.fd, binop(fpr(i.fs), '*', fpr(i.ft))); }
	"div.s"(i: Instruction) { return assignFpr(i.fd, binop(fpr(i.fs), '/', fpr(i.ft))); }
	"abs.s"(i: Instruction) { return assignFpr(i.fd, call('Math.abs', [fpr(i.fs)])); }
	"sqrt.s"(i: Instruction) { return assignFpr(i.fd, call('Math.sqrt', [fpr(i.fs)])); }
	"neg.s"(i: Instruction) { return assignFpr(i.fd, unop('-', fpr(i.fs))); }

	min(i: Instruction) { return assignGpr(i.rd, call('state.min', [gpr(i.rs), gpr(i.rt)])); }
	max(i: Instruction) { return assignGpr(i.rd, call('state.max', [gpr(i.rs), gpr(i.rt)])); }

	div(i: Instruction) { return stm(call('state.div', [gpr(i.rs), gpr(i.rt)])); }
	divu(i: Instruction) { return stm(call('state.divu', [gpr(i.rs), gpr(i.rt)])); }

	mult(i: Instruction) { return stm(call('state.mult', [gpr(i.rs), gpr(i.rt)])); }
	multu(i: Instruction) { return stm(call('state.multu', [gpr(i.rs), gpr(i.rt)])); }
	madd(i: Instruction) { return stm(call('state.madd', [gpr(i.rs), gpr(i.rt)])); }
	maddu(i: Instruction) { return stm(call('state.maddu', [gpr(i.rs), gpr(i.rt)])); }
	msub(i: Instruction) { return stm(call('state.msub', [gpr(i.rs), gpr(i.rt)])); }
	msubu(i: Instruction) { return stm(call('state.msubu', [gpr(i.rs), gpr(i.rt)])); }

	cache(i: Instruction) { return stm(call('state.cache', [gpr(i.rs), imm32(i.rt), imm32(i.imm16)])); }

	syscall(i: Instruction) { return stm(call('state.syscall', [imm32(i.syscall)])); }
	"break"(i: Instruction) { return stm(call('state.break', [])); }
	dbreak(i: Instruction) { return ast.debugger("dbreak"); }

	_likely(isLikely: boolean, code: _ast.ANodeStm) {
		return isLikely ? _if(branchflag(), code) : code;
	}

	_postBranch(nextPc: number) {
		return _if(
			branchflag(),
			stm(assign(pc(), branchpc())),
			stms([stm(assign(pc(), u_imm32(nextPc)))])
		);
	}

	_storePC(_pc: number) {
		return assign(pc(), u_imm32(_pc));
	}

	private _branch(i: Instruction, cond: _ast.ANodeExpr) {
		return stms([
			stm(assign(branchflag(), cond)),
			stm(assign(branchpc(), u_imm32(i.PC + i.imm16 * 4 + 4)))
		]);
	}

	beq(i: Instruction) { return this._branch(i, binop(gpr(i.rs), "==", gpr(i.rt))); }
	bne(i: Instruction) { return this._branch(i, binop(gpr(i.rs), "!=", gpr(i.rt))); }
	bltz(i: Instruction) { return this._branch(i, binop(gpr(i.rs), "<", imm32(0))); }
	blez(i: Instruction) { return this._branch(i, binop(gpr(i.rs), "<=", imm32(0))); }
	bgtz(i: Instruction) { return this._branch(i, binop(gpr(i.rs), ">", imm32(0))); }
	bgez(i: Instruction) { return this._branch(i, binop(gpr(i.rs), ">=", imm32(0))); }

	beql(i: Instruction) { return this.beq(i); }
	bnel(i: Instruction) { return this.bne(i); }
	bltzl(i: Instruction) { return this.bltz(i); }
	blezl(i: Instruction) { return this.blez(i); }
	bgtzl(i: Instruction) { return this.bgtz(i); }
	bgezl(i: Instruction) { return this.bgez(i); }

	bltzal(i: Instruction) { return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bltz(i)]); }
	bltzall(i: Instruction) { return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bltzl(i)]); }

	bgezal(i: Instruction) { return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bgez(i)]); }
	bgezall(i: Instruction) { return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bgezl(i)]); }

	bc1t(i: Instruction) { return this._branch(i, fcr31_cc()); }
	bc1f(i: Instruction) { return this._branch(i, unop("!", fcr31_cc())); }

	bc1tl(i: Instruction) { return this.bc1t(i); }
	bc1fl(i: Instruction) { return this.bc1f(i); }

	sb(i: Instruction) { return stm(call('state.sb', [gpr(i.rt), rs_imm16(i)])); }
	sh(i: Instruction) { return stm(call('state.sh', [gpr(i.rt), rs_imm16(i)])); }
	sw(i: Instruction) { return stm(call('state.sw', [gpr(i.rt), rs_imm16(i)])); }

	swc1(i: Instruction) { return stm(call('state.swc1', [fpr(i.ft), rs_imm16(i)])); }
	lwc1(i: Instruction) { return assignFpr_I(i.ft, call('state.lw', [rs_imm16(i)])); }

	mfc1(i: Instruction) { return assignGpr(i.rt, ast.fpr_i(i.fs)); }
	mtc1(i: Instruction) { return assignFpr_I(i.fs, ast.gpr(i.rt)); }
	cfc1(i: Instruction) { return stm(call('state._cfc1_impl', [imm32(i.rd), imm32(i.rt)])); }
	ctc1(i: Instruction) { return stm(call('state._ctc1_impl', [imm32(i.rd), gpr(i.rt)])); }

	"trunc.w.s"(i: Instruction) { return assignFpr_I(i.fd, call('MathFloat.trunc', [fpr(i.fs)])); }
	"round.w.s"(i: Instruction) { return assignFpr_I(i.fd, call('MathFloat.round', [fpr(i.fs)])); }
	"ceil.w.s"(i: Instruction) { return assignFpr_I(i.fd, call('MathFloat.ceil', [fpr(i.fs)])); }
	"floor.w.s"(i: Instruction) { return assignFpr_I(i.fd, call('MathFloat.floor', [fpr(i.fs)])); }

	"cvt.s.w"(i: Instruction) { return assignFpr(i.fd, fpr_i(i.fs)); }
	"cvt.w.s"(i: Instruction) { return assignFpr_I(i.fd, call('state._cvt_w_s_impl', [fpr(i.fs)])); }

	lb(i: Instruction) { return assignGpr(i.rt, call('state.lb', [rs_imm16(i)])); }
	lbu(i: Instruction) { return assignGpr(i.rt, call('state.lbu', [rs_imm16(i)])); }
	lh(i: Instruction) { return assignGpr(i.rt, call('state.lh', [rs_imm16(i)])); }
	lhu(i: Instruction) { return assignGpr(i.rt, call('state.lhu', [rs_imm16(i)])); }
	lw(i: Instruction) { return assignGpr(i.rt, call('state.lw', [rs_imm16(i)])); }

	lwl(i: Instruction) { return assignGpr(i.rt, call('state.lwl', [gpr(i.rs), i_simm16(i), gpr(i.rt)])); }
	lwr(i: Instruction) { return assignGpr(i.rt, call('state.lwr', [gpr(i.rs), i_simm16(i), gpr(i.rt)])); }
	swl(i: Instruction) { return stm(call('state.swl', [gpr(i.rs), i_simm16(i), gpr(i.rt)])); }
	swr(i: Instruction) { return stm(call('state.swr', [gpr(i.rs), i_simm16(i), gpr(i.rt)])); }

	_callstackPush(i: Instruction) {
		return stm(call('state.callstackPush', [imm32(i.PC)]));
	}

	_callstackPop(i: Instruction) {
		return stm(call('state.callstackPop', []));
	}
		
	j(i: Instruction) { return stms([stm(assign(branchflag(), imm32(1))), stm(assign(branchpc(), u_imm32(i.u_imm26 * 4)))]); }
	jr(i: Instruction) {
		var statements = [];
		statements.push(stm(assign(branchflag(), imm32(1))));
		statements.push(stm(assign(branchpc(), gpr(i.rs))));
		if (i.rs == 31) {
			statements.push(this._callstackPop(i));
		}
		return stms(statements);
	}
	jal(i: Instruction) { return stms([this.j(i), this._callstackPush(i), assignGpr(31, u_imm32(i.PC + 8))]); }
	jalr(i: Instruction) { return stms([this.jr(i), this._callstackPush(i), assignGpr(i.rd, u_imm32(i.PC + 8)),]); }

	_comp(i: Instruction, fc02: number, fc3: number) {
		var fc_unordererd = ((fc02 & 1) != 0);
		var fc_equal = ((fc02 & 2) != 0);
		var fc_less = ((fc02 & 4) != 0);
		var fc_inv_qnan = (fc3 != 0); // TODO -- Only used for detecting invalid operations?

		return stm(call('state._comp_impl', [fpr(i.fs), fpr(i.ft), immBool(fc_unordererd), immBool(fc_equal), immBool(fc_less), immBool(fc_inv_qnan)]));
    }

	"c.f.s"(i: Instruction) { return this._comp(i, 0, 0); }
	"c.un.s"(i: Instruction) { return this._comp(i, 1, 0); }
	"c.eq.s"(i: Instruction) { return this._comp(i, 2, 0); }
	"c.ueq.s"(i: Instruction) { return this._comp(i, 3, 0); }
	"c.olt.s"(i: Instruction) { return this._comp(i, 4, 0); }
	"c.ult.s"(i: Instruction) { return this._comp(i, 5, 0); }
	"c.ole.s"(i: Instruction) { return this._comp(i, 6, 0); }
	"c.ule.s"(i: Instruction) { return this._comp(i, 7, 0); }

	"c.sf.s"(i: Instruction) { return this._comp(i, 0, 1); }
	"c.ngle.s"(i: Instruction) { return this._comp(i, 1, 1); }
	"c.seq.s"(i: Instruction) { return this._comp(i, 2, 1); }
	"c.ngl.s"(i: Instruction) { return this._comp(i, 3, 1); }
	"c.lt.s"(i: Instruction) { return this._comp(i, 4, 1); }
	"c.nge.s"(i: Instruction) { return this._comp(i, 5, 1); }
	"c.le.s"(i: Instruction) { return this._comp(i, 6, 1); }
	"c.ngt.s"(i: Instruction) { return this._comp(i, 7, 1); }
}
