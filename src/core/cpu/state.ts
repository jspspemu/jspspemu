///<reference path="../../typings.d.ts" />

import memory = require('../memory');
import syscall = require('./syscall');

import Memory = memory.Memory;
import ISyscallManager = syscall.ISyscallManager;

export enum CpuSpecialAddresses {
	EXIT_THREAD = 0x0FFFFFFF,
}

export interface IExecutor {
	execute(maxIterations: number): void;
	executeWithoutCatch(maxIterations: number): void;
	executeUntilPCReachesWithoutCall(pc: number): void;
}

class VfpuPrefixBase {
	enabled = false;

	constructor(private vfrc: number[], private index: number) {
	}

	_info: number;
	_readInfo() {
		this._info = this.getInfo();
	}

	eat() {
		this.enabled = false;
	}

	getInfo() {
		return this.vfrc[this.index];
	}

	setInfo(info: number) {
		this.vfrc[this.index] = info;
		this.enabled = true;
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

				var value;
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
	gpr_Buffer = new ArrayBuffer(32 * 4);
	gpr = new Int32Array(this.gpr_Buffer);
	gpr_f = new Float32Array(this.gpr_Buffer);

	executor: IExecutor;

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
		var values = [];
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
		for (var n = k; n < 4; n++, address += 4) this.memory.writeInt32(address, this.vfpr_i[r[n]]);
	}

	svr_q(address: number, r: number[]) {
		var k = (4 - ((address >>> 2) & 3));
		for (var n = 0; n < k; n++, address += 4) this.memory.writeInt32(address, this.vfpr_i[r[n]]);
	}

	lvl_q(address: number, r: number[]) {
		var k = (3 - ((address >>> 2) & 3));
		address &= ~0xF;
		for (var n = k; n < 4; n++, address += 4) this.vfpr_i[r[n]] = this.memory.readInt32(address);
	}

	lvr_q(address: number, r: number[]) {
		var k = (4 - ((address >>> 2) & 3));
		for (var n = 0; n < k; n++, address += 4) this.vfpr_i[r[n]] = this.memory.readInt32(address);
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
	}

	BRANCHFLAG: boolean = false;
	BRANCHPC: number = 0;

	PC: number = 0;
	IC: number = 0;
	LO: number = 0;
	_HI: number = 0;
	_HI_op: number = 0;
	_HI_op1: number = 0;
	_HI_op2: number = 0;

	set HI(value:number) {
		this._HI = value;
		this._HI_op = 0;
	}

	setHIOp(op: number, op1: number, op2: number) {
		this._HI_op = op;
		this._HI_op1 = op1;
		this._HI_op2 = op2;
	}
	
	get HI() {
		switch (this._HI_op) {
			case 0: return this._HI;
			case 1:
				var result = Math.imul32_64(this._HI_op1, this._HI_op2, CpuState._mult_temp);
				this._HI_op = 0;
				return this._HI = result[1];
		}
		throw (new Error("Can't generate HI"));
	}

	thread: any = null;

	preserveRegisters(callback: () => void) {
		var temp = new CpuState(this.memory, this.syscallManager);
		temp.copyRegistersFrom(this);
		try {
			callback();
		} finally {
			this.copyRegistersFrom(temp);
		}
	}

	copyRegistersFrom(other: CpuState) {
		['PC', 'IC', 'LO', 'HI'].forEach((item) => { this[item] = other[item]; });
		for (var n = 0; n < 32; n++) this.gpr[n] = other.gpr[n];
		for (var n = 0; n < 32; n++) this.fpr[n] = other.fpr[n];
		for (var n = 0; n < 128; n++) this.vfpr[n] = other.vfpr[n];
		for (var n = 0; n < 8; n++) this.vfprc[n] = other.vfprc[n];
	}

