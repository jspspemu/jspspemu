import "../../emu/global"

import {addressToHex, logger, NumberDictionary, sprintf, StringDictionary, throwEndCycles} from "../../global/utils";
import {BitUtils, MathFloat, MathUtils} from "../../global/math";
import {compareNumbers} from "../../global/array";
import {Integer64} from "../../global/int64";
import {Memory} from "../memory";
import {ANodeStm, ANodeStmLabel, MipsAstBuilder} from "./cpu_ast";
import {DecodedInstruction, Instruction, Instructions} from "./cpu_instructions";
import {BranchFlagStm, InstructionAst} from "./cpu_codegen";

//const DEBUG_FUNCGEN = true;
const DEBUG_FUNCGEN = false;

const DEBUG_NATIVEFUNC = false;
//const DEBUG_NATIVEFUNC = true;

const BUILD_FUNC_ON_REFERENCED = true;
//const BUILD_FUNC_ON_REFERENCED = false;

export const enum CpuSpecialAddresses {
	EXIT_THREAD = 0x0FFFFFFF,
}

export interface ICpuExecutable {
	execute(state: CpuState): void;
}

export interface IInstructionCache {
	getFunction(pc: number): ICpuExecutable;
}

class VfpuPrefixBase {
	enabled = false;
	constructor(private vfrc: number[], private index: number) { }
	_info: number;
	_readInfo() { this._info = this.getInfo(); }
	eat() { this.enabled = false; }
	getInfo() { return this.vfrc[this.index]; }
	setInfo(info: number) {
		this.vfrc[this.index] = info;
		this.enabled = true;
	}
}

export interface IEmulatorContext {
}

export class NativeFunction {
	name: string;
	nid: number;
	firmwareVersion: number;
	call: (context: IEmulatorContext, state: CpuState) => void;
	nativeCall: Function;
}

export class SyscallManager {
    private calls: NumberDictionary<NativeFunction> = {};
    private lastId: number = 1;

	constructor(public context: IEmulatorContext) {
    }

    register(nativeFunction: NativeFunction) {
        return this.registerWithId(this.lastId++, nativeFunction);
    }

    registerWithId(id: number, nativeFunction: NativeFunction) {
        this.calls[id] = nativeFunction;
        return id;
    }

	getName(id: number) {
		var c = this.calls[id];
		if (c) return c.name;
		return 'syscall_' + id;
	}
	
	getNativeFunction(id:number) {
		return this.calls[id];
	}

	call(state: CpuState, id: number) {
        var nativeFunction: NativeFunction = this.calls[id];
        if (!nativeFunction) throw `Can't call syscall ${this.getName(id)}: ${addressToHex(id)}"`;
		if (DEBUG_NATIVEFUNC) {
			console.log(`calling syscall ${addressToHex(id)}, ${id}, ${nativeFunction.name} with cpustate:${state.id}`);
		}

        nativeFunction.call(this.context, state);
    }
}



class VfpuPrefixRead extends VfpuPrefixBase {
	//private getSourceIndex(i: number) { return BitUtils.extract(this._info, 0 + i * 2, 2); }
	//private getSourceAbsolute(i: number) { return BitUtils.extractBool(this._info, 8 + i * 1); }
	//private getSourceConstant(i: number) { return BitUtils.extractBool(this._info, 12 + i * 1); }
	//private getSourceNegate(i: number) { return BitUtils.extractBool(this._info, 16 + i * 1); }

	transformValues(input: number[], output: any) {
		this._readInfo();
		var info = this._info;

		if (!this.enabled) {
			for (var n = 0; n < input.length; n++) output[n] = input[n];
		} else {
			for (var n = 0; n < input.length; n++) {
				//var sourceIndex = this.getSourceIndex(n);
				//var sourceAbsolute = this.getSourceAbsolute(n);
				//var sourceConstant = this.getSourceConstant(n);
				//var sourceNegate = this.getSourceNegate(n);

				var sourceIndex = (info >> (0 + n * 2)) & 3;
				var sourceAbsolute = (info >> (8 + n * 1)) & 1;
				var sourceConstant = (info >> (12 + n * 1)) & 1;
				var sourceNegate = (info >> (16 + n * 1)) & 1;

				var value: number;
				if (sourceConstant) {
					switch (sourceIndex) {
						case 0: value = sourceAbsolute ? (3) : (0); break;
						case 1: value = sourceAbsolute ? (1 / 3) : (1); break;
						case 2: value = sourceAbsolute ? (1 / 4) : (2); break;
						case 3: value = sourceAbsolute ? (1 / 6) : (1 / 2); break;
						default: throw new Error("Invalid operation");
					}
				} else {
					//debugger;
					value = input[sourceIndex];
					if (sourceAbsolute) value = Math.abs(value);
				}

				if (sourceNegate) value = MathFloat.neg(value);
				output[n] = value;
			}
		}
	}
}

class VfpuPrefixWrite extends VfpuPrefixBase {
	//getDestinationSaturation(i: number) { return (this._info >> (0 + i * 2)) & 3; }
	//getDestinationMask(i: number) { return (this._info >> (8 + i * 1)) & 1; }

	storeTransformedValues(vfpr: any, indices: number[], values: number[]) {
		this._readInfo();
		var info = this._info;

		if (!this.enabled) {
			for (var n = 0; n < indices.length; n++) {
				vfpr[indices[n]] = values[n];
			}
		} else {
			//debugger;
			for (var n = 0; n < indices.length; n++) {
				//var destinationSaturation = this.getDestinationSaturation(n);
				//var destinationMask = this.getDestinationMask(n);
				var destinationSaturation = (info >> (0 + n * 2)) & 3;
				var destinationMask = (info >> (8 + n * 1)) & 1;
				if (destinationMask) {
					// Masked. No write value.
				} else {
					var value = values[n];
					switch (destinationSaturation) {
						case 1: value = MathFloat.sat0(value); break;
						case 3: value = MathFloat.sat1(value); break;
						default: break;
					}
					vfpr[indices[n]] = value;
				}
			}
		}
	}
}

export const enum VFPU_CTRL {
	SPREFIX, TPREFIX, DPREFIX, CC, INF4, RSV5, RSV6, REV,
	RCX0, RCX1, RCX2, RCX3, RCX4, RCX5, RCX6, RCX7, MAX,
}

export const enum VCondition {
	FL, EQ, LT, LE, TR, NE, GE, GT,
	EZ, EN, EI, ES, NZ, NN, NI, NS
}


export class CpuState {
	static lastId:number = 0;
	id = CpuState.lastId++;
	
	//constructor(public memory: Memory, public syscallManager: SyscallManager, public interpreted: boolean = true) {
    constructor(public memory: Memory, public syscallManager: SyscallManager, public interpreted: boolean = false) {
		this.icache = new InstructionCache(memory, syscallManager);
		this.fcr0 = 0x00003351;
		this.fcr31 = 0x00000e00;
		for (var n = 0; n < 128; n++) this.vfpr[n] = NaN;
	}

