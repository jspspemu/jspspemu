///<reference path="../../global.d.ts" />

import _memory = require('../memory');
import _ast = require('./cpu_ast');
import _instructions = require('./cpu_instructions');
import _codegen = require('./cpu_codegen');

import Memory = _memory.Memory;

//const DEBUG_FUNCGEN = true;
const DEBUG_FUNCGEN = false;

const DEBUG_NATIVEFUNC = false;
//const DEBUG_NATIVEFUNC = true;

const BUILD_FUNC_ON_REFERENCED = true;
//const BUILD_FUNC_ON_REFERENCED = false;

export enum CpuSpecialAddresses {
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
						default: throw (new Error("Invalid operation")); break;
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

export enum VFPU_CTRL {
	SPREFIX, TPREFIX, DPREFIX, CC, INF4, RSV5, RSV6, REV,
	RCX0, RCX1, RCX2, RCX3, RCX4, RCX5, RCX6, RCX7, MAX,
}

export enum VCondition {
	FL, EQ, LT, LE, TR, NE, GE, GT,
	EZ, EN, EI, ES, NZ, NN, NI, NS
};


export class CpuState {
	static lastId:number = 0;
	id = CpuState.lastId++;
	
	constructor(public memory: Memory, public syscallManager: SyscallManager) {
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

	gpr_Buffer = new ArrayBuffer(32 * 4);
	gpr = new Int32Array(this.gpr_Buffer);
	gpr_f = new Float32Array(this.gpr_Buffer);

	jumpCall: InvalidatableCpuFunction = null

	temp = new Array(16);

	fpr_Buffer = new ArrayBuffer(32 * 4);
	fpr = new Float32Array(this.fpr_Buffer);
	fpr_i = new Int32Array(this.fpr_Buffer);
	//fpr: Float32Array = new Float32Array(32);

	vfpr_Buffer = new ArrayBuffer(128 * 4);
	vfpr: Float32Array = new Float32Array(this.vfpr_Buffer);
	vfpr_i: Float32Array = new Int32Array(this.vfpr_Buffer);
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

	storeFloats(address: number, values: number[]) {
		for (var n = 0; n < values.length; n++) {
			this.memory.writeFloat32(address + n * 4, values[n]);
		}
	}

	vfpuStore(indices: number[], values: number[]) { for (var n = 0; n < indices.length; n++) this.vfpr[indices[n]] = values[n]; }
	vfpuStore_i(indices: number[], values: number[]) { for (var n = 0; n < indices.length; n++) this.vfpr_i[indices[n]] = values[n]; }

	vfpuSetMatrix(m: number, values: number[]) {
		// @TODO
		this.vfpr[0] = 0;
		throw new Error("Not implemented vfpuSetMatrix!");
	}

	PC: number = 0;
	IC: number = 0;
	LO: number = 0;
	HI: number = 0;

	thread: any = null;

	preserveRegisters(callback: () => void) {
		var temp = new CpuState(this.memory, this.syscallManager);
		temp.copyRegistersFrom(this);
		callback();
		this.copyRegistersFrom(temp);
	}

	copyRegistersFrom(other: CpuState) {
		this.PC = other.PC;
		this.IC = other.IC;
		this.LO = other.LO;
		this.HI = other.HI;
		for (var n = 0; n < 32; n++) this.gpr[n] = other.gpr[n];
		for (var n = 0; n < 32; n++) this.fpr[n] = other.fpr[n];
		for (var n = 0; n < 128; n++) this.vfpr[n] = other.vfpr[n];
		for (var n = 0; n < 8; n++) this.vfprc[n] = other.vfprc[n];
	}

	get V0(): number { return this.gpr[2]; } set V0(value: number) { this.gpr[2] = value; }
	get V1(): number { return this.gpr[3]; } set V1(value: number) { this.gpr[3] = value; }
	get K0(): number { return this.gpr[26]; } set K0(value: number) { this.gpr[26] = value; }
	get GP(): number { return this.gpr[28]; } set GP(value: number) { this.gpr[28] = value; }
	get SP(): number { return this.gpr[29]; } set SP(value: number) { this.gpr[29] = value; }
	get FP(): number { return this.gpr[30]; } set FP(value: number) { this.gpr[30] = value; }
	get RA(): number { return this.gpr[31]; } set RA(value: number) { this.gpr[31] = value; }
	getRA(): number { return this.gpr[31]; } setRA(value: number) { this.gpr[31] = value; }

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
			case 0: this.gpr[t] = this.fcr0; break;
			case 31: this.gpr[t] = this.fcr31; break;
			default: this.gpr[t] = 0; break;
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
	syscall(id: number) { this.syscallManager.call(this, id); }

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

	executeAtPC() {
		//var expectedRA = this.RA;
		//while (this.PC != this.RA) {
		while (true) {
			this.getFunction(this.PC).execute(this);
		}
	}
	
	executeAtPCAsync() {
		try {
			this.getFunction(this.PC).execute(this);
		} catch (e) {
			if (e.message != 'CpuBreakException') throw e;
		}
	}

	break() { throw new Error('CpuBreakException'); }
}

var ast = new _ast.MipsAstBuilder();

export interface InstructionUsage {
	name: string;
	count: number;
}

class PspInstructionStm extends _ast.ANodeStm {
	public PC: number;
	constructor(private di: _instructions.DecodedInstruction, private code: _ast.ANodeStm) {
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
	private instructions: _instructions.Instructions = _instructions.Instructions.instance;
	private instructionAst = new _codegen.InstructionAst();
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
		var instruction = _instructions.Instruction.fromMemoryAndPC(this.memory, address);
		var instructionType = this.getInstructionType(instruction);
		return new _instructions.DecodedInstruction(instruction, instructionType);
	}