	get V0():number { return this.gpr[2]; } set V0(value: number) { this.gpr[2] = value; }
	get V1():number { return this.gpr[3]; } set V1(value: number) { this.gpr[3] = value; }
	get K0():number { return this.gpr[26]; } set K0(value: number) { this.gpr[26] = value; }
	get GP():number { return this.gpr[28]; } set GP(value: number) { this.gpr[28] = value; }
	get SP():number { return this.gpr[29]; } set SP(value: number) { this.gpr[29] = value; }
	get FP():number { return this.gpr[30]; } set FP(value: number) { this.gpr[30] = value; }
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
			var line = sprintf("%08X", PC);
			if (symbolLookup) {
				line += sprintf(' : %s', symbolLookup.getSymbolAt(PC));
			}
			console.log(line);
		});
	}

	getCallstack() {
		return this.callstack.slice(0);
	}

	getPointerStream(address: number, size?: number) {
		return this.memory.getPointerStream(address, size);
	}

	get REGS() {
		return sprintf('r1: %08X, r2: %08X, r3: %08X, r3: %08X', this.gpr[1], this.gpr[2], this.gpr[3], this.gpr[4]);
	}

	constructor(public memory: Memory, public syscallManager: ISyscallManager) {
		this.fcr0 = 0x00003351;
		this.fcr31 = 0x00000e00;
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
			default:  this.gpr[t] = 0; break;
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
	sb(value: number, address: number) { this.memory.writeInt8(address, value); }
	sh(value: number, address: number) { this.memory.writeInt16(address, value); }
	sw(value: number, address: number) { this.memory.writeInt32(address, value); }
	swc1(value: number, address: number) { this.memory.writeFloat32(address, value); }
	lb(address: number) { return this.memory.readInt8(address); }
	lbu(address: number) { return this.memory.readUInt8(address); }
	lh(address: number) { return this.memory.readInt16(address); }
	lhu(address: number) { return this.memory.readUInt16(address); }
	lw(address: number) { return this.memory.readInt32(address); }
	lwc1(address: number) { return this.memory.readFloat32(address); }

	min(a: number, b: number) { return ((a | 0) < (b | 0)) ? a : b; }
	max(a: number, b: number) { return ((a | 0) > (b | 0)) ? a : b; }

	slt(a: number, b: number) { return ((a | 0) < (b | 0)) ? 1 : 0; }
	sltu(a: number, b: number) { return ((a >>> 0) < (b >>> 0)) ? 1 : 0; }

	private static LwrMask = [ 0x00000000, 0xFF000000, 0xFFFF0000, 0xFFFFFF00 ];
	private static LwrShift = [ 0, 8, 16, 24 ];

	private static LwlMask = [ 0x00FFFFFF, 0x0000FFFF, 0x000000FF, 0x00000000 ];
	private static LwlShift = [ 24, 16, 8, 0 ];

	lwl(RS: number, Offset: number, ValueToWrite: number) {
		var Address = (RS + Offset);
		var AddressAlign = Address & 3;
		var Value = this.memory.readInt32(Address & ~3);
		return ((Value << CpuState.LwlShift[AddressAlign]) | (ValueToWrite & CpuState.LwlMask[AddressAlign]));
	}

	lwr(RS: number, Offset: number, ValueToWrite: number) {
		var Address = (RS + Offset);
		var AddressAlign = Address & 3;
		var Value = this.memory.readInt32(Address & ~3);
		return ((Value >>> CpuState.LwrShift[AddressAlign]) | (ValueToWrite & CpuState.LwrMask[AddressAlign]));
	}

	private static SwlMask = [ 0xFFFFFF00, 0xFFFF0000, 0xFF000000, 0x00000000 ];
	private static SwlShift = [24, 16, 8, 0];

	private static SwrMask = [0x00000000, 0x000000FF, 0x0000FFFF, 0x00FFFFFF];
	private static SwrShift = [0, 8, 16, 24];

	swl(RS: number, Offset: number, ValueToWrite: number) {
		var Address = (RS + Offset);
		var AddressAlign = Address & 3;
		var AddressPointer = Address & ~3;
		var WordToWrite = (ValueToWrite >>> CpuState.SwlShift[AddressAlign]) | (this.memory.readInt32(AddressPointer) & CpuState.SwlMask[AddressAlign]);
		this.memory.writeInt32(AddressPointer, WordToWrite);
	}

	swr(RS: number, Offset: number, ValueToWrite: number) {
		var Address = (RS + Offset);
		var AddressAlign = Address & 3;
		var AddressPointer = Address & ~3;
		var WordToWrite = (ValueToWrite << CpuState.SwrShift[AddressAlign]) | (this.memory.readInt32(AddressPointer) & CpuState.SwrMask[AddressAlign]);
		this.memory.writeInt32(AddressPointer, WordToWrite);
	}

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
		this.LO = Math.imul(rs, rt);
		this.setHIOp(1, rs, rt);
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

	callPC(pc: number) {
		this.PC = pc;
		var ra = this.getRA();
		this.executor.executeUntilPCReachesWithoutCall(ra);
	}

	callPCSafe(pc: number) {
		this.PC = pc;
		var ra = this.getRA();
		while (this.PC != ra) {
			/*
			if (DebugOnce('test', 10)) {
				console.log(this.PC, this.RA, ra);
			} else {
				throw(new Error("TOO BAD!"));
			}
			*/
			try {
				this.executor.executeUntilPCReachesWithoutCall(ra);
			} catch (e) {
				if (!(e instanceof CpuBreakException)) {
					console.error(e);
					console.error(e['stack']);
					throw (e);
				}
			}
		}
	}

	break() { throw (new CpuBreakException()); }
}