	clone() {
		var that = new CpuState(this.memory, this.syscallManager);
		that.icache = this.icache;
		that.copyRegistersFrom(this);
		return that;
	}

	icache: InstructionCache;

	insideInterrupt: boolean = false;
	gpr_Buffer = new ArrayBuffer(32 * 4);
	gpr_f = new Float32Array(this.gpr_Buffer);

	jumpCall: InvalidatableCpuFunction = null

	temp = new Array(16);

	fpr_Buffer = new ArrayBuffer(32 * 4);
	fpr = new Float32Array(this.fpr_Buffer);
	fpr_i = new Int32Array(this.fpr_Buffer);
	//fpr: Float32Array = new Float32Array(32);

	vfpr_Buffer = new ArrayBuffer(128 * 4);
	vfpr: Float32Array = new Float32Array(this.vfpr_Buffer);
	vfpr_i: Int32Array = new Int32Array(this.vfpr_Buffer);
	vfprc = [0, 0, 0, 0xFF, 0, 0, 0, 0, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000];
	setVfrCc(index: number, value: boolean) {
		if (value) {
			this.vfprc[VFPU_CTRL.CC] |= (1 << index);
		} else {
			this.vfprc[VFPU_CTRL.CC] &= ~(1 << index);
		}
	}

	vrnds() { }
	vrndi() {
		var v = 0;
		for (var n = 0; n < 4; n++) {
			v <<= 8;
			v |= (Math.round(Math.random() * 255) & 0xFF);
		}
		return v;
	}
	vrndf1() { return Math.random() * 2; }
	vrndf2() { return Math.random() * 4; }

	getVfrCc(index: number) {
		return ((this.vfprc[VFPU_CTRL.CC] & (1 << index)) != 0);
	}

	vcmovtf(register: number, _true: boolean, vdRegs: number[], vsRegs: number[]) {
		var vectorSize = vdRegs.length;
		this.loadVs_prefixed(vsRegs.map(reg => this.vfpr[reg]));
		this.loadVdRegs(vdRegs);

		var compare = _true ? 1 : 0;
		var cc = this.vfprc[VFPU_CTRL.CC];

		if (register < 6) {
			if (((cc >> register) & 1) == compare) {
				for (var n = 0; n < vectorSize; n++) {
					this.vector_vd[n] = this.vector_vs[n];
				}
			}
		} if (register == 6) {
			for (var n = 0; n < vectorSize; n++) {
				if (((cc >> n) & 1) == compare) {
					this.vector_vd[n] = this.vector_vs[n];
				}
			}
		} else {
		}
		this.storeVdRegsWithPrefix(vdRegs);
	}

    storeFloats(address: number, values: number[]) {
        for (var n = 0; n < values.length; n++) {
            this.memory.writeFloat32(address + n * 4, values[n]);
        }
    }

	private vpfxs = new VfpuPrefixRead(this.vfprc, VFPU_CTRL.SPREFIX);
	private vpfxt = new VfpuPrefixRead(this.vfprc, VFPU_CTRL.TPREFIX);
	private vpfxd = new VfpuPrefixWrite(this.vfprc, VFPU_CTRL.DPREFIX);

	setVpfxt(value: number) { this.vpfxt.setInfo(value); }
	setVpfxs(value: number) { this.vpfxs.setInfo(value); }
	setVpfxd(value: number) { this.vpfxd.setInfo(value); }

	vector_vs = [0, 0, 0, 0];
	vector_vt = [0, 0, 0, 0];
	vector_vd = [0, 0, 0, 0];

	get vfpumatrix0() { return this.getVfpumatrix(0); }
	get vfpumatrix1() { return this.getVfpumatrix(1); }
	get vfpumatrix2() { return this.getVfpumatrix(2); }
	get vfpumatrix3() { return this.getVfpumatrix(3); }
	get vfpumatrix4() { return this.getVfpumatrix(4); }
	get vfpumatrix5() { return this.getVfpumatrix(5); }
	get vfpumatrix6() { return this.getVfpumatrix(6); }
	get vfpumatrix7() { return this.getVfpumatrix(7); }

	eatPrefixes() {
		this.vpfxd.eat();
		this.vpfxt.eat();
		this.vpfxs.eat();
	}

	getVfpumatrix(index: number) {
		var values: number[] = [];
		for (var r = 0; r < 4; r++) {
			for (var c = 0; c < 4; c++) {
				values.push(this.vfpr[r * 32 + index * 4 + c]);
			}
		}
		return values;
	}

	loadVdRegs(regs: number[]) {
		for (var n = 0; n < regs.length; n++) {
			this.vector_vd[n] = this.vfpr[regs[n]];
		}
	}

	storeVdRegsWithPrefix(regs: number[]) {
		this.vpfxd.storeTransformedValues(this.vfpr, regs, this.vector_vd);
		this.vpfxd.eat();
		this.storeVdRegs(regs);
	}

	storeVdRegsWithPrefix1(regs: number[]) {
		this.vpfxd.storeTransformedValues(this.vfpr, regs, this.vector_vd);
		this.vpfxd.eat();
		this.storeVdRegs(regs);
	}

	storeVdRegs(regs: number[]) {
		for (var n = 0; n < regs.length; n++) this.vfpr[regs[n]] = this.vector_vd[n];
	}

	loadVs_prefixed(values: number[]) {
		this.vpfxs.transformValues(values, this.vector_vs);
		this.vpfxs.eat();
	}

	loadVt_prefixed(values: number[]) {
		this.vpfxt.transformValues(values, this.vector_vt);
		this.vpfxt.eat();
	}

	storeVd_prefixed(indices: number[], values: number[]) {
		this.vpfxd.storeTransformedValues(this.vfpr, indices, values);
		this.vpfxd.eat();
	}

	storeVd_prefixed_i(indices: number[], values: number[]) {
		this.vpfxd.storeTransformedValues(this.vfpr_i, indices, values);
		this.vpfxd.eat();
	}

	_vt4444_step(i0: number, i1: number) {
		var o = 0;
		o |= ((i0 >> 4) & 15) << 0;
		o |= ((i0 >> 12) & 15) << 4;
		o |= ((i0 >> 20) & 15) << 8;
		o |= ((i0 >> 28) & 15) << 12;
		o |= ((i1 >> 4) & 15) << 16;
		o |= ((i1 >> 12) & 15) << 20;
		o |= ((i1 >> 20) & 15) << 24;
		o |= ((i1 >> 28) & 15) << 28;
		return o;
	}

	_vt5551_step(i0: number, i1: number) {
		var o = 0;
		o |= ((i0 >> 3) & 31) << 0;
		o |= ((i0 >> 11) & 31) << 5;
		o |= ((i0 >> 19) & 31) << 10;
		o |= ((i0 >> 31) & 1) << 15;
		o |= ((i1 >> 3) & 31) << 16;
		o |= ((i1 >> 11) & 31) << 21;
		o |= ((i1 >> 19) & 31) << 26;
		o |= ((i1 >> 31) & 1) << 31;
		return o;
	}