	private getInstructionType(i: _instructions.Instruction) {
		return this.instructions.findByData(i.data, i.PC);
	}

	private generatePspInstruction(di: _instructions.DecodedInstruction): PspInstructionStm {
		return new PspInstructionStm(di, this.generateInstructionAstNode(di));
	}

	private generateInstructionAstNode(di: _instructions.DecodedInstruction): _ast.ANodeStm {
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
			return di2.instruction.syscall;
		} else {
			return -1;
		}
	}

	getFunctionCode(info: FunctionInfo, level:number): FunctionCode {
		var args: any = {};
		if (info.start == CpuSpecialAddresses.EXIT_THREAD) return new FunctionCode("state.thread.stop('CpuSpecialAddresses.EXIT_THREAD'); throw new Error('CpuBreakException');", args);

		var func = ast.func(
			info.start,
			ast.raw_stm('var label = 0, BRANCHPC = 0, BRANCHFLAG = false, memory = state.memory, gpr = state.gpr, gpr_f = state.gpr_f;'),
			ast.raw_stm('state.jumpCall = null; return;'),
			[]
		);
		
		var labels: NumberDictionary<_ast.ANodeStmLabel> = {};
		for (let labelPC in info.labels) labels[labelPC] = ast.label(labelPC);

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

		for (let PC = info.min; PC <= info.max; PC += 4) {
			var di = this.decodeInstruction(PC);
			var type = di.type;
			var ins = this.generatePspInstruction(di);
			var delayedSlotInstruction: PspInstructionStm;
			if (labels[PC]) func.add(labels[PC]);
			if (type.name == 'syscall') {
				func.add(ast.raw(`state.PC = ${PC + 4};`));
			}

			if (!type.hasDelayedBranch) {
				func.add(ins);
			} else {
				var di2 = this.decodeInstruction(PC + 4);
				var delayedSlotInstruction = this.generatePspInstruction(di2);
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
							func.add(ast.raw(`var expectedRA = state.RA = ${nextAddressHex};`));
							func.add(delayedCode);
							func.add(ast.raw(`args.${cachefuncName}.execute(state);`));
							func.add(ast.raw(`while ((state.PC != expectedRA) && (state.jumpCall != null)) state.jumpCall.execute(state);`));
							func.add(ast.raw(`if (state.PC != expectedRA) { state.jumpCall = null; return; }`));
						}
					}
				} else if (type.isJal) {
					var cachefuncName = `cachefunc_${addressToHex(PC)}`; args[cachefuncName] = null;
					var cacheaddrName = `cacheaddr_${addressToHex(PC)}`; args[cacheaddrName] = -1;
					func.add(ins);
					func.add(delayedCode);
					func.add(ast.raw('if (BRANCHFLAG) {'));
					func.add(ast.raw(`state.PC = BRANCHPC & ${Memory.MASK};`));
					func.add(ast.raw(`var expectedRA = state.RA;`));
					func.add(ast.raw(`if (args.${cacheaddrName} != state.PC) args.${cachefuncName} = state.getFunction(args.${cacheaddrName} = state.PC);`));
					func.add(ast.raw(`args.${cachefuncName}.execute(state);`));
					func.add(ast.raw(`while ((state.PC != expectedRA) && (state.jumpCall != null)) state.jumpCall.execute(state);`));
					func.add(ast.raw(`if (state.PC != expectedRA) { state.jumpCall = null; return; }`));
					func.add(ast.raw('}'));
				} else if (type.isJumpNoLink) {
					//func.add(ast.raw('state.jumpCall = state.getFunction(state.PC = BRANCHPC);'));
					if (type.name == 'jr') {
						func.add(delayedCode);
						func.add(ast.raw(`state.PC = state.gpr[${di.instruction.rs}];`));
						func.add(ast.raw('state.jumpCall = null;'));
						func.add(ast.raw('return;'));
					} else {
						func.add(ins);
						func.add(delayedCode);
						func.add(ast.raw('state.jumpCall = state.getFunction(state.PC = BRANCHPC);'));
						func.add(ast.raw('return;'));
					}
				} else {
					func.add(ins);
					func.add(delayedCode);
					if (type.isFixedAddressJump && labels[targetAddress]) {
						func.add(ast.sjump(ast.raw('BRANCHFLAG'), targetAddress));
					} else {
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

import IndentStringGenerator = require('../../util/IndentStringGenerator');

export interface CreateOptions {
	tryCatch?: boolean;
}

export function createNativeFunction(exportId: number, firmwareVersion: number, retval: string, argTypesString: string, that: any, internalFunc: Function, options?: CreateOptions, classname?:string, name?:string) {
	//var console = logger.named('createNativeFunction');
    var code = '';
	//var code = 'debugger;';

	let V0 = `state.gpr[2]`;
	let V1 = `state.gpr[3]`;

	var args:string[] = [];
	var maxGprIndex = 12;
	var gprindex = 4;
	var fprindex = 0;
	//var fprindex = 2;

	function _readGpr32() {
		if (gprindex >= maxGprIndex) {
			//return ast.MemoryGetValue(Type, PspMemory, ast.GPR_u(29) + ((MaxGprIndex - Index) * 4));

			return 'memory.lw(state.gpr[29] + ' + ((maxGprIndex - gprindex++) * 4) + ')';
		} else {
			return 'state.gpr[' + (gprindex++) + ']';
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

	code += 'var error = false;\n';
	if (DEBUG_NATIVEFUNC) {
		code += `console.info(nativeFunction.name);`;
	}
	code += 'var result = internalFunc(' + args.join(', ') + ');\n';

	/*
	var debugSyscalls = false;
	//var debugSyscalls = true;

	if (debugSyscalls) {
		code += "var info = 'calling:' + state.thread.name + ':RA=' + state.RA.toString(16) + ':' + nativeFunction.name;\n";
		code += "if (DebugOnce(info, 10)) {\n";
		code += "logger.warn('#######', info, 'args=', args, 'result=', " + ((retval == 'uint') ? "sprintf('0x%08X', result) " : "result") + ");\n";
		code += "if (result instanceof Promise2) { result.then(function(value) { logger.warn('------> PROMISE: ',info,'args=', args, 'result-->', " + ((retval == 'uint') ? "sprintf('0x%08X', value) " : "value") + "); }); }\n";
		code += "}\n";
	}
	*/

	code += `
		if (result instanceof Promise2) {
			${DEBUG_NATIVEFUNC ? 'console.log("returned promise!");' : ''}
			state.thread.suspendUntilPromiseDone(result, nativeFunction);
			throw new Error("CpuBreakException");
			//return state.thread.suspendUntilPromiseDone(result, nativeFunction);
		}\n
	`;
	code += `
		if (result instanceof WaitingThreadInfo) {
			${DEBUG_NATIVEFUNC ? 'console.log("returned WaitingThreadInfo!");' : ''}
			if (result.promise instanceof Promise2) {
				state.thread.suspendUntilDone(result);
				throw new Error("CpuBreakException"); }
			else {
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
