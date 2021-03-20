import {ArrayUtils, BitUtils, xrange} from "../../global/math";
import {ANodeExpr, ANodeExprLValue, ANodeExprLValueSetGet, ANodeStm, MipsAstBuilder} from "./cpu_ast";
import {Instruction} from "./cpu_instructions";
import {VFPU_CTRL} from "./cpu_core";

var ast: MipsAstBuilder = new MipsAstBuilder();

function assignGpr(index: number, expr: ANodeStm) { return ast.assignGpr(index, expr); }
function assignFpr(index: number, expr: ANodeStm) { return ast.assignFpr(index, expr); }
function assignFpr_I(index: number, expr: ANodeStm) { return ast.assignFpr_I(index, expr); }
function assignIC(expr: ANodeStm) { return ast.assignIC(expr); }

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
function unop(op: string, right: ANodeExpr) { return ast.unop(op, right); }
function binop(left: ANodeExpr, op: string, right: ANodeExpr) { return ast.binop(left, op, right); }
function binop_i(left: ANodeExpr, op: string, right: number) { return ast.binop_i(left, op, right); }
function _if(cond: ANodeExpr, codeTrue: ANodeStm, codeFalse?: ANodeStm) { return ast._if(cond, codeTrue, codeFalse); }
function call(name: string, exprList: ANodeExpr[]) { return ast.call(name, exprList); }
function call_stm(name: string, exprList: ANodeExpr[]) { return stm(ast.call(name, exprList)); }
function stm(expr: ANodeExpr) { return ast.stm(expr); }
function stms(stms: ANodeStm[]) { return ast.stms(stms); }
function pc() { return ast.pc(); }
function lo() { return ast.lo(); }
function hi() { return ast.hi(); }
function ic() { return ast.ic(); }
function branchflag() { return ast.branchflag(); }
function branchpc() { return ast.branchpc(); }
function assign(ref: ANodeExprLValue, value: ANodeExpr) { return ast.assign(ref, value); }
function assign_stm(ref: ANodeExprLValue, value: ANodeExpr) { return stm(ast.assign(ref, value)); }
function i_simm16(i: Instruction) { return imm32(i.imm16); }
function i_uimm16(i: Instruction) { return u_imm32(i.u_imm16); }
function rs_imm16(i: Instruction) { return binop(binop(gpr(i.rs), '+', imm32(i.imm16)), '|', imm32(0)); }
function cast_uint(expr: ANodeExpr) { return binop(expr, '>>>', ast.imm32(0)); }

class VMatRegClass {
	constructor(private reg: number) {
	}

	_setMatrix(generator: (column: number, row: number) => ANodeExpr) {
		// @TODO
		var array = <ANodeExpr[]>[];
		for (var column = 0; column < 4; column++) {
			for (var row = 0; row < 4; row++) {
				array.push(generator(column, row));
			}
		}

		return stm(ast.call('state.vfpuSetMatrix', <ANodeExpr[]>[imm32(this.reg), ast.array(array)]));
	}

	setMatrix(generator: (column: number, row: number) => ANodeExpr) {
		return stms([
			this._setMatrix(generator),
			stm(ast.debugger('wip vfpu'))
		]);
	}

	setMatrixDebug(generator: (column: number, row: number) => ANodeExpr) {
		return stms([
			this._setMatrix(generator),
			stm(ast.debugger('wip vfpu'))
		]);
	}
}

class VVecRegClass {
	constructor(private reg: number, size:VectorSize) {
	}

	private _setVector(generator: (index: number) => ANodeExpr) {
		// @TODO
		var array = <ANodeExpr[]>[];
		var statements:ANodeExpr[] = [];
		var regs = getVectorRegs(this.reg, VectorSize.Quad);
	
		statements.push(stm(ast.call('state.vfpuStore', [
			ast.array(regs.map(item => imm32(item))),
			ast.array([0, 1, 2, 3].map(index => generator(index)))
		])));

		return stms(statements);
	}