	_vt5650_step(i0: number, i1: number) {
		var o = 0;
		o |= ((i0 >> 3) & 31) << 0;
		o |= ((i0 >> 10) & 63) << 5;
		o |= ((i0 >> 19) & 31) << 11;
		o |= ((i1 >> 3) & 31) << 16;
		o |= ((i1 >> 10) & 63) << 21;
		o |= ((i1 >> 19) & 31) << 27;
		return o;
	}

	svl_q(address: number, r: number[]) {
		var k = (3 - ((address >>> 2) & 3));
		address &= ~0xF;
		for (var n = k; n < 4; n++ , address += 4) this.memory.sw(address, this.vfpr_i[r[n]]);
	}

	svr_q(address: number, r: number[]) {
		var k = (4 - ((address >>> 2) & 3));
		for (var n = 0; n < k; n++ , address += 4) this.memory.sw(address, this.vfpr_i[r[n]]);
	}

	lvl_q(address: number, r: number[]) {
		var k = (3 - ((address >>> 2) & 3));
		address &= ~0xF;
		for (var n = k; n < 4; n++ , address += 4) this.vfpr_i[r[n]] = this.memory.lw(address);
	}

	lvr_q(address: number, r: number[]) {
		var k = (4 - ((address >>> 2) & 3));
		for (var n = 0; n < k; n++ , address += 4) this.vfpr_i[r[n]] = this.memory.lw(address);
	}

	vfpuStore(indices: number[], values: number[]) { for (var n = 0; n < indices.length; n++) this.vfpr[indices[n]] = values[n]; }
	vfpuStore_i(indices: number[], values: number[]) { for (var n = 0; n < indices.length; n++) this.vfpr_i[indices[n]] = values[n]; }

	vfpuSetMatrix(m: number, values: number[]) {
		// @TODO
		this.vfpr[0] = 0;
		throw new Error("Not implemented vfpuSetMatrix!");
	}
	
    vcmp(cond: VCondition, vsValues: number[], vtValues: number[]) {
        var vectorSize = vsValues.length;
        this.loadVs_prefixed(vsValues);
        this.loadVt_prefixed(vtValues);
        var s = this.vector_vs;
        var t = this.vector_vt;

        var cc = 0;
        var or_val = 0;
        var and_val = 1;
        var affected_bits = (1 << 4) | (1 << 5);  // 4 and 5

        for (var i = 0; i < vectorSize; i++) {
            var c = false;
            switch (cond) {
                case VCondition.FL: c = false; break;
                case VCondition.EQ: c = s[i] == t[i]; break;
                case VCondition.LT: c = s[i] < t[i]; break;
                case VCondition.LE: c = s[i] <= t[i]; break;

                case VCondition.TR: c = true; break;
                case VCondition.NE: c = s[i] != t[i]; break;
                case VCondition.GE: c = s[i] >= t[i]; break;
                case VCondition.GT: c = s[i] > t[i]; break;

                case VCondition.EZ: c = s[i] == 0.0 || s[i] == -0.0; break;
                case VCondition.EN: c = MathFloat.isnan(s[i]); break;
                case VCondition.EI: c = MathFloat.isinf(s[i]); break;
                case VCondition.ES: c = MathFloat.isnanorinf(s[i]); break;   // Tekken Dark Resurrection
                     
                case VCondition.NZ: c = s[i] != 0; break;
                case VCondition.NN: c = !MathFloat.isnan(s[i]); break;
                case VCondition.NI: c = !MathFloat.isinf(s[i]); break;
                case VCondition.NS: c = !(MathFloat.isnanorinf(s[i])); break;   // How about t[i] ?    
            }
            var c_i = (c ? 1 : 0);
            cc |= (c_i << i);
            or_val |= c_i;
            and_val &= c_i;
            affected_bits |= 1 << i;
        }

        this.vfprc[VFPU_CTRL.CC] = (this.vfprc[VFPU_CTRL.CC] & ~affected_bits) | ((cc | (or_val << 4) | (and_val << 5)) & affected_bits);
        this.eatPrefixes();
    }

    nPC: number = 4;
	PC: number = 0;
	IC: number = 0;
	LO: number = 0;
	HI: number = 0;

	thread: any = null;

	setPC(pc: number) {
	    this.PC = pc
        this.nPC = pc + 4
    }

	preserveRegisters(callback: () => void) {
		var temp = new CpuState(this.memory, this.syscallManager);
		temp.copyRegistersFrom(this);
		callback();
		this.copyRegistersFrom(temp);
	}

	copyRegistersFrom(other: CpuState) {
        this.nPC = other.nPC;
		this.PC = other.PC;
		this.IC = other.IC;
		this.LO = other.LO;
		this.HI = other.HI;
		this.insideInterrupt = other.insideInterrupt;
		for (let n = 0; n < 32; n++) {
			this.setGPR(n, other.getGPR(n));
		}
		for (let n = 0; n < 32; n++) this.fpr[n] = other.fpr[n];
		for (let n = 0; n < 128; n++) this.vfpr[n] = other.vfpr[n];
		for (let n = 0; n < 8; n++) this.vfprc[n] = other.vfprc[n];
	}

	private gpr = new Int32Array(this.gpr_Buffer);

	setGPR(n: number, value: number) {
		if (n != 0) this.gpr[n] = value;
	}

	getGPR(n: number) {
		return this.gpr[n];
	}

	static GPR_access(base: string, n: number) {
		if (base == null) return `gpr[${n}]`;
		return base + `.gpr[${n}]`;
	}

	static GPR_require_castToInt() {
		return false;
	}

	/*
	gpr1 = 0;
	gpr2 = 0;
	gpr3 = 0;
	gpr4 = 0;
	gpr5 = 0;
	gpr6 = 0;
	gpr7 = 0;
	gpr8 = 0;
	gpr9 = 0;
	gpr10 = 0;
	gpr11 = 0;
	gpr12 = 0;
	gpr13 = 0;
	gpr14 = 0;
	gpr15 = 0;
	gpr16 = 0;
	gpr17 = 0;
	gpr18 = 0;
	gpr19 = 0;
	gpr20 = 0;
	gpr21 = 0;
	gpr22 = 0;
	gpr23 = 0;
	gpr24 = 0;
	gpr25 = 0;
	gpr26 = 0;
	gpr27 = 0;
	gpr28 = 0;
	gpr29 = 0;
	gpr30 = 0;
	gpr31 = 0;

	setGPR(n: number, value: number) {
		switch (n) {
			case 0: return;
			case 1: this.gpr1 = value; return;
			case 2: this.gpr2 = value; return;
			case 3: this.gpr3 = value; return;
			case 4: this.gpr4 = value; return;
			case 5: this.gpr5 = value; return;
			case 6: this.gpr6 = value; return;
			case 7: this.gpr7 = value; return;
			case 8: this.gpr8 = value; return;
			case 9: this.gpr9 = value; return;
			case 10: this.gpr10 = value; return;
			case 11: this.gpr11 = value; return;
			case 12: this.gpr12 = value; return;
			case 13: this.gpr13 = value; return;
			case 14: this.gpr14 = value; return;
			case 15: this.gpr15 = value; return;
			case 16: this.gpr16 = value; return;
			case 17: this.gpr17 = value; return;
			case 18: this.gpr18 = value; return;
			case 19: this.gpr19 = value; return;
			case 20: this.gpr20 = value; return;
			case 21: this.gpr21 = value; return;
			case 22: this.gpr22 = value; return;
			case 23: this.gpr23 = value; return;
			case 24: this.gpr24 = value; return;
			case 25: this.gpr25 = value; return;
			case 26: this.gpr26 = value; return;
			case 27: this.gpr27 = value; return;
			case 28: this.gpr28 = value; return;
			case 29: this.gpr29 = value; return;
			case 30: this.gpr30 = value; return;
			case 31: this.gpr31 = value; return;
		}
		return;
	}

	getGPR(n: number) {
		switch (n) {
			case 0: return 0;
			case 1: return this.gpr1;
			case 2: return this.gpr2;
			case 3: return this.gpr3;
			case 4: return this.gpr4;
			case 5: return this.gpr5;
			case 6: return this.gpr6;
			case 7: return this.gpr7;
			case 8: return this.gpr8;
			case 9: return this.gpr9;
			case 10: return this.gpr10;
			case 11: return this.gpr11;
			case 12: return this.gpr12;
			case 13: return this.gpr13;
			case 14: return this.gpr14;
			case 15: return this.gpr15;
			case 16: return this.gpr16;
			case 17: return this.gpr17;
			case 18: return this.gpr18;
			case 19: return this.gpr19;
			case 20: return this.gpr20;
			case 21: return this.gpr21;
			case 22: return this.gpr22;
			case 23: return this.gpr23;
			case 24: return this.gpr24;
			case 25: return this.gpr25;
			case 26: return this.gpr26;
			case 27: return this.gpr27;
			case 28: return this.gpr28;
			case 29: return this.gpr29;
			case 30: return this.gpr30;
			case 31: return this.gpr31;
		}
		return 0;
	}

	static GPR_access(base: string, n: number) {
		//if (base == null) return `gpr[${n}]`;
		//return base + `.gpr[${n}]`;
		if (base == null) return `gpr${n}`;
		return `${base}.gpr${n}`;
	}

	static GPR_require_castToInt() {
		return true;
	}
	*/

	get V0(): number { return this.getGPR(2); } set V0(value: number) { this.setGPR(2, value); }
	get V1(): number { return this.getGPR(3); } set V1(value: number) { this.setGPR(3, value); }
	get K0(): number { return this.getGPR(26); } set K0(value: number) { this.setGPR(26, value); }
	get GP(): number { return this.getGPR(28); } set GP(value: number) { this.setGPR(28, value); }
	get SP(): number { return this.getGPR(29); } set SP(value: number) { this.setGPR(29, value); }
	get FP(): number { return this.getGPR(30); } set FP(value: number) { this.setGPR(30, value); }
	get RA(): number { return this.getGPR(31); } set RA(value: number) { this.setGPR(31, value); }
	getRA(): number { return this.getGPR(31); } setRA(value: number) { this.setGPR(31, value); }

	private callstack: number[] = [];

	callstackPush(PC: number) {
		//this.callstack.push(PC);
	}

	callstackPop() {
		//this.callstack.pop();
	}

	printCallstack(symbolLookup: any = null) {
		this.getCallstack().forEach((PC) => {
			var line = addressToHex(PC);
			if (symbolLookup) {
				line += ` : ${symbolLookup.getSymbolAt(PC)}`;
			}
			console.log(line);
		});
	}

	getCallstack() {
		return this.callstack.slice(0);
	}

	fcr31_rm: number = 0;
	fcr31_2_21: number = 0;
	fcr31_25_7: number = 0;
	fcr31_cc: boolean = false;
	fcr31_fs: boolean = false;
	fcr0 = 0x00003351;

	_trace_state() {
		console.info(this);
		throw ('_trace_state');
	}

	get fcr31() {
		var value = 0;
		value = BitUtils.insert(value, 0, 2, this.fcr31_rm);
		value = BitUtils.insert(value, 2, 21, this.fcr31_2_21);
		value = BitUtils.insert(value, 23, 1, this.fcr31_cc ? 1 : 0);
		value = BitUtils.insert(value, 24, 1, this.fcr31_fs ? 1 : 0);
		value = BitUtils.insert(value, 25, 7, this.fcr31_25_7);
		return value;
	}

	set fcr31(value: number) {
		this.fcr31_rm = BitUtils.extract(value, 0, 2);
		this.fcr31_2_21 = BitUtils.extract(value, 2, 21);
		this.fcr31_cc = (BitUtils.extract(value, 23, 1) != 0);
		this.fcr31_fs = (BitUtils.extract(value, 24, 1) != 0);
		this.fcr31_25_7 = BitUtils.extract(value, 25, 7);
	}

	get fcr0_rev() { return BitUtils.extract(this.fcr0, 0, 8); }
	get fcr0_imp() { return BitUtils.extract(this.fcr0, 8, 24); }

	_cfc1_impl(d: number, t: number) {
		switch (d) {
			case 0: this.setGPR(t, this.fcr0); break;
			case 31: this.setGPR(t, this.fcr31); break;
			default: this.setGPR(t, 0); break;
		}
	}

	_ctc1_impl(d: number, t: number) {
		switch (d) {
			case 31: this.fcr31 = t; break;
		}
	}

	_comp_impl(s: number, t: number, fc_unordererd: boolean, fc_equal: boolean, fc_less: boolean, fc_inv_qnan: boolean) {

		if (isNaN(s) || isNaN(t)) {
			this.fcr31_cc = fc_unordererd;
		}
		else {
			//bool cc = false;
			//if (fc_equal) cc = cc || (s == t);
			//if (fc_less) cc = cc || (s < t);
			//return cc;
			var equal = (fc_equal) && (s == t);
			var less = (fc_less) && (s < t);

			this.fcr31_cc = (less || equal);
		}
	}

	_cvt_w_s_impl(FS: number) {
		//Console.WriteLine("_cvt_w_s_impl: {0}", CpuThreadState.FPR[FS]);
		switch (this.fcr31_rm) {
			case 0: return MathFloat.rint(FS); // rint: round nearest
			case 1: return MathFloat.cast(FS); // round to zero
			case 2: return MathFloat.ceil(FS); // round up (ceil)
			case 3: return MathFloat.floor(FS); // round down (floor)
		}

		throw ("RM has an invalid value!!");
	}