	setVector(generator: (index: number) => ANodeExpr) {
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

export const enum VectorSize { Single = 1, Pair = 2, Triple = 3, Quad = 4 }
export const enum MatrixSize { M_2x2 = 2, M_3x3 = 3, M_4x4 = 4 };

//function getVectorRegsValues(vectorReg: number, N: VectorSize) {
//}

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

function readVector_f(vectorReg: number, N: VectorSize) {
	return getVectorRegs(vectorReg, N).map(index => vfpr(index));
}

function readVector_i(vectorReg: number, N: VectorSize) {
	return getVectorRegs(vectorReg, N).map(index => vfpr_i(index));
}

function readVector_type(vectorReg: number, N: VectorSize, type: string) {
	return (type == 'float') ? readVector_f(vectorReg, N) : readVector_i(vectorReg, N);
}

function readMatrix(vectorReg: number, N: MatrixSize) {
	return getMatrixRegs(vectorReg, N).map(index => vfpr(index));
}

function setMemoryVector(offset: ANodeExpr, items: ANodeExpr[]) {
    //return call_stm('state.storeFloats', [offset, ast.array(items)]);
	var out:ANodeExpr[] = [];
	for (var n = 0; n < items.length; n++) {
		var item = items[n];
		out.push(ast.raw_stm(`memory.swc1(${offset.toJs()} + ${n * 4}, ${item.toJs()});`));
	}
	return ast.stms(out);
}

function memoryRef(type: string, address: ANodeExpr) {
	switch (type) {
		case 'float': return new ANodeExprLValueSetGet(
			'memory.swc1($0, #)',
			//'memory.swc1(#, $0)',
			'memory.lwc1($0)',
			[address]
		);
		default: throw(new Error("Not implemented memoryRef type '" + type + "'"));
	}
	
}

function getMemoryVector(offset: ANodeExpr, count: number) {
	return ArrayUtils.range(0, count).map(item => memoryRef('float', binop(offset, '+', imm32(item * 4))));
}

function setItems(leftList: ANodeExprLValue[], values: ANodeExpr[]) {
	return stms(leftList.map((left, index) => ast.assign(left, values[index])));
}

function address_RS_IMM14(i: Instruction, offset: number = 0) {
	return binop(gpr(i.rs), '+', imm32(i.IMM14 * 4 + offset));
}

function setMatrix(leftList: number[], generator: (column: number, row: number, index?:number) => ANodeExpr) {
	var side = Math.sqrt(leftList.length);
	return call_stm('state.vfpuStore', [
		ast.array(leftList.map(item => imm32(item))),
		ast.array(ArrayUtils.range(0, leftList.length).map(index => generator(Math.floor(index % side), Math.floor(index / side), index)))
	]);
}

function setVector(leftList: number[], generator: (index: number) => ANodeExpr) {
	return call_stm('state.vfpuStore', [
		ast.array(leftList.map(item => imm32(item))),
		ast.array(ArrayUtils.range(0, leftList.length).map(index => generator(index)))
	]);
}

function setVector_i(leftList: number[], generator: (index: number) => ANodeExpr) {
	return call_stm('state.vfpuStore_i', [
		ast.array(leftList.map(item => imm32(item))),
		ast.array(ArrayUtils.range(0, leftList.length).map(index => generator(index)))
	]);
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

class VfpuPrefixes {
	static transformRead(n: number, info: number, values: ANodeExpr[]) {
		var sourceIndex = (info >> (0 + n * 2)) & 3;
		var sourceAbsolute = (info >> (8 + n * 1)) & 1;
		var sourceConstant = (info >> (12 + n * 1)) & 1;
		var sourceNegate = (info >> (16 + n * 1)) & 1;

		var value: ANodeExpr;
		if (sourceConstant) {
			switch (sourceIndex) {
				case 0: value = imm_f(sourceAbsolute ? (3) : (0)); break;
				case 1: value = imm_f(sourceAbsolute ? (1 / 3) : (1)); break;
				case 2: value = imm_f(sourceAbsolute ? (1 / 4) : (2)); break;
				case 3: value = imm_f(sourceAbsolute ? (1 / 6) : (1 / 2)); break;
				default: throw new Error("Invalid operation");
			}
		} else {
			value = values[sourceIndex];
			if (sourceAbsolute) value = call('Math.abs', [value]);
		}

		if (sourceNegate) value = call('MathFloat.neg', [value]);
		return value;
	}

	static transformStore(n: number, info: number, left: ANodeExprLValue, value: ANodeExpr) {
		var destinationSaturation = (info >> (0 + n * 2)) & 3;
		var destinationMask = (info >> (8 + n * 1)) & 1;
		if (destinationMask) {
			return ast.stm(); // Masked. No write value.
		} else {
			var value = value;
			switch (destinationSaturation) {
				case 1: value = call('MathFloat.sat0', [value]); break;
				case 3: value = call('MathFloat.sat1', [value]); break;
				default: break;
			}
			return assign_stm(left, value);
		}
	}
}

class PrefixPrediction {
	static DEFAULT_LOAD_VALUE = 0xDC0000E4;
	static DEFAULT_STORE_VALUE = 0x00000000;

	constructor(private default_value: number) {
	}

	known = true;
	value = this.default_value;

	reset() {
		this.set(this.default_value);
		//this.setUnknown();
	}

	eat() {
		this.set(this.default_value);
	}

	set(value: number) {
		this.known = true;
		this.value = value;
	}

	setUnknown() {
		this.known = false;
		this.value = this.default_value;
	}
}

export class BranchFlagStm extends ANodeStm {
	constructor(public cond:ANodeExpr, public pc:number) {
		super();
	}
	
	toJs() {
		//return `BRANCHFLAG = ${this.cond.toJs()}; BRANCHPC = ${addressToHex(this.pc)};`;
		return `BRANCHFLAG = ${this.cond.toJs()};`;
	}
}
		
export class InstructionAst {
	constructor() {
	}

	private _vpfxs = new PrefixPrediction(PrefixPrediction.DEFAULT_LOAD_VALUE);
	private _vpfxt = new PrefixPrediction(PrefixPrediction.DEFAULT_LOAD_VALUE);
	private _vpfxd = new PrefixPrediction(PrefixPrediction.DEFAULT_STORE_VALUE);
	private enableStaticPrefixVfpuOptimization = true;
	//private enableStaticPrefixVfpuOptimization = false;

	reset() {
		this._vpfxs.reset();
		this._vpfxt.reset();
		this._vpfxd.reset();
	}

	eatPrefixes() {
		this._vpfxs.eat();
		this._vpfxt.eat();
		this._vpfxd.eat();
	}

	lui(i: Instruction) { return assignGpr(i.rt, u_imm32(i.imm16 << 16)); }

	private _vset1(i: Instruction, generate: (index: number) => ANodeExpr, destSize: number = 0, destType = 'float') {
		var st:ANodeExpr[] = [];
		this._vset_storeVD(st, i, destType, destSize, (index: number) => generate(index));
		return stms(st);
	}

	private _vset2(i: Instruction, generate: (index: number, src: ANodeExprLValue[]) => ANodeExpr, destSize: number = 0, srcSize: number = 0, destType = 'float', srcType = 'float') {
		var st:ANodeExpr[] = [];
		var src = this._vset_readVS(st, i, srcType, srcSize);
		this._vset_storeVD(st, i, destType, destSize, (index: number) => generate(index, src));
		return stms(st);
	}

	private _vset3(i: Instruction, generate: (index: number, src: ANodeExprLValue[], target: ANodeExprLValue[]) => ANodeExpr, destSize = 0, srcSize = 0, targetSize = 0, destType = 'float', srcType = 'float', targetType = 'float') {
		var st:ANodeExpr[] = [];
		var src = this._vset_readVS(st, i, srcType, srcSize);
		var target = this._vset_readVT(st, i, targetType, targetSize);
		this._vset_storeVD(st, i, destType, destSize, (index: number) => generate(index, src, target));
		return stms(st);
	}

	private _vset_readVS(st: ANodeStm[], i: Instruction, type: string, size: number) {
		return this._vset_readVSVT(st, i, type, size, 'vs');
	}

	private _vset_readVT(st: ANodeStm[], i: Instruction, type: string, size: number) {
		return this._vset_readVSVT(st, i, type, size, 'vt');
	}

	private _vset_readVSVT(st: ANodeStm[], i: Instruction, type: string, size: number, name: string) {
		if (size <= 0) size = i.ONE_TWO;
		var regs = readVector_type((name == 'vs') ? i.VS : i.VT, size, type);
		var prefix = (name == 'vs') ? this._vpfxs : this._vpfxt;
		if (this.enableStaticPrefixVfpuOptimization && prefix.known) {
			var out:ANodeExprLValue[] = [];
			for (var n = 0; n < size; n++) {
				var vname = ((name == 'vs') ? 's' : 't') + n;
				out.push(ast.raw(vname));
				st.push(ast.allocVar(vname, VfpuPrefixes.transformRead(n, prefix.value, regs)));
			}
			//if (prefix.value != PrefixPrediction.DEFAULT_LOAD_VALUE) st.push(ast.debugger());
			return out;
		} else {
			st.push(call_stm(((name == 'vs') ? 'state.loadVs_prefixed' : 'state.loadVt_prefixed'), [ast.array(regs)]));
		}
		return xrange(0, size).map(index => (name == 'vs') ? ast.vector_vs(index) : ast.vector_vt(index));
	}

	private _vset_storeVD(st: ANodeStm[], i: Instruction, type:string, size: number, generate: (index: number) => ANodeExpr) {
		if (size <= 0) size = i.ONE_TWO;
		var dest_regs = getVectorRegs(i.VD, size);
		if (this.enableStaticPrefixVfpuOptimization && this._vpfxd.known) {
			for (var n = 0; n < size; n++) {
				var dest_reg = dest_regs[n];
				st.push(VfpuPrefixes.transformStore(n, this._vpfxd.value, (type == 'float') ? vfpr(dest_reg) : vfpr_i(dest_reg), generate(n)));
			}
		} else {
			st.push(call_stm((type == 'float') ? 'state.storeVd_prefixed' : 'state.storeVd_prefixed_i', [
				ast.arrayNumbers(dest_regs),
				ast.array(xrange(0, size).map(n => generate(n))),
			]));
		}
		
		st.push(call_stm('state.eatPrefixes', []));
		//st.push(ast.debugger());
		this.eatPrefixes();
	}

	// Prefixes
	vpfxs(i: Instruction) {
		this._vpfxs.set(i.data);
		return stms([
			call_stm('state.setVpfxs', [imm32(i.data)]),
			//ast.debugger(),
		]);
	}
	vpfxt(i: Instruction) {
		this._vpfxt.set(i.data);
		return stms([
			call_stm('state.setVpfxt', [imm32(i.data)]),
			//ast.debugger(),
		]);
	}
	vpfxd(i: Instruction) {
		this._vpfxd.set(i.data);
		return stms([
			call_stm('state.setVpfxd', [imm32(i.data)]),
			//ast.debugger(),
		]);
	}

	// Memory read/write

	"lv.s"(i: Instruction) { return assign_stm(vfpr(i.VT5_2), call('memory.lwc1', [address_RS_IMM14(i, 0)])); }
	"sv.s"(i: Instruction) { return call_stm('memory.swc1', [address_RS_IMM14(i, 0), vfpr(i.VT5_2)]); }

	"lv.q"(i: Instruction) { return setItems(readVector_f(i.VT5_1, VectorSize.Quad), getMemoryVector(address_RS_IMM14(i), 4)); }
	"lvl.q"(i: Instruction) { return call_stm('state.lvl_q', [address_RS_IMM14(i, 0), ast.array(getVectorRegs(i.VT5_1, VectorSize.Quad).map(item => imm32(item)))]); }
	"lvr.q"(i: Instruction) { return call_stm('state.lvr_q', [address_RS_IMM14(i, 0), ast.array(getVectorRegs(i.VT5_1, VectorSize.Quad).map(item => imm32(item)))]); }
	"sv.q"(i: Instruction) { return setMemoryVector(address_RS_IMM14(i), readVector_f(i.VT5_1, VectorSize.Quad)); }
	"svl.q"(i: Instruction) { return call_stm('state.svl_q', [address_RS_IMM14(i, 0), ast.array(getVectorRegs(i.VT5_1, VectorSize.Quad).map(item => imm32(item)))]); }
	"svr.q"(i: Instruction) { return call_stm('state.svr_q', [address_RS_IMM14(i, 0), ast.array(getVectorRegs(i.VT5_1, VectorSize.Quad).map(item => imm32(item)))]); }

	// Constants
	// @TODO: d-prefix in vt register
	viim(i: Instruction) { return assign_stm(vfpr(i.VT), imm32(i.imm16)); }
	vfim(i: Instruction) { return assign_stm(vfpr(i.VT), imm_f(i.IMM_HF)); }
	vcst(i: Instruction) { return assign_stm(vfpr(i.VD), imm_f(VfpuConstants[i.IMM5].value)); }
	vhdp(i: Instruction) {
		var vectorSize = i.ONE_TWO;
		return this._vset3(i, (_, src, target) => {
			return this._aggregateV(imm_f(0), vectorSize, (aggregate, index) => {
				return binop(aggregate, '+', binop(target[index], '*', (index == (vectorSize - 1)) ? <ANodeExpr>imm_f(1.0) : src[index]))
			});
		}, 1, vectorSize, vectorSize);
	}

	vmidt(i: Instruction) { return setMatrix(getMatrixRegsVD(i), (c, r) => imm32((c == r) ? 1 : 0)); }
	vmzero(i: Instruction) { return setMatrix(getMatrixRegsVD(i), (c, r) => imm32(0)); }
	vmone(i: Instruction) { return setMatrix(getMatrixRegsVD(i), (c, r) => imm32(1)); }

	_vtfm_x(i: Instruction, vectorSize: number) {
		var srcMat = readMatrix(i.VS, vectorSize);

		var st:ANodeStm[] = [];
		st.push(call_stm('state.loadVt_prefixed', [ast.array(readVector_f(i.VT, vectorSize))]));
		st.push(call_stm('state.storeVd_prefixed', [
			ast.arrayNumbers(getVectorRegs(i.VD, vectorSize)),
			ast.array(xrange(0, vectorSize).map(n => {
				return this._aggregateV(imm_f(0), vectorSize, (aggregated, m) => binop(aggregated, '+', binop(srcMat[n * vectorSize + m], '*', <ANodeExpr>ast.vector_vt(m))));
			})),
		]));
		//if (vectorSize == 3) st.push(ast.debugger());
		this.eatPrefixes();
		return stms(st);
	}

	_vhtfm_x(i: Instruction, vectorSize: number) {
		var srcMat = readMatrix(i.VS, vectorSize);

		var st:ANodeStm[] = [];
		st.push(call_stm('state.loadVt_prefixed', [ast.array(readVector_f(i.VT, vectorSize))]));
		st.push(call_stm('state.storeVd_prefixed', [
			ast.arrayNumbers(getVectorRegs(i.VD, vectorSize)),
			ast.array(xrange(0, vectorSize).map(n => {
				return this._aggregateV(imm_f(0), vectorSize, (aggregated, m) => binop(aggregated, '+', binop(srcMat[n * vectorSize + m], '*', ((m == vectorSize - 1) ? <ANodeExpr>imm_f(1) : <ANodeExpr>ast.vector_vt(m)))));
			})),
		]));
		this.eatPrefixes();
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

	vzero(i: Instruction) { return this._vset1(i, (i) => imm_f(0)); }
	vone(i: Instruction) { return this._vset1(i, (i) => imm_f(1)); }

	vmov(i: Instruction) { return this._vset3(i, (i, s, t) => s[i]); } // vset3 in order to eat prefixes
	vrcp(i: Instruction) { return this._vset2(i, (i, s) => binop(imm_f(1.0), '/', s[i])); }
	vmul(i: Instruction) { return this._vset3(i, (i, s, t) => binop(s[i], '*', t[i])); }

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
	vsocp(i: Instruction) {
		var vectorSize = i.ONE_TWO;
		return this._vset2(i, (index, src) => {
			switch (index) {
				case 0: return ast.call('MathFloat.sat0', [binop(imm_f(1), '-', src[0])]);
				case 1: return ast.call('MathFloat.sat0', [src[0]]);
				case 2: return ast.call('MathFloat.sat0', [binop(imm_f(1), '-', src[1])]);
				case 3: return ast.call('MathFloat.sat0', [src[1]]);
				default: throw (new Error("vsocp: " + index));
			}
		}, vectorSize * 2, vectorSize);
	}
	vsrt1(i: Instruction) {
		return this._vset2(i, (i, src) => {
			switch (i) {
				case 0: return call('MathFloat.min', [src[0], src[1]]);
				case 1: return call('MathFloat.max', [src[0], src[1]]);
				case 2: return call('MathFloat.min', [src[2], src[3]]);
				case 3: return call('MathFloat.max', [src[2], src[3]]);
				default: throw (new Error("vsrt1: Invalid operation"));
			}
		}, i.ONE_TWO, 4);
	}
	vsrt2(i: Instruction) {
		return this._vset2(i, (i, src) => {
			switch (i) {
				case 0: return call('MathFloat.min', [src[0], src[3]]);
				case 1: return call('MathFloat.min', [src[1], src[2]]);
				case 2: return call('MathFloat.max', [src[1], src[2]]);
				case 3: return call('MathFloat.max', [src[0], src[3]]);
				default: throw (new Error("vsrt2: Invalid operation"));
			}
		}, i.ONE_TWO, 4);
	}
	vsrt3(i: Instruction) {
		return this._vset2(i, (i, src) => {
			switch (i) {
				case 0: return call('MathFloat.max', [src[0], src[1]]);
				case 1: return call('MathFloat.min', [src[0], src[1]]);
				case 2: return call('MathFloat.max', [src[2], src[3]]);
				case 3: return call('MathFloat.min', [src[2], src[3]]);
				default: throw (new Error("vsrt3: Invalid operation"));
			}
		}, i.ONE_TWO, 4);
	}
	vsrt4(i: Instruction) {
		return this._vset2(i, (i, src) => {
			switch (i) {
				case 0: return call('MathFloat.max', [src[0], src[3]]);
				case 1: return call('MathFloat.max', [src[1], src[2]]);
				case 2: return call('MathFloat.min', [src[1], src[2]]);
				case 3: return call('MathFloat.min', [src[0], src[3]]);
				default: throw (new Error("vsrt4: Invalid operation"));
			}
		}, i.ONE_TWO, 4);
	}

	vrnds(i: Instruction) { return call_stm('state.vrnds', []); }
	vrndi(i: Instruction) { return this._vset1(i, (i) => call('state.vrndi', []), undefined, 'int'); }
	vrndf1(i: Instruction) { return this._vset1(i, (i) => call('state.vrndf1', [])); }
	vrndf2(i: Instruction) { return this._vset1(i, (i) => call('state.vrndf2', [])); }

	/*
	public AstNodeStm vrnds(i: Instruction) { return ast.Statement(ast.CallStatic((Action < CpuThreadState, int>) CpuEmitterUtils._vrnds, ast.CpuThreadState)); }
	public AstNodeStm vrndi(i: Instruction) { return VEC_VD_i.SetVector(Index => ast.CallStatic((Func < CpuThreadState, int>) CpuEmitterUtils._vrndi, ast.CpuThreadState), PC); }
	public AstNodeStm vrndf1(i: Instruction) { return VEC_VD.SetVector(Index => ast.CallStatic((Func < CpuThreadState, float>) CpuEmitterUtils._vrndf1, ast.CpuThreadState), PC); }
	public AstNodeStm vrndf2(i: Instruction) { return VEC_VD.SetVector(Index => ast.CallStatic((Func < CpuThreadState, float>) CpuEmitterUtils._vrndf2, ast.CpuThreadState), PC); }
	*/

	_aggregateV(val: ANodeExpr, size: number, generator: (value: ANodeExpr, index: number) => ANodeExpr) {
		for (var n = 0; n < size; n++) val = generator(val, n);
		return val;
	}

	vnop(i: Instruction) { return ast.stm(); }
	vsync(i: Instruction) { return ast.stm(); }
	vflush(i: Instruction) { return ast.stm(); }

	vfad(i: Instruction) {
		var vectorSize = i.ONE_TWO;
		return this._vset2(i, (i, src) => {
			return this._aggregateV(imm_f(0), vectorSize, (value, index) => binop(value, '+', src[index]));
		}, 1, vectorSize);
	}
	vavg(i: Instruction) {
		var vectorSize = i.ONE_TWO;
		return this._vset2(i, (i, src) => {
			return binop(this._aggregateV(imm_f(0), vectorSize, (value, index) => binop(value, '+', src[index])), '/', imm_f(vectorSize));
		}, 1, vectorSize);
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
				default: throw (new Error("vcrs_t assert"));
			}
		}, 3, 3, 3);
	}

	vc2i(i: Instruction) { return this._vset2(i, (index, src) => call('MathVfpu.vc2i', [imm32(index), src[0]]), 0, 1, 'int', 'int'); }
	vuc2i(i: Instruction) { return this._vset2(i, (index, src) => call('MathVfpu.vuc2i', [imm32(index), src[0]]), 0, 1, 'int', 'int'); }
	vs2i(i: Instruction) { return this._vset2(i, (index, src) => call('MathVfpu.vs2i', [imm32(index), src[Math.floor(index / 2)]]), i.ONE_TWO * 2, i.ONE_TWO, 'int', 'int'); }
	vi2f(i: Instruction) { return this._vset2(i, (index, src) => call('MathVfpu.vi2f', [src[index], imm32(-i.IMM5)]), 0, 0, 'float', 'int'); }
	vi2uc(i: Instruction) { return this._vset2(i, (index, src) => call('MathVfpu.vi2uc', [src[0], src[1], src[2], src[3]]), 1, 4, 'int', 'int'); }
	vf2id(i: Instruction) { return this._vset2(i, (index, src) => call('MathVfpu.vf2id', [src[index], imm32(i.IMM5)]), 0, 0, 'int', 'float'); }
	vf2in(i: Instruction) { return this._vset2(i, (index, src) => call('MathVfpu.vf2in', [src[index], imm32(i.IMM5)]), 0, 0, 'int', 'float'); }
	vf2iu(i: Instruction) { return this._vset2(i, (index, src) => call('MathVfpu.vf2iu', [src[index], imm32(i.IMM5)]), 0, 0, 'int', 'float'); }
	vf2iz(i: Instruction) { return this._vset2(i, (index, src) => call('MathVfpu.vf2iz', [src[index], imm32(i.IMM5)]), 0, 0, 'int', 'float'); }

	vf2h(i: Instruction) { return this._vset2(i, (index, src) => call('MathVfpu.vf2h', [imm32(index), src[index]]), 0, 0, 'float', 'float'); }
	vh2f(i: Instruction) { return this._vset2(i, (index, src) => call('MathVfpu.vh2f', [imm32(index), src[index]]), 0, 0, 'float', 'float'); }

	vdet(i: Instruction) {
		return this._vset3(i, (i, s, t) => {
			return binop(binop(s[0], '*', t[1]), '-', binop(s[1], '*', t[0]));
		}, 1, 2, 2);
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

	private _bvtf(i: Instruction, cond: boolean) {
		var reg = i.IMM3;
		var branchExpr = <ANodeExpr>ast.VCC(reg);
		if (!cond) branchExpr = unop("!", branchExpr);
		return this._branch(i, branchExpr);
	}
	
	bvf(i: Instruction) { return this._bvtf(i, false); }
	bvt(i: Instruction) { return this._bvtf(i, true); }

	bvfl(i: Instruction) { return this.bvf(i); }
	bvtl(i: Instruction) { return this.bvt(i); }

	mtv(i: Instruction) { return this._vset1(i, (_) => gpr(i.rt), 1, 'int'); }
	mfv(i: Instruction) { return assign_stm(gpr(i.rt), vfpr_i(i.VD)); }

	mtvc(i: Instruction) {
		switch (i.IMM7) {
			case 0: this._vpfxs.setUnknown(); break;
			case 1: this._vpfxt.setUnknown(); break;
			case 2: this._vpfxd.setUnknown(); break;
		}
		return assign_stm(vfprc(i.IMM7), gpr(i.rt));
	}
	mfvc(i: Instruction) {
		return assign_stm(gpr(i.rt), vfprc(i.IMM7));
	}

	private _vcmovtf(i: Instruction, True: boolean) {
		var result = call_stm('state.vcmovtf', [
			imm32(i.IMM3),
			immBool(True),
			ast.arrayNumbers(getVectorRegs(i.VD, i.ONE_TWO)),
			ast.arrayNumbers(getVectorRegs(i.VS, i.ONE_TWO))
		]);
		this.eatPrefixes();
		return result;
	}

	vcmovt(i: Instruction) { return this._vcmovtf(i, true); }
	vcmovf(i: Instruction) { return this._vcmovtf(i, false); }

	vcmp(ins: Instruction) {
		/*
        return call_stm('state.vcmp', [
            imm32(ins.IMM4),
            ast.array(readVector_f(ins.VS, ins.ONE_TWO)),
            ast.array(readVector_f(ins.VT, ins.ONE_TWO))
        ]);
		*/

		var out:ANodeStm[] = [];
		
		var vectorSize = ins.ONE_TWO;

		//out.push(ast.raw_stm(`debugger;`));
		this._vset_readVS(out, ins, 'float', vectorSize);
		this._vset_readVT(out, ins, 'float', vectorSize);
		var conds:string[] = [];
		for (var i = 0; i < vectorSize; i++) {
			var c = false;
			var cond = '';
			switch (ins.IMM4) {
				case VCondition.FL: cond = `false`; break;
				case VCondition.EQ: cond = `s${i} == t${i}`; break;
				case VCondition.LT: cond = `s${i} < t${i}`; break;
				case VCondition.LE: cond = `s${i} <= t${i}`; break;

				case VCondition.TR: cond = `true`; break;
				case VCondition.NE: cond = `s${i} != t${i}`; break;
				case VCondition.GE: cond = `s${i} >= t${i}`; break;
				case VCondition.GT: cond = `s${i} > t${i}`; break;

				case VCondition.EZ: cond = `(s${i} == 0.0) || (s${i} == -0.0)`; break;
				case VCondition.EN: cond = `MathFloat.isnan(s${i})`; break;
				case VCondition.EI: cond = `MathFloat.isinf(s${i})`; break;
				case VCondition.ES: cond = `MathFloat.isnanorinf(s${i})`; break;   // Tekken Dark Resurrection
					 
				case VCondition.NZ: cond = `s${i} != 0;`; break;
				case VCondition.NN: cond = `!MathFloat.isnan(s${i})`; break;
				case VCondition.NI: cond = `!MathFloat.isinf(s${i})`; break;
				case VCondition.NS: cond = `!(MathFloat.isnanorinf(s${i}))`; break;   // How about t[i] ?	
			}
			conds.push(`((${cond}) << ${i})`);
		}
		let mask = (1 << vectorSize) - 1;
		let inv_affected_bits = ~(mask | (1 << 4) | (1 << 5));
		//out.push(ast.raw_stm(`debugger;`));
		out.push(ast.raw_stm(`var cc = ${conds.join(' | ')};`));
		out.push(ast.raw_stm(`cc |= ((cc & ${mask}) != 0) << 4;`));
		out.push(ast.raw_stm(`cc |= ((cc & ${mask}) == ${mask}) << 5;`));
		out.push(ast.raw_stm(`state.vfprc[${VFPU_CTRL.CC}] = (state.vfprc[${VFPU_CTRL.CC}] & ${inv_affected_bits}) | cc;`));
		this.eatPrefixes();

		return ast.stms(out);
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
	vasin(i: Instruction) {
		//return this._vset2(i, (i, src) => call('MathFloat.asinv1', [src[i]]));
		return stms([
			this._vset2(i, (i, src) => call('MathFloat.asinv1', [src[i]])),
			//ast.debugger()
		]);
	}
	vnsin(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.nsinv1', [src[i]])); }
	vnrcp(i: Instruction) { return this._vset2(i, (i, src) => call('MathFloat.nrcp', [src[i]])); }

	vmin(i: Instruction) { return this._vset3(i, (i, src, target) => call('MathFloat.min', [src[i], target[i]])); }
	vmax(i: Instruction) { return this._vset3(i, (i, src, target) => call('MathFloat.max', [src[i], target[i]])); }
	vdiv(i: Instruction) { return this._vset3(i, (i, src, target) => binop(src[i], '/', target[i])); }
	vadd(i: Instruction) { return this._vset3(i, (i, src, target) => binop(src[i], '+', target[i])); }
	vsub(i: Instruction) { return this._vset3(i, (i, src, target) => binop(src[i], '-', target[i])); }
	vscl(i: Instruction) { return this._vset3(i, (i, src, target) => binop(src[i], '*', target[0]), 0, 0, 1); }
	vdot(i: Instruction) {
		var vectorSize = i.ONE_TWO;
		return this._vset3(i, (i, s, t) => {
			return this._aggregateV(imm_f(0), vectorSize, (sum, n) => binop(sum, '+', binop(s[n], '*', t[n])));
		}, 1, vectorSize, vectorSize);
	}
	vrot(i: Instruction) {
		var vectorSize = i.ONE_TWO;
		var imm5 = i.IMM5;
		var cosIndex = BitUtils.extract(imm5, 0, 2);
		var sinIndex = BitUtils.extract(imm5, 2, 2);
		var negateSin = BitUtils.extractBool(imm5, 4);

		var dest = getVectorRegs(i.VD, i.ONE_TWO);

		return this._vset2(i, (i, s) => {
			var sine = <ANodeExpr>call('MathFloat.sinv1', [s[0]]);
			var cosine = <ANodeExpr>call('MathFloat.cosv1', [s[0]]);
			if (negateSin) sine = unop('-', sine);

			if (i == cosIndex) return cosine;
			if (i == sinIndex) return sine;
			return (sinIndex == cosIndex) ? sine : imm32(0);
		}, vectorSize, 1);
	}
	vmmov(i: Instruction) {
		var vectorSize = i.ONE_TWO;
		var dest = getMatrixRegs(i.VD, vectorSize);
		var src = readMatrix(i.VS, vectorSize);
		//var target = readMatrix(i.VT, i.ONE_TWO);
		var result = setMatrix(dest, (column, row, index) => src[index]);
		this.eatPrefixes();
		return result;
	}

	vmmul(i: Instruction) {
		var VectorSize = i.ONE_TWO;
		var dest = getMatrixRegs(i.VD, VectorSize);
		var src = readMatrix(i.VS, VectorSize);
		var target = readMatrix(i.VT, VectorSize);

		var st:ANodeStm[] = [];
		//st.push(ast.debugger());
		st.push(setMatrix(dest, (Column, Row, Index) =>
		{
			var sum = <ANodeExpr>imm_f(0);
			for (var n = 0; n < VectorSize; n++) {
				sum = binop(sum, '+', binop(src[Column * VectorSize + n], '*', target[Row * VectorSize + n]));
			}
			return sum;
		}));
		st.push(call_stm('state.eatPrefixes', []));
		this.eatPrefixes();
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
		var result = setVector_i(dest, (index) => ast.call('state.' + func, [src[index * 2 + 0], src[index * 2 + 1]]));
		this.eatPrefixes();
		return result;
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

	_storePC(_pc: number) {
		return assign(pc(), u_imm32(_pc));
	}

	private _branch(i: Instruction, cond: ANodeExpr) {
		return new BranchFlagStm(cond, i.PC + i.imm16 * 4 + 4);
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

	///////////////////////////////////////////////////////////////////////////////
	// MEMORY
	///////////////////////////////////////////////////////////////////////////////
	
	sb  (i: Instruction) { return stm(call('memory.sb'  , [rs_imm16(i), gpr(i.rt)])); }
	sh  (i: Instruction) { return stm(call('memory.sh'  , [rs_imm16(i), gpr(i.rt)])); }
	sw  (i: Instruction) { return stm(call('memory.sw'  , [rs_imm16(i), gpr(i.rt)])); }
	swc1(i: Instruction) { return stm(call('memory.sw'  , [rs_imm16(i), fpr_i(i.ft)])); }
	swl (i: Instruction) { return stm(call('memory.swl' , [rs_imm16(i), gpr(i.rt)])); }
	swr (i: Instruction) { return stm(call('memory.swr' , [rs_imm16(i), gpr(i.rt)])); }

	lb  (i: Instruction) { return assignGpr  (i.rt, call('memory.lb',   [rs_imm16(i)])); }
	lbu (i: Instruction) { return assignGpr  (i.rt, call('memory.lbu',  [rs_imm16(i)])); }
	lh  (i: Instruction) { return assignGpr  (i.rt, call('memory.lh',   [rs_imm16(i)])); }
	lhu (i: Instruction) { return assignGpr  (i.rt, call('memory.lhu',  [rs_imm16(i)])); }
	lw  (i: Instruction) { return assignGpr  (i.rt, call('memory.lw',   [rs_imm16(i)])); }
	lwc1(i: Instruction) { return assignFpr_I(i.ft, call('memory.lw',   [rs_imm16(i)])); }
	lwl (i: Instruction) { return assignGpr  (i.rt, call('memory.lwl',  [rs_imm16(i), gpr(i.rt)])); }
	lwr (i: Instruction) { return assignGpr  (i.rt, call('memory.lwr',  [rs_imm16(i), gpr(i.rt)])); }

	_callstackPush(i: Instruction) {
		//return stm(call('state.callstackPush', [imm32(i.PC)]));
		return ast.stm();
	}

	_callstackPop(i: Instruction) {
		//return stm(call('state.callstackPop', []));
		return ast.stm();
	}
		
	j(i: Instruction) {
		return stms([
			stm(assign(branchflag(), imm32(1))),
			stm(assign(branchpc(), u_imm32(i.jump_address)))
		]);
	}
	jr(i: Instruction) {
		var statements:ANodeStm[] = [];
		statements.push(stm(assign(branchflag(), imm32(1))));
		statements.push(stm(assign(branchpc(), gpr(i.rs))));
		if (i.rs == 31) {
			statements.push(this._callstackPop(i));
		}
		return stms(statements);
	}
	
	_jrOpt(i: Instruction) {
		return stms([stm(assign(branchpc(), gpr(i.rs)))]);
	}
	
	jal(i: Instruction) { return stms([this.j(i), this._callstackPush(i), assignGpr(31, u_imm32(i.PC + 8))]); }
	jalr(i: Instruction) { return stms([this.jr(i), this._callstackPush(i), assignGpr(i.rd, u_imm32(i.PC + 8)),]); }

	_comp(i: Instruction, fc02: number, fc3: number) {
		var fc_unordererd = ((fc02 & 1) != 0);
		var fc_equal = ((fc02 & 2) != 0);
		var fc_less = ((fc02 & 4) != 0);
		var fc_inv_qnan = (fc3 != 0); // TODO -- Only used for detecting invalid operations?
		
        //return stm(call('state._comp_impl', [fpr(i.fs), fpr(i.ft), immBool(fc_unordererd), immBool(fc_equal), immBool(fc_less), immBool(fc_inv_qnan)]));

		var s = fpr(i.fs).toJs();
		var t = fpr(i.ft).toJs();
		
		var parts:string[] = [];
		if (fc_equal) parts.push(`(${s} == ${t})`);
		if (fc_less) parts.push(`(${s} < ${t})`);
		if (parts.length == 0) parts = ['false'];
		
		return stm(ast.raw_stm(`state.fcr31_cc = (isNaN(${s}) || isNaN(${t})) ? ${fc_unordererd} : (${parts.join(' | ')})`));
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

export const enum VCondition {
	FL, EQ, LT, LE, TR, NE, GE, GT,
	EZ, EN, EI, ES, NZ, NN, NI, NS
}