	cache(rs: number, type: number, offset: number) {
		//if (DebugOnce('state.cache', 100)) console.warn(sprintf('cache opcode! %08X+%d, type: %d', rs, offset, type));
	}
	syscall(id: number) {
		this.syscallManager.call(this, id);
		this.checkCyclesSyscall(id);
	}

	min(a: number, b: number) { return ((a | 0) < (b | 0)) ? a : b; }
	max(a: number, b: number) { return ((a | 0) > (b | 0)) ? a : b; }

	slt(a: number, b: number) { return ((a | 0) < (b | 0)) ? 1 : 0; }
	sltu(a: number, b: number) { return ((a >>> 0) < (b >>> 0)) ? 1 : 0; }

	div(rs: number, rt: number) {
		rs |= 0; // signed
		rt |= 0; // signed
		this.LO = (rs / rt) | 0;
		this.HI = (rs % rt) | 0;
	}

	divu(rs: number, rt: number) {
		rs >>>= 0; // unsigned
		rt >>>= 0; // unsigned
		this.LO = (rs / rt) | 0;
		this.HI = (rs % rt) | 0;
	}

	private static _mult_temp = [0, 0];

	mult(rs: number, rt: number) {
		Math.imul32_64(rs, rt, CpuState._mult_temp);
		this.LO = CpuState._mult_temp[0];
		this.HI = CpuState._mult_temp[1];
	}

	madd(rs: number, rt: number) {
		var a64 = Integer64.fromInt(rs);
		var b64 = Integer64.fromInt(rt);
		var result = Integer64.fromBits(this.LO, this.HI).add(a64.multiply(b64));
		this.HI = result.high;
		this.LO = result.low;
	}

	msub(rs: number, rt: number) {
		var a64 = Integer64.fromInt(rs);
		var b64 = Integer64.fromInt(rt);
		var result = Integer64.fromBits(this.LO, this.HI).sub(a64.multiply(b64));
		this.HI = result.high;
		this.LO = result.low;
	}

	multu(rs: number, rt: number) {
		var info = Math.umul32_64(rs, rt, CpuState._mult_temp);
		this.LO = info[0];
		this.HI = info[1];
	}

	maddu(rs: number, rt: number) {
		var a64 = Integer64.fromUnsignedInt(rs);
		var b64 = Integer64.fromUnsignedInt(rt);
		var result = Integer64.fromBits(this.LO, this.HI).add(a64.multiply(b64));
		this.HI = result.high;
		this.LO = result.low;
	}

	msubu(rs: number, rt: number) {
		var a64 = Integer64.fromUnsignedInt(rs);
		var b64 = Integer64.fromUnsignedInt(rt);
		var result = Integer64.fromBits(this.LO, this.HI).sub(a64.multiply(b64));
		this.HI = result.high;
		this.LO = result.low;
	}

	getFunction(pc: number): InvalidatableCpuFunction {
		return this.icache.getFunction(pc, 0);
	}

    interpreter?: any = null

	//executeAtPC() {
	//	this.startThreadStep();
    //    while (true) {
    //        if (this.PC == 0x1234) break;
    //        this.getFunction(this.PC).execute(this);
    //    }
	//}
	//executeAtPCAsync() {
	//	this.startThreadStep();
	//	try {
	//		this.getFunction(this.PC).execute(this);
	//	} catch (e) {
	//		if (e.message != 'CpuBreakException') throw e;
	//	}
	//}

	break() {
		throwEndCycles();
	}
	
	private cycles: number = 0;
	private cycles2: number = 0;
	private syscallCount: number = 0;
	private lastSyscallCalled: string = '';
	startThreadStep() {
		//this.time = performance.now();
		this.cycles = 0;
		this.cycles2 = 0;
		this.syscallCount = 0;
		this.lastSyscallCalled = '';
	}
	
	checkCycles(cycles: number) {
		/*
		this.cycles += cycles;
		if (this.cycles >= 1000000) {
			console.info('syscallCount:', this.syscallCount);
			console.info('last syscall called:', this.lastSyscallCalled);
			this.startThreadStep();
			debugger;
			//if (!this.insideInterrupt) throwEndCycles();
		}
		*/
	}
	
	checkCyclesSyscall(id: number) {
		/*
		this.syscallCount++;
		this.lastSyscallCalled = this.syscallManager.getName(id);
		this.cycles2 += 1;
		*/
		/*
		if (this.cycles2 >= 1000) {
			this.cycles2 = 0;
			if (!this.insideInterrupt) throwEndCycles();
		}
		*/
	}
}

var ast = new MipsAstBuilder();

export interface InstructionUsage {
	name: string;
	count: number;
}

class PspInstructionStm extends ANodeStm {
	public PC: number;
	constructor(public di: DecodedInstruction, public code: ANodeStm) {
		super();
		this.PC = di.PC;
	}

	toJs() {
		return `${this.code.toJs()} /* ${this.di.type.name} */`;
		//return "/*" + addressToHex(this.PC) + "*/ /* " + StringUtils.padLeft(this.di.type.name, ' ', 6) + " */  " + this.code.toJs();
	}
	optimize() { return new PspInstructionStm(this.di, this.code.optimize()); }
}

interface FunctionInfo {
	start: number;
	min: number;
	max: number;
	labels: NumberDictionary<boolean>;
}

type ICpuFunction = (state: CpuState) => void;
type ICpuFunctionWithArgs = (state: CpuState, args: any) => void;
class CpuFunctionWithArgs {
	public constructor(public func: ICpuFunction, public args: any) { }
}
type IFunctionGenerator = (address: number) => CpuFunctionWithArgs;

export class InvalidatableCpuFunction {
	private func: CpuFunctionWithArgs = null;

	public constructor(public PC: number, private generator: IFunctionGenerator) { }
	public invalidate() { this.func = null; }
	public execute(state: CpuState): void {
		if (this.func == null) this.func = this.generator(this.PC);
		state.checkCycles(0);
		this.func.func(state);
	}
}

export class InstructionCache {
	functionGenerator: FunctionGenerator;
	private cache: NumberDictionary<InvalidatableCpuFunction> = {};
	private functions: NumberDictionary<FunctionGeneratorResult> = {};
	private examinedAddress: NumberDictionary<boolean> = {};
	private createBind: IFunctionGenerator;

	constructor(public memory: Memory, public syscallManager: SyscallManager) {
		this.functionGenerator = new FunctionGenerator(memory, syscallManager, this);
		this.createBind = this.create.bind(this);
	}

	invalidateAll() {
		for (var pc in this.examinedAddress) {
			delete this.examinedAddress[pc];
		}
		for (var pc in this.cache) {
			this.cache[pc].invalidate();
			delete this.functions[pc];
		}
	}

	invalidateRange(from: number, to: number) {
		for (var pc = from; pc < to; pc += 4) {
			if (this.cache[pc]) this.cache[pc].invalidate();
			delete this.examinedAddress[pc];
			delete this.functions[pc];
		}
	}

	private create(address: number, level:number): CpuFunctionWithArgs {
		this.examinedAddress[address] = true;
		// @TODO: check if we have a function in this range already range already!
		var info = this.functionGenerator.getFunctionInfo(address, level);
		//var func = this.functions[info.min];
		var func = this.functions[info.start];
		if (func === undefined) {
			//console.log(`Creating function ${addressToHex(address)}`);
			//this.functions[info.min] = func = this.functionGenerator.getFunction(info);
			this.functions[info.start] = null;
			this.functions[info.start] = func = this.functionGenerator.getFunction(info, level);

			if (DEBUG_FUNCGEN) {
				console.log('****************************************');
				console.log('****************************************');
				console.log(func.info);
				console.log(func.code.code);
			}
		}
		return func.fargs;
	}

	getFunction(address: number, level:number): InvalidatableCpuFunction {
		address &= Memory.MASK;
		if (!this.cache[address]) {
			this.cache[address] = new InvalidatableCpuFunction(address, this.createBind);
		}
		if (BUILD_FUNC_ON_REFERENCED) {
			//if (level <= 1 && !this.examinedAddress[address]) this.create(address, level);
			//if (!this.examinedAddress[address]) this.create(address, level);
		}
		return this.cache[address];
	}
}

class FunctionGeneratorResult {
	constructor(public func: ICpuFunction, public code: FunctionCode, public info: FunctionInfo, public fargs: CpuFunctionWithArgs) { }
}

class FunctionCode {
	constructor(public code: string, public args: any) { }
}

export class FunctionGenerator {
	private instructions: Instructions = Instructions.instance;
	private instructionAst = new InstructionAst();
	//private instructionGenerartorsByName = <StringDictionary<Function>>{ };
	private instructionUsageCount: StringDictionary<number> = {};

	enableJumpBranch = true;
	//enableJumpBranch = false;
	//supportsTailCallOptimization = true;
	//supportsTailCallOptimization = false;

	constructor(public memory: Memory, public syscallManager: SyscallManager, public instructionCache: InstructionCache) {
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

	private generatePspInstruction(di: DecodedInstruction): PspInstructionStm {
		return new PspInstructionStm(di, this.generateInstructionAstNode(di));
	}

	private generateInstructionAstNode(di: DecodedInstruction): ANodeStm {
		var instruction = di.instruction;
		var instructionType = di.type;
		var func: Function = (<any>this.instructionAst)[instructionType.name];
		if (func === undefined) throw (sprintf("Not implemented '%s' at 0x%08X", instructionType, di.instruction.PC));
		return func.call(this.instructionAst, instruction, di);
	}

	create(address: number, level:number): FunctionGeneratorResult {
		return this.getFunction(this.getFunctionInfo(address, level), level);
	}

	getFunction(info: FunctionInfo, level:number): FunctionGeneratorResult {
		var start = performance.now();
		var code = this.getFunctionCode(info, level);
		try {
			//var func = <ICpuFunction>(new Function('state', 'args', '"use strict";' + code.code));
			var startHex = addressToHex(info.start);
			var func = <ICpuFunction>(new Function('args', `return function func_${startHex}(state) { "use strict"; ${code.code} }`)(code.args));
			var result = new FunctionGeneratorResult(func, code, info, new CpuFunctionWithArgs(func, code.args));
			var end = performance.now();
			var elapsed = end - start;
			if (elapsed >= 20) console.warn(`generated function ${startHex} in ${end - start} ms. ${addressToHex(info.min)}-${addressToHex(info.max)} : ${addressToHex(info.start)} : instructions:${(info.max - info.start) / 4}`);
			return result;
		} catch (e) {
			console.info('code:\n', code.code);
			console.info('args:\n', code.args);
			console.error(e);
			throw (e);
		}
	}
	
	getFunctionInfo(address: number, level:number): FunctionInfo {
		if (address == CpuSpecialAddresses.EXIT_THREAD) return { start: address, min: address, max: address + 4, labels: {} };
		if (address == 0x00000000) throw (new Error("Trying to execute 0x00000000"));

		const explored: NumberDictionary<Boolean> = {};
		const explore = [address];
		const info: FunctionInfo = { start: address, min: address, max: address, labels: {} };
		const MAX_EXPLORE = 20000;
		var exploredCount = 0;

		function addToExplore(pc: number) {
			if (explored[pc]) return;
			explored[pc] = true;
			explore.push(pc);
		}

		while (explore.length > 0) {
			var PC = explore.shift();
			var di = this.decodeInstruction(PC);
			var type = di.type;
			info.min = Math.min(info.min, PC);
			info.max = Math.max(info.max, PC + 4); // delayed branch
			
			//printf("PC: %08X: %s", PC, di.type.name);
			if (++exploredCount >= MAX_EXPLORE) throw new Error(`Function too big ${exploredCount}`);

			var exploreNext = true;
			var exploreTarget = type.isBranch && !type.isRegister;

			//if (this.enableJumpBranch && type.isFixedAddressJump && !explored[di.targetAddress]) exploreTarget = true;
			if (type.isBreak) exploreNext = false;
			if (type.isJumpNoLink) exploreNext = false;
			if (di.isUnconditional) exploreNext = false;
			
			// It is a local jump, a long loop for example
			
			if (exploreTarget) {
				if (di.targetAddress >= info.min - 8) {
					info.labels[di.targetAddress] = true;
					if (exploreNext) info.labels[PC + 8] = true;
					addToExplore(di.targetAddress);
				}
			}
			if (exploreNext) {
				addToExplore(PC + 4);
			}
		}

		info.labels[info.start] = true;
		info.labels[info.min] = true;

		return info;
	}
	
	private detectSyscallCall(pc:number):number {
		var di = this.decodeInstruction(pc);
		var di2 = this.decodeInstruction(pc + 4);
		if (di.type.name == 'jr' && di2.type.name == 'syscall') {
			return di2.instruction.vsyscall;
		} else {
			return -1;
		}
	}

	getFunctionCode(info: FunctionInfo, level:number): FunctionCode {
		var args: any = {};
		if (info.start == CpuSpecialAddresses.EXIT_THREAD) return new FunctionCode("state.thread.stop('CpuSpecialAddresses.EXIT_THREAD'); throw new Error('CpuBreakException');", args);

		var func = ast.func(
			info.start,
			ast.raw_stm('var label = 0, BRANCHPC = 0, BRANCHFLAG = false, expectedRA = 0, memory = state.memory, gpr = state.gpr, gpr_f = state.gpr_f;'),
			ast.raw_stm('state.jumpCall = null; return;'),
			[]
		);
		
		var labels: NumberDictionary<ANodeStmLabel> = {};
		for (let labelPC in info.labels) labels[labelPC] = ast.label(<number><any>labelPC);

		/*
		if (info.start == 0x08806280) {
			func.add(ast.raw(`console.log('**************************************************************************');`));
			func.add(ast.raw(`console.log('**************************************************************************');`));
			func.add(ast.raw(`console.log('**************************************************************************');`));
			func.add(ast.raw(`console.log('**************************************************************************');`));
			func.add(ast.raw(`console.log('**************************************************************************');`));
			func.add(ast.raw(`console.log(args.code);`));
		}
		*/
		//func.add(ast.raw(sprintf(`console.log('MIN:%08X, PC:%08X');`, info.min, info.start)));
		//func.add(ast.djump(ast.raw(`${info.start}`)));
		if (info.min != info.start) {
			func.add(ast.sjump(ast.raw('true'), info.start));
		}

		if ((info.max - info.min) == 4) {
			var syscallId = this.detectSyscallCall(info.min);
			if (syscallId >= 0) {
				return new FunctionCode(
					`
					/* ${this.syscallManager.getName(syscallId)} at ${addressToHex(info.start)} */
					state.PC = state.RA; state.jumpCall = null;
					state.syscall(${syscallId});
					return;
					`,
					args
				);
			}
		}
		
		let cycles = 0;

		function createCycles(PC:number) {
			let out = ast.raw(`state.PC = ${addressToHex(PC)}; state.checkCycles(${cycles});`);
			cycles = 0;
			return out;
		}
			
		for (let PC = info.min; PC <= info.max; PC += 4) {
			var di = this.decodeInstruction(PC);
			var type = di.type;
			var ins = this.generatePspInstruction(di);
			var delayedSlotInstruction: PspInstructionStm;

			// @TODO: we should check the cycles per instruction			
			cycles++;
			
			if (labels[PC]) func.add(labels[PC]);
			if (type.name == 'syscall') {
				func.add(ast.raw(`state.PC = ${PC + 4};`));
			}

			if (!type.hasDelayedBranch) {
				func.add(ins);
			} else {
				var di2 = this.decodeInstruction(PC + 4);
				var delayedSlotInstruction = this.generatePspInstruction(di2);
				let isLikely = di.type.isLikely;
				var delayedCode = ast.stm(di.type.isLikely ? ast._if(ast.branchflag(), delayedSlotInstruction) : delayedSlotInstruction);

				var targetAddress = di.targetAddress & Memory.MASK;
				var nextAddress = (PC + 8) & Memory.MASK;
				var targetAddressHex = addressToHex(targetAddress);
				var nextAddressHex = addressToHex(nextAddress);

				if (type.name == 'jal' || type.name == 'j') {
					/*
					var syscallId = this.detectSyscallCall(targetAddress);
					if (type.name == 'jal' && syscallId >= 0) {
						//var cachefuncName = `syscall_${syscallId}`;
						//args[cachefuncName] = this.instructionCache.getFunction(targetAddress);
						//func.add(ast.raw(`debugger;`));
						func.add(delayedCode);
						func.add(ast.raw(`state.RA = state.PC = ${nextAddressHex};`));
						args['syscallContext'] = this.syscallManager.context; 
						args[`syscall_${syscallId}`] = this.syscallManager.getNativeFunction(syscallId);
						func.add(ast.raw(`args.syscall_${syscallId}.call(args.syscallContext, state);`));
					} else
					*/
					{
						var cachefuncName = `cache_${addressToHex(targetAddress)}`;
						args[cachefuncName] = this.instructionCache.getFunction(targetAddress, level + 1);
						func.add(ast.raw(`state.PC = ${targetAddressHex};`));
						if (type.name == 'j') {
							func.add(delayedCode);
							if (labels[targetAddress]) {
								func.add(ast.sjump(ast.raw('true'), targetAddress));
							} else {
								func.add(ast.raw(`state.jumpCall = args.${cachefuncName};`));
								func.add(ast.raw(`return;`));
							}
						} else {
							func.add(ast.raw(`expectedRA = state.RA = ${nextAddressHex};`));
							func.add(delayedCode);
							func.add(ast.raw(`args.${cachefuncName}.execute(state);`));
							func.add(ast.raw(`
								if (state.PC != expectedRA) {
									while ((state.PC != expectedRA) && (state.jumpCall != null)) state.jumpCall.execute(state);
									state.jumpCall = null;
									return;
								}`
							));
						}
					}
				} else if (type.isJal) { // jalr, bgezal...
					var cachefuncName = `cachefunc_${addressToHex(PC)}`; args[cachefuncName] = null;
					var cacheaddrName = `cacheaddr_${addressToHex(PC)}`; args[cacheaddrName] = -1;
					func.add(ins);
					func.add(delayedCode);
					func.add(ast.raw('if (BRANCHFLAG) {'));
					func.add(ast.raw(`state.PC = BRANCHPC & ${Memory.MASK};`));
					func.add(ast.raw(`expectedRA = state.RA;`));
					func.add(ast.raw(`if (args.${cacheaddrName} != state.PC) args.${cachefuncName} = state.getFunction(args.${cacheaddrName} = state.PC);`));
					func.add(ast.raw(`args.${cachefuncName}.execute(state);`));
					func.add(ast.raw(`while ((state.PC != expectedRA) && (state.jumpCall != null)) state.jumpCall.execute(state);`));
					func.add(ast.raw(`if (state.PC != expectedRA) { state.jumpCall = null; return; }`));
					func.add(ast.raw('}'));
				} else if (type.isJumpNoLink) {
					func.add(createCycles(PC));
					//func.add(createCycles(PC));
					//func.add(ast.raw('state.jumpCall = state.getFunction(state.PC = BRANCHPC);'));
					if (type.name == 'jr') {
						func.add(delayedCode);
						
						func.add(ast.raw(`state.PC = ${CpuState.GPR_access('state', di.instruction.rs)};`));
						func.add(ast.raw('state.jumpCall = null;'));
						func.add(ast.raw('return;'));
					} else if (type.name == 'j') {
						func.add(ins);
						func.add(delayedCode);
						func.add(ast.raw('state.jumpCall = state.getFunction(state.PC = BRANCHPC);'));
						func.add(ast.raw('return;'));
					} else {
						debugger;
						throw new Error("Unexpected!");
					}
				} else { // branch
					if (type.isFixedAddressJump && labels[targetAddress]) {
						let bf:BranchFlagStm = <any>((<PspInstructionStm>ins).code);
						//console.log(ins);
						//console.log(bf.cond);
						
						if (isLikely) {
							func.add(ast.sjump(bf.cond, targetAddress, delayedSlotInstruction));
						} else {
							func.add(ins);
							func.add(delayedCode);
							func.add(ast.sjump(ast.raw('BRANCHFLAG'), targetAddress));
						}
						func.add(createCycles(nextAddress));
					} else {
						func.add(createCycles(PC));
						func.add(ins);
						func.add(delayedCode);
						func.add(ast.raw(`if (BRANCHFLAG) {`));
						func.add(ast.raw(`state.PC = ${targetAddressHex};`));
						func.add(ast.raw('state.jumpCall = state.getFunction(state.PC);'));
						func.add(ast.raw(`return;`));
						func.add(ast.raw(`}`));
					}
					//func.add(ast.raw(`} else {`));
					//func.add(ast.raw(`state.PC = ${nextAddressHex};`));
				}

				PC += 4;
			}
		}
		var code = func.toJs();
		args.code = code;
		return new FunctionCode(code, args);
	}
}

export interface CreateOptions {
	disableInsideInterrupt?: boolean;
}

export function createNativeFunction(exportId: number, firmwareVersion: number, retval: string, argTypesString: string, that: any, internalFunc: Function, options?: CreateOptions, classname?:string, name?:string) {
	options = options || {};
	//var console = logger.named('createNativeFunction');
    var code = '';
	//var code = 'debugger;';

	let V0 = CpuState.GPR_access('state', 2);
	let V1 = CpuState.GPR_access('state', 3);

	var args:string[] = [];
	var maxGprIndex = 12;
	var gprindex = 4;
	var fprindex = 0;
	//var fprindex = 2;

	function _readGpr32() {
		if (gprindex >= maxGprIndex) {
			//return ast.MemoryGetValue(Type, PspMemory, ast.GPR_u(29) + ((MaxGprIndex - Index) * 4));

			let gpr_29 = CpuState.GPR_access('state', 29);
			return `memory.lw(${gpr_29} + ` + ((maxGprIndex - gprindex++) * 4) + ')';
		} else {
			return CpuState.GPR_access('state', gprindex++);
		}
	}

	function readFpr32() { return 'state.fpr[' + (fprindex++) + ']'; }
	function readGpr32_S() { return '(' + _readGpr32() + ' | 0)'; }
	function readGpr32_U() { return '(' + _readGpr32() + ' >>> 0)'; }

	function readGpr64() {
		gprindex = MathUtils.nextAligned(gprindex, 2);
		var gprLow = readGpr32_S();
		var gprHigh = readGpr32_S();
		return `Integer64.fromBits(${gprLow}, ${gprHigh})`;
	}

	var argTypes = argTypesString.split('/').filter(item => item.length > 0);

	if (argTypes.length != internalFunc.length) throw(new Error("Function arity mismatch '" + argTypesString + "' != " + String(internalFunc)));

	argTypes.forEach(item => {
        switch (item) {
            case 'EmulatorContext': args.push('context'); break;
            case 'Thread': args.push('state.thread'); break;
            case 'CpuState': args.push('state'); break;
            case 'Memory': args.push('state.memory'); break;
			case 'string': args.push('state.memory.readStringz(' + readGpr32_S() + ')'); break;
			case 'uint': args.push(readGpr32_U() + ' >>> 0'); break;
			case 'int': args.push(readGpr32_S() + ' | 0'); break;
			case 'bool': args.push(readGpr32_S() + ' != 0'); break;
			case 'float': args.push(readFpr32()); break;
			case 'ulong': case 'long': args.push(readGpr64()); break;
			case 'void*': args.push('state.memory.getPointerStream(' + readGpr32_S() + ')'); break;
			case 'byte[]': args.push('state.memory.getPointerStream(' + readGpr32_S() + ', ' + readGpr32_S() + ')'); break;
			default:
				var matches:string[] = [];
				if (matches = item.match(/^byte\[(\d+)\]$/)) {
					args.push('state.memory.getPointerU8Array(' + readGpr32_S() + ', ' + matches[1] + ')');
				} else {
					throw ('Invalid argument "' + item + '"');
				}
        }
    });

	if (options.disableInsideInterrupt) {
		// ERROR_KERNEL_CANNOT_BE_CALLED_FROM_INTERRUPT
		code += `if (state.insideInterrupt) return 0x80020064; \n`;
	}
	
	
	code += 'var error = false;\n';
	if (DEBUG_NATIVEFUNC) {
		code += `console.info(state.thread.name, nativeFunction.name);`;
	}
	code += 'var result = internalFunc(' + args.join(', ') + ');\n';

	/*
	var debugSyscalls = false;
	//var debugSyscalls = true;

	if (debugSyscalls) {
		code += "var info = 'calling:' + state.thread.name + ':RA=' + state.RA.toString(16) + ':' + nativeFunction.name;\n";
		code += "if (DebugOnce(info, 10)) {\n";
		code += "logger.warn('#######', info, 'args=', args, 'result=', " + ((retval == 'uint') ? "sprintf('0x%08X', result) " : "result") + ");\n";
		code += "if (result instanceof PromiseFast) { result.then(function(value) { logger.warn('------> PROMISE: ',info,'args=', args, 'result-->', " + ((retval == 'uint') ? "sprintf('0x%08X', value) " : "value") + "); }); }\n";
		code += "}\n";
	}
	*/

	code += `
		if (result instanceof PromiseFast) {
			${DEBUG_NATIVEFUNC ? 'console.log("returned promise!");' : ''}
			state.thread.suspendUntilPromiseDone(result, nativeFunction);
			throwEndCycles();
			//return state.thread.suspendUntilPromiseDone(result, nativeFunction);
		}\n
	`;
	code += `
		if (result instanceof WaitingThreadInfo) {
			${DEBUG_NATIVEFUNC ? 'console.log("returned WaitingThreadInfo!");' : ''}
			if (result.promise instanceof PromiseFast) {
				state.thread.suspendUntilDone(result);
				throwEndCycles();
			} else {
				result = result.promise;
			}
		}\n
	`;

    switch (retval) {
        case 'void': break;
		case 'uint': case 'int': code += `${V0} = result | 0;\n`; break;
		case 'bool': code += `${V0} = result ? 1 : 0;\n`; break;
		case 'float': code += 'state.fpr[0] = result;\n'; break;
		case 'long':
			code += 'if (!error) {\n';
			code += 'if (!(result instanceof Integer64)) { logger.info("FUNC:", nativeFunction); throw(new Error("Invalid long result. Expecting Integer64 but found \'" + result + "\'.")); }\n';
			code += `${V0} = result.low; ${V1} = result.high;\n`;
			code += '} else {\n';
			code += `${V0} = result; ${V1} = 0;\n`;
			code += '}\n';
            break;
        default: throw ('Invalid return value "' + retval + '"');
    }

    var nativeFunction = new NativeFunction();
    nativeFunction.name = name;
    nativeFunction.nid = exportId;
    nativeFunction.firmwareVersion = firmwareVersion;
	
	if (DEBUG_FUNCGEN) {
		console.log(code);
	}

	nativeFunction.nativeCall = internalFunc.bind(that);
	nativeFunction.call = <any>new Function(
		'logger', 'internalFunc', 'nativeFunction',
		`return function(context, state) { "use strict"; /* ${addressToHex(nativeFunction.nid)} ${classname}.${name} */\n${code} };`
	)(
		logger, nativeFunction.nativeCall, nativeFunction
	);

    return nativeFunction;
}
