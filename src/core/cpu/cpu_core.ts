import "../../emu/global"

import {
    addressToHex,
    CpuBreakException, InterruptBreakException,
    logger,
    NumberDictionary, ProgramExitException,
    sprintf,
    StringDictionary,
    throwEndCycles
} from "../../global/utils";
import {BitUtils, MathFloat, MathUtils, MathVfpu} from "../../global/math";
import {compareNumbers} from "../../global/array";
import {Integer64} from "../../global/int64";
import {Memory} from "../memory";
import {ANodeStm, ANodeStmLabel, MipsAstBuilder} from "./cpu_ast";
import {Instructions} from "./cpu_instructions";
import {BranchFlagStm, InstructionAst} from "./cpu_codegen";
import {DecodedInstruction, Instruction} from "./cpu_instruction";
import {MipsDisassembler} from "./cpu_assembler";
import {AnsiEscapeCodes} from "../../util/AnsiEscapeCodes";

//const DEBUG_FUNCGEN = true;
const DEBUG_FUNCGEN = false;

const DEBUG_NATIVEFUNC = false;
//const DEBUG_NATIVEFUNC = true;

const BUILD_FUNC_ON_REFERENCED = true;
//const BUILD_FUNC_ON_REFERENCED = false;

export const enum CpuSpecialAddresses {
	EXIT_THREAD = 0x01337000,
    EXIT_INTERRUPT = 0x01337004,
}

export interface ICpuExecutable {
	execute(state: CpuState): void;
}

export interface IInstructionCache {
	getFunction(pc: number): ICpuExecutable;
}

class VfpuPrefixBase {
	enabled = false;
	constructor(private vfrc: Int32Array, private index: number) { }
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
        const c = this.calls[id];
        if (c) return c.name;
		return 'syscall_' + id;
	}
	
	getNativeFunction(id:number) {
		return this.calls[id];
	}

	call(state: CpuState, id: number) {
        const nativeFunction: NativeFunction = this.calls[id];
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

	transformValues(input: Int32Array | number[], output: any) {
		this._readInfo();
		const info = this._info;

		if (!this.enabled) {
			for (let n = 0; n < input.length; n++) output[n] = input[n];
		} else {
			for (let n = 0; n < input.length; n++) {
				//const sourceIndex = this.getSourceIndex(n);
				//const sourceAbsolute = this.getSourceAbsolute(n);
				//const sourceConstant = this.getSourceConstant(n);
				//const sourceNegate = this.getSourceNegate(n);

				const sourceIndex = (info >> (0 + n * 2)) & 3;
				const sourceAbsolute = (info >> (8 + n * 1)) & 1;
				const sourceConstant = (info >> (12 + n * 1)) & 1;
				const sourceNegate = (info >> (16 + n * 1)) & 1;

				let value: number;
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
		const info = this._info;

		if (!this.enabled) {
			for (let n = 0; n < indices.length; n++) {
				vfpr[indices[n]] = values[n];
			}
		} else {
			//debugger;
			for (let n = 0; n < indices.length; n++) {
				//const destinationSaturation = this.getDestinationSaturation(n);
				//const destinationMask = this.getDestinationMask(n);
				const destinationSaturation = (info >> (0 + n * 2)) & 3;
				const destinationMask = (info >> (8 + n * 1)) & 1;
				if (destinationMask) {
					// Masked. No write value.
				} else {
                    let value = values[n];
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

export class CpuConfig {
    public constructor(public interpreted: boolean = false) {
    //public constructor(public interpreted: boolean = true) {
    }
}

// noinspection JSUnusedGlobalSymbols
export class CpuState extends Instruction {
	static lastId:number = 0;
	id = CpuState.lastId++;

	get interpreted() { return this.config.interpreted }

    constructor(public memory: Memory, public syscallManager: SyscallManager, public config: CpuConfig) {
        super(0, 0)
		this.icache = new InstructionCache(memory, syscallManager);
		this.fcr0 = 0x00003351;
		this.fcr31 = 0x00000e00;
        this.vfpr.fill(NaN)
	}

	clone() {
        const that = new CpuState(this.memory, this.syscallManager, this.config);
        that.icache = this.icache;
		that.copyRegistersFrom(this);
		return that;
	}

	throwInterruptBreakException(): never {
	    throw new InterruptBreakException()
    }

    throwCpuBreakException(): never {
        this.thread.stop('CpuSpecialAddresses.EXIT_THREAD');
        throw new CpuBreakException()
    }

    icache: InstructionCache;

	insideInterrupt: boolean = false;
	gpr_Buffer = new ArrayBuffer(32 * 4);
	gpr_f = new Float32Array(this.gpr_Buffer);

    jumpCall: InvalidatableCpuFunction | null = null

	temp = new Array(16);

	fpr_Buffer = new ArrayBuffer(32 * 4);
	fpr = new Float32Array(this.fpr_Buffer);
	fpr_i = new Int32Array(this.fpr_Buffer);
	//fpr: Float32Array = new Float32Array(32);

	vfpr_Buffer = new ArrayBuffer(128 * 4);
	vfpr: Float32Array = new Float32Array(this.vfpr_Buffer);
	vfpr_i: Int32Array = new Int32Array(this.vfpr_Buffer);
	vfprc: Int32Array = new Int32Array([0, 0, 0, 0xFF, 0, 0, 0, 0, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000]);
	setVfrCc(index: number, value: boolean) {
		if (value) {
			this.vfprc[VFPU_CTRL.CC] |= (1 << index);
		} else {
			this.vfprc[VFPU_CTRL.CC] &= ~(1 << index);
		}
	}

	vrnds() { }
	vrndi() {
        let v = 0;
        for (let n = 0; n < 4; n++) {
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
        const vectorSize = vdRegs.length;
        this.loadVs_prefixed(vsRegs.map(reg => this.vfpr[reg]));
		this.loadVdRegs(vdRegs);

        const compare = _true ? 1 : 0;
        const cc = this.vfprc[VFPU_CTRL.CC];

        if (register < 6) {
			if (((cc >> register) & 1) == compare) {
				for (let n = 0; n < vectorSize; n++) {
					this.vector_vd[n] = this.vector_vs[n];
				}
			}
		} if (register == 6) {
			for (let n = 0; n < vectorSize; n++) {
				if (((cc >> n) & 1) == compare) {
					this.vector_vd[n] = this.vector_vs[n];
				}
			}
		} else {
		}
		this.storeVdRegsWithPrefix(vdRegs);
	}

    storeFloats(address: number, values: number[]) {
        for (let n = 0; n < values.length; n++) {
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
        const values: number[] = [];
        for (let r = 0; r < 4; r++) {
			for (let c = 0; c < 4; c++) {
				values.push(this.vfpr[r * 32 + index * 4 + c]);
			}
		}
		return values;
	}

	loadVdRegs(regs: number[]) {
		for (let n = 0; n < regs.length; n++) {
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
		for (let n = 0; n < regs.length; n++) this.vfpr[regs[n]] = this.vector_vd[n];
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

    vqmul0(s0:number, s1:number, s2:number, s3:number, t0:number, t1:number, t2:number, t3:number) { return MathVfpu.vqmul0(s0, s1, s2, s3, t0, t1, t2, t3); }
    vqmul1(s0:number, s1:number, s2:number, s3:number, t0:number, t1:number, t2:number, t3:number) { return MathVfpu.vqmul1(s0, s1, s2, s3, t0, t1, t2, t3); }
    vqmul2(s0:number, s1:number, s2:number, s3:number, t0:number, t1:number, t2:number, t3:number) { return MathVfpu.vqmul2(s0, s1, s2, s3, t0, t1, t2, t3); }
    vqmul3(s0:number, s1:number, s2:number, s3:number, t0:number, t1:number, t2:number, t3:number) { return MathVfpu.vqmul3(s0, s1, s2, s3, t0, t1, t2, t3); }
    vi2uc(x: number, y: number, z: number, w: number) { return MathVfpu.vi2uc(x, y, z, w) }
    vc2i(index: number, value: number) { return MathVfpu.vc2i(index, value) }
    vuc2i(index: number, value: number) { return MathVfpu.vuc2i(index, value) }
    vs2i(index: number, value: number) { return MathVfpu.vs2i(index, value) }
    vi2f(value: number, count: number) { return MathVfpu.vi2f(value, count) }
    vf2id(value: number, count: number) { return MathVfpu.vf2id(value, count) }
    vf2in(value: number, count: number) { return MathVfpu.vf2in(value, count) }
    vf2iu(value: number, count: number) { return MathVfpu.vf2iu(value, count) }
    vf2iz(value: number, count: number) { return MathVfpu.vf2iz(value, count) }
    vf2h() { debugger; return 0; }
    vh2f() { debugger; return 0; }

	_vt4444_step(i0: number, i1: number) {
        let o = 0;
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
        let o = 0;
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
        let o = 0;
        o |= ((i0 >> 3) & 31) << 0;
		o |= ((i0 >> 10) & 63) << 5;
		o |= ((i0 >> 19) & 31) << 11;
		o |= ((i1 >> 3) & 31) << 16;
		o |= ((i1 >> 10) & 63) << 21;
		o |= ((i1 >> 19) & 31) << 27;
		return o;
	}

	svl_q(address: number, r: number[]) {
        const k = (3 - ((address >>> 2) & 3));
        address &= ~0xF;
		for (let n = k; n < 4; n++, address += 4) this.memory.sw(address, this.vfpr_i[r[n]]);
	}

	svr_q(address: number, r: number[]) {
        const k = (4 - ((address >>> 2) & 3));
        for (let n = 0; n < k; n++, address += 4) this.memory.sw(address, this.vfpr_i[r[n]]);
	}

	lvl_q(address: number, r: number[]) {
        const k = (3 - ((address >>> 2) & 3));
        address &= ~0xF;
		for (let n = k; n < 4; n++, address += 4) this.vfpr_i[r[n]] = this.memory.lw(address);
	}

	lvr_q(address: number, r: number[]) {
        const k = (4 - ((address >>> 2) & 3));
        for (let n = 0; n < k; n++, address += 4) this.vfpr_i[r[n]] = this.memory.lw(address);
	}

	vfpuStore(indices: number[], values: number[]) { for (let n = 0; n < indices.length; n++) this.vfpr[indices[n]] = values[n]; }
	vfpuStore_i(indices: number[], values: number[]) { for (let n = 0; n < indices.length; n++) this.vfpr_i[indices[n]] = values[n]; }

	vfpuSetMatrix(m: number, values: number[]) {
		// @TODO
		this.vfpr[0] = 0;
		throw new Error("Not implemented vfpuSetMatrix!");
	}
	
    vcmp(cond: VCondition, vsValues: number[], vtValues: number[]) {
        const vectorSize = vsValues.length;
        this.loadVs_prefixed(vsValues);
        this.loadVt_prefixed(vtValues);
        const s = this.vector_vs;
        const t = this.vector_vt;

        let cc = 0;
        let or_val = 0;
        let and_val = 1;
        let affected_bits = (1 << 4) | (1 << 5);  // 4 and 5

        for (let i = 0; i < vectorSize; i++) {
            let c = false;
            switch (cond) {
                case VCondition.FL: c = false; break;
                case VCondition.EQ: c = s[i] == t[i]; break;
                case VCondition.LT: c = s[i] < t[i]; break;
                case VCondition.LE: c = s[i] <= t[i]; break;

                case VCondition.TR: c = true; break;
                case VCondition.NE: c = s[i] != t[i]; break;
                case VCondition.GE: c = s[i] >= t[i]; break;
                case VCondition.GT: c = s[i] > t[i]; break;

                //case VCondition.EZ: c = s[i] === 0.0 || s[i] === -0.0; break;
                case VCondition.EZ: c = s[i] === 0.0; break;
                case VCondition.EN: c = MathFloat.isnan(s[i]); break;
                case VCondition.EI: c = MathFloat.isinf(s[i]); break;
                case VCondition.ES: c = MathFloat.isnanorinf(s[i]); break;   // Tekken Dark Resurrection
                     
                case VCondition.NZ: c = s[i] != 0; break;
                case VCondition.NN: c = !MathFloat.isnan(s[i]); break;
                case VCondition.NI: c = !MathFloat.isinf(s[i]); break;
                case VCondition.NS: c = !(MathFloat.isnanorinf(s[i])); break;   // How about t[i] ?    
            }
            const c_i = (c ? 1 : 0);
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

    get RD(): number { return this.getGPR(this.rd) }
    set RD(value: number) { this.setGPR(this.rd, value) }
    get RS(): number { return this.getGPR(this.rs) }
    set RS(value: number) { this.setGPR(this.rs, value) }
    get RT(): number { return this.getGPR(this.rt) }
    set RT(value: number) { this.setGPR(this.rt, value) }

    get FD(): number { return this.fpr[this.fd] }
    set FD(value: number) { this.fpr[this.fd] = value }
    get FS(): number { return this.fpr[this.fs] }
    set FS(value: number) { this.fpr[this.fs] = value }
    get FT(): number { return this.fpr[this.ft] }
    set FT(value: number) { this.fpr[this.ft] = value }

    get FD_I(): number { return this.fpr_i[this.fd] }
    set FD_I(value: number) { this.fpr_i[this.fd] = value }
    get FS_I(): number { return this.fpr_i[this.fs] }
    set FS_I(value: number) { this.fpr_i[this.fs] = value }
    get FT_I(): number { return this.fpr_i[this.ft] }
    set FT_I(value: number) { this.fpr_i[this.ft] = value }

    get RS_IMM16() { return this.RS + this.imm16 }

    advance_pc(offset: number = 4) {
	    this.jump_pc(this.nPC + offset)
    }

    dump_asm(address: number, count: number) {
        const disassembler = new MipsDisassembler()
        for (let n = 0; n < count; n++) {
            console.error(disassembler.disassembleMemoryWithAddress(this.memory, address + n * 4))
        }
    }

    jump_pc(address: number) {
	    //const oldPC = this.PC
        this.PC = this.nPC
        this.nPC = address
        //if (address % 4 != 0) {
        //    try {
        //        const NLINES = 4
        //        this.dump_asm(oldPC - NLINES * 4, NLINES)
        //    } catch (e) {
        //        console.error(e)
        //    }
        //    throw new Error(sprintf(`ERROR[oldPc=0x%08X]. Jumping to invalid new address: 0x%08X`, oldPC, address))
        //}
    }

    preserveRegisters(callback: () => void) {
        const temp = this.clone()
		try {
            callback();
        } finally {
            this.copyRegistersFrom(temp);
        }
	}

	copyRegistersFrom(other: CpuState) {
        this.nPC = other.nPC;
		this.PC = other.PC;
		this.IC = other.IC;
		this.LO = other.LO;
		this.HI = other.HI;
		this.insideInterrupt = other.insideInterrupt;
		this.gpr.set(other.gpr)
        this.fpr.set(other.fpr)
        this.vfpr.set(other.vfpr)
        this.vfprc.set(other.vfprc)
		//for (let n = 0; n < 32; n++) this.setGPR(n, other.getGPR(n));
        //for (let n = 0; n < 32; n++) this.fpr[n] = other.fpr[n];
		//for (let n = 0; n < 128; n++) this.vfpr[n] = other.vfpr[n];
		//for (let n = 0; n < 8; n++) this.vfprc[n] = other.vfprc[n];
	}

	private gpr = new Int32Array(this.gpr_Buffer);

	setGPR(n: number, value: number) {
		if (n != 0) this.gpr[n] = value;
		//if (n == 31) {
        //    //this.dump_asm(this.PC - 4, 2)
		//    //console.warn(sprintf("SET RA=0x%08X", value))
        //    //if (value == 0x0FFFFFFF || value == 0) throw new Error("RA=???")
        //}
    }

	getGPR(n: number) {
		return this.gpr[n];
	}

	static GPR_access(base: string | null, n: number) {
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
            let line = addressToHex(PC);
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
        let value = 0;
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
            const equal = (fc_equal) && (s == t);
            const less = (fc_less) && (s < t);

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

	private static _mult_temp = new Int32Array(2);

	mult(rs: number, rt: number) {
		Math.imul32_64(rs, rt, CpuState._mult_temp);
		this.LO = CpuState._mult_temp[0];
		this.HI = CpuState._mult_temp[1];
	}

	madd(rs: number, rt: number) {
        const a64 = Integer64.fromInt(rs);
        const b64 = Integer64.fromInt(rt);
        const result = Integer64.fromBits(this.LO, this.HI).add(a64.multiply(b64));
        this.HI = result.high;
		this.LO = result.low;
	}

	msub(rs: number, rt: number) {
        const a64 = Integer64.fromInt(rs);
        const b64 = Integer64.fromInt(rt);
        const result = Integer64.fromBits(this.LO, this.HI).sub(a64.multiply(b64));
        this.HI = result.high;
		this.LO = result.low;
	}

	multu(rs: number, rt: number) {
        const info = Math.umul32_64(rs, rt, CpuState._mult_temp);
        this.LO = info[0];
		this.HI = info[1];
	}

	maddu(rs: number, rt: number) {
        const a64 = Integer64.fromUnsignedInt(rs);
        const b64 = Integer64.fromUnsignedInt(rt);
        const result = Integer64.fromBits(this.LO, this.HI).add(a64.multiply(b64));
        this.HI = result.high;
		this.LO = result.low;
	}

	msubu(rs: number, rt: number) {
        const a64 = Integer64.fromUnsignedInt(rs);
        const b64 = Integer64.fromUnsignedInt(rt);
        const result = Integer64.fromBits(this.LO, this.HI).sub(a64.multiply(b64));
        this.HI = result.high;
		this.LO = result.low;
	}

	getFunction(pc: number): InvalidatableCpuFunction {
		return this.icache.getFunction(pc, 0);
	}

	//executeAtPC() {
	//	this.startThreadStep();
    //    while (true) {
    //        if (this.PC == CpuSpecialAddresses.EXIT_INTERRUPT) break;
    //        this.getFunction(this.PC).execute(this);
    //    }
	//}
	//executeAtPCAsync() {
	//	this.startThreadStep();
	//	try {
	//		this.getFunction(this.PC).execute(this);
	//	} catch (e) {
	//		if (!CpuBreakException.is(e)) throw e;
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

    // https://phoenix.goucher.edu/~kelliher/f2009/cs220/mipsir.html

    // UNKNOWN
    int_unknown(name: string) {
	    this.advance_pc();
	    const message = `${AnsiEscapeCodes.RED}Unimplemented instruction '${name}'${AnsiEscapeCodes.RESET}`
        console.error(message)
        throw new ProgramExitException(message)
	}

    // CPU
    int_lui() { this.RT = this.imm16 << 16; this.advance_pc() }
    int_add() { this.RD = this.RS + this.RT; this.advance_pc() }
    int_addu() { this.RD = this.RS + this.RT; this.advance_pc() }
    int_addi() { this.RT = this.RS + this.imm16; this.advance_pc() }
    int_addiu() { this.RT = this.RS + this.imm16; this.advance_pc() }
    int_sub() { this.RD = this.RS - this.RT; this.advance_pc() }
    int_subu() { this.RD = this.RS - this.RT; this.advance_pc() }
    int_sll() { this.RD = this.RT << this.pos; this.advance_pc() }
    int_sra() { this.RD = this.RT >> this.pos; this.advance_pc() }
    int_srl() { this.RD = this.RT >>> this.pos; this.advance_pc() }
    int_rotr() { this.RD = BitUtils.rotr(this.RT, this.pos); this.advance_pc() }
    int_sllv() { this.RD = this.RT << (this.RS & 0b11111); this.advance_pc() }
    int_srav() { this.RD = this.RT >> (this.RS & 0b11111); this.advance_pc() }
    int_srlv() { this.RD = this.RT >>> (this.RS & 0b11111); this.advance_pc() }
    int_rotrv() { this.RD = BitUtils.rotr(this.RT, this.RS); this.advance_pc() }
    int_bitrev() { this.RD = BitUtils.bitrev32(this.RT); this.advance_pc() }
    int_and() { this.RD = this.RS & this.RT; this.advance_pc() }
    int_or() { this.RD = this.RS | this.RT; this.advance_pc() }
    int_xor() { this.RD = this.RS ^ this.RT; this.advance_pc()}
    int_nor() { this.RD = ~(this.RS | this.RT); this.advance_pc()}
    int_andi() { this.RT = this.RS & this.u_imm16; this.advance_pc() }
    int_ori() { this.RT = this.RS | this.u_imm16; this.advance_pc() }
    int_xori() { this.RT = this.RS ^ this.u_imm16; this.advance_pc() }
    int_mflo() { this.RD = this.LO; this.advance_pc() }
    int_mfhi() { this.RD = this.HI; this.advance_pc() }
    int_mfic() { this.RT = this.IC; this.advance_pc() }
    int_mtlo() { this.LO = this.RS; this.advance_pc() }
    int_mthi() { this.HI = this.RS; this.advance_pc() }
    int_mtic() { this.IC = this.RT; this.advance_pc() }
    int_slt() { this.RD = this.slt(this.RS, this.RT); this.advance_pc() }
    int_sltu() { this.RD = this.sltu(this.RS, this.RT); this.advance_pc() }
    int_slti() { this.RT = this.slt(this.RS, this.imm16); this.advance_pc() }
    int_sltiu() { this.RT = this.sltu(this.RS, this.imm16); this.advance_pc() }
    int_movz() { if (this.RT == 0) { this.RD = this.RS } this.advance_pc() }
    int_movn() { if (this.RT != 0) { this.RD = this.RS } this.advance_pc() }
    int_ext() { this.RT = BitUtils.extract(this.RS, this.pos, this.size_e); this.advance_pc() }
    int_ins() { this.RT = BitUtils.insert(this.RT, this.pos, this.size_i, this.RS); this.advance_pc() }
    int_clz() { this.RD = BitUtils.clz(this.RS); this.advance_pc() }
    int_clo() { this.RD = BitUtils.clo(this.RS); this.advance_pc() }
    int_seb() { this.RD = BitUtils.seb(this.RT); this.advance_pc() }
    int_seh() { this.RD = BitUtils.seh(this.RT); this.advance_pc() }
    int_wsbh() { this.RD = BitUtils.wsbh(this.RT); this.advance_pc() }
    int_wsbw() { this.RD = BitUtils.wsbw(this.RT); this.advance_pc() }
    int_min() { this.RD = this.min(this.RS, this.RT); this.advance_pc() }
    int_max() { this.RD = this.max(this.RS, this.RT); this.advance_pc() }
    int_div() { this.div(this.RS, this.RT); this.advance_pc() }
    int_divu() { this.divu(this.RS, this.RT); this.advance_pc() }
    int_mult() { this.mult(this.RS, this.RT); this.advance_pc() }
    int_multu() { this.multu(this.RS, this.RT); this.advance_pc() }
    int_madd() { this.madd(this.RS, this.RT); this.advance_pc() }
    int_maddu() { this.maddu(this.RS, this.RT); this.advance_pc() }
    int_msub() { this.msub(this.RS, this.RT); this.advance_pc() }
    int_msubu() { this.msubu(this.RS, this.RT); this.advance_pc() }
    int_cache() { this.cache(this.RS, this.RT, this.imm16); this.advance_pc() }
    int_syscall() { this.advance_pc(); this.syscall(this.vsyscall) }
    int_break() { this.advance_pc(); this.break() }
    int_dbreak() { debugger; this.advance_pc() }

    // MEMORY

    int_sb  () { this.memory.sb(this.RS_IMM16, this.RT); this.advance_pc() }
    int_sh  () { this.memory.sh(this.RS_IMM16, this.RT); this.advance_pc() }
    int_sw  () { this.memory.sw(this.RS_IMM16, this.RT); this.advance_pc() }
    int_swc1() { this.memory.sw(this.RS_IMM16, this.FT_I); this.advance_pc() }
    int_swl () { this.memory.swl(this.RS_IMM16, this.RT); this.advance_pc() }
    int_swr () { this.memory.swr(this.RS_IMM16, this.RT); this.advance_pc() }
    int_lb  () { this.RT = this.memory.lb(this.RS_IMM16); this.advance_pc() }
    int_lbu () { this.RT = this.memory.lbu(this.RS_IMM16); this.advance_pc() }
    int_lh  () { this.RT = this.memory.lh(this.RS_IMM16); this.advance_pc() }
    int_lhu () { this.RT = this.memory.lhu(this.RS_IMM16); this.advance_pc() }
    int_lw  () { this.RT = this.memory.lw(this.RS_IMM16); this.advance_pc() }
    int_lwc1() { this.FT_I = this.memory.lw(this.RS_IMM16); this.advance_pc() }
    int_lwl () { this.RT = this.memory.lwl(this.RS_IMM16, this.RT); this.advance_pc() }
    int_lwr () { this.RT = this.memory.lwr(this.RS_IMM16, this.RT); this.advance_pc() }

    // BRANCHES

    int__link() {
	    this.RA = this.nPC + 4
    }

    int__branchN(cond: boolean) {
        this.advance_pc(cond ? (this.imm16 * 4) : 4)
    }

    int__branchN_likely(cond: boolean) {
	    if (cond) {
            this.advance_pc(this.imm16 * 4)
        } else {
            this.PC = this.nPC + 4
            this.nPC = this.PC + 4
        }
    }

    int__j(link: boolean) {
        if (link) {
            this.RA = this.PC + 8
        }
        this.jump_pc(this.jump_address)
    }

    int__jr(link: boolean) {
	    const newAddress = (this.PC & 0xf0000000) | (this.RS & ~0b11)
        if (link) {
            this.RD = this.PC + 8
        }
        this.jump_pc(newAddress)
    }

    int_beq () { this.int__branchN(this.RS == this.RT) }
    int_bne () { this.int__branchN(this.RS != this.RT) }
    int_bltz() { this.int__branchN(this.RS < 0) }
    int_blez() { this.int__branchN(this.RS <= 0) }
    int_bgtz() { this.int__branchN(this.RS > 0) }
    int_bgez() { this.int__branchN(this.RS >= 0) }

    int_beql () { this.int__branchN_likely(this.RS == this.RT) }
    int_bnel () { this.int__branchN_likely(this.RS != this.RT) }
    int_bltzl() { this.int__branchN_likely(this.RS < 0) }
    int_blezl() { this.int__branchN_likely(this.RS <= 0) }
    int_bgtzl() { this.int__branchN_likely(this.RS > 0) }
    int_bgezl() { this.int__branchN_likely(this.RS >= 0) }

    int_bltzal()  { this.int__link(); this.int__branchN(this.RS < 0) }
    int_bgezal()  { this.int__link(); this.int__branchN(this.RS >= 0) }
    int_bltzall() { this.int__link(); this.int__branchN_likely(this.RS < 0) }
    int_bgezall() { this.int__link(); this.int__branchN_likely(this.RS >= 0) }

    int_bc1t() { this.int__branchN(this.fcr31_cc) }
    int_bc1f() { this.int__branchN(!this.fcr31_cc) }
    int_bc1tl() { this.int__branchN_likely(this.fcr31_cc) }
    int_bc1fl() { this.int__branchN_likely(!this.fcr31_cc) }

    int_mfc1() { this.RT = this.FS_I; this.advance_pc() }
    int_mtc1() { this.FS_I = this.RT; this.advance_pc() }
    int_cfc1() { this._cfc1_impl(this.rd, this.rt); this.advance_pc() }
    int_ctc1() { this._ctc1_impl(this.rd, this.RT); this.advance_pc() }

    int_j() { this.int__j(false) }
    int_jr() { this.int__jr(false) }
    int_jal() { this.int__j(true) }
    int_jalr() { this.int__jr(true) }

    // FPU

    "int_mov.s"() { this.FD = this.FS; this.advance_pc() }
    "int_add.s"() { this.FD = this.FS + this.FT; this.advance_pc() }
    "int_sub.s"() { this.FD = this.FS - this.FT; this.advance_pc() }
    "int_mul.s"() { this.FD = this.FS * this.FT; this.advance_pc() }
    "int_div.s"() { this.FD = this.FS / this.FT; this.advance_pc() }
    "int_abs.s"() { this.FD = Math.abs(this.FS); this.advance_pc() }
    "int_sqrt.s"() { this.FD = Math.sqrt(this.FS); this.advance_pc() }
    "int_neg.s"() { this.FD = -this.FS; this.advance_pc() }

    "int_trunc.w.s"() { this.FD_I = MathFloat.trunc(this.FS); this.advance_pc() }
    "int_round.w.s"() { this.FD_I = MathFloat.round(this.FS); this.advance_pc() }
    "int_ceil.w.s"() { this.FD_I = MathFloat.ceil(this.FS); this.advance_pc() }
    "int_floor.w.s"() { this.FD_I = MathFloat.floor(this.FS); this.advance_pc() }

    "int_cvt.s.w"() { this.FD = this.FS_I; this.advance_pc() }
    "int_cvt.w.s"() { this.FD_I = this._cvt_w_s_impl(this.FS); this.advance_pc() }

    "int_c.f.s"() { return this.int__comp(0, 0) }
    "int_c.un.s"() { return this.int__comp(1, 0) }
    "int_c.eq.s"() { return this.int__comp(2, 0) }
    "int_c.ueq.s"() { return this.int__comp(3, 0) }
    "int_c.olt.s"() { return this.int__comp(4, 0) }
    "int_c.ult.s"() { return this.int__comp(5, 0) }
    "int_c.ole.s"() { return this.int__comp(6, 0) }
    "int_c.ule.s"() { return this.int__comp(7, 0) }

    "int_c.sf.s"() { return this.int__comp(0, 1) }
    "int_c.ngle.s"() { return this.int__comp(1, 1) }
    "int_c.seq.s"() { return this.int__comp(2, 1) }
    "int_c.ngl.s"() { return this.int__comp(3, 1) }
    "int_c.lt.s"() { return this.int__comp(4, 1) }
    "int_c.nge.s"() { return this.int__comp(5, 1) }
    "int_c.le.s"() { return this.int__comp(6, 1) }
    "int_c.ngt.s"() { return this.int__comp(7, 1) }

    int__comp(fc02: number, fc3: number) {
        const fc_unordererd = ((fc02 & 1) != 0);
        const fc_equal = ((fc02 & 2) != 0);
        const fc_less = ((fc02 & 4) != 0);
        const fc_inv_qnan = (fc3 != 0); // TODO -- Only used for detecting invalid operations?

        const s = this.FS;
        const t = this.FT;

        let result = false
        if (isNaN(s) || isNaN(t)) {
            result = result || fc_unordererd
        } else {
            if (fc_equal) result = result || (s == t)
            if (fc_less) result = result || (s < t)
        }

        this.fcr31_cc = result
        this.advance_pc()
    }
}

const ast = new MipsAstBuilder();

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
	private func: CpuFunctionWithArgs | null = null;

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
	private functions: NumberDictionary<FunctionGeneratorResult | undefined> = {};
	private examinedAddress: NumberDictionary<boolean> = {};
	private createBind: IFunctionGenerator;

	constructor(public memory: Memory, public syscallManager: SyscallManager) {
		this.functionGenerator = new FunctionGenerator(memory, syscallManager, this);
		this.createBind = this.create.bind(this);
	}

	invalidateAll() {
		for (let pc in this.examinedAddress) {
			delete this.examinedAddress[pc];
		}
		for (let pc in this.cache) {
			this.cache[pc].invalidate();
			delete this.functions[pc];
		}
	}

	invalidateRange(from: number, to: number) {
		for (let pc = from; pc < to; pc += 4) {
			if (this.cache[pc]) this.cache[pc].invalidate();
			delete this.examinedAddress[pc];
			delete this.functions[pc];
		}
	}

	private create(address: number, level:number): CpuFunctionWithArgs {
		this.examinedAddress[address] = true;
		// @TODO: check if we have a function in this range already range already!
        const info = this.functionGenerator.getFunctionInfo(address, level);
        //let func = this.functions[info.min];
        let func = this.functions[info.start];
        if (func === undefined) {
			//console.log(`Creating function ${addressToHex(address)}`);
			//this.functions[info.min] = func = this.functionGenerator.getFunction(info);
			this.functions[info.start] = undefined;
			this.functions[info.start] = func = this.functionGenerator.getFunction(info, level);

			if (DEBUG_FUNCGEN) {
				console.log('****************************************');
				console.log('****************************************');
				console.log(func.info);
				console.log(func.code.code);
			}
		}
		return func!.fargs;
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
        const items: InstructionUsage[] = [];
        for (const key in this.instructionUsageCount) {
            const value = this.instructionUsageCount[key];
            items.push({ name: key, count: value });
		}
		items.sort((a, b) => compareNumbers(a.count, b.count)).reverse();
		return items;
	}

	private decodeInstruction(address: number) {
        const instruction = Instruction.fromMemoryAndPC(this.memory, address);
        const instructionType = this.getInstructionType(instruction);
        return new DecodedInstruction(instruction, instructionType);
	}

	private getInstructionType(i: Instruction) {
		return this.instructions.findByData(i.IDATA, i.PC);
	}

	private generatePspInstruction(di: DecodedInstruction): PspInstructionStm {
		return new PspInstructionStm(di, this.generateInstructionAstNode(di));
	}

	private generateInstructionAstNode(di: DecodedInstruction): ANodeStm {
        const instruction = di.instruction;
        const instructionType = di.type;
        const func: Function = (<any>this.instructionAst)[instructionType.name];
        if (func === undefined) throw (sprintf("Not implemented '%s' at 0x%08X", instructionType, di.instruction.PC));
		return func.call(this.instructionAst, instruction, di);
	}

	create(address: number, level:number): FunctionGeneratorResult {
		return this.getFunction(this.getFunctionInfo(address, level), level);
	}

	getFunction(info: FunctionInfo, level:number): FunctionGeneratorResult {
        const start = performance.now();
        const code = this.getFunctionCode(info, level);
        try {
			//const func = <ICpuFunction>(new Function('state', 'args', '"use strict";' + code.code));
            const startHex = addressToHex(info.start);
            const func: ICpuFunction = <ICpuFunction>(new Function('args', `return function func_${startHex}(state) { "use strict"; ${code.code} }`)(code.args));
            const result = new FunctionGeneratorResult(func, code, info, new CpuFunctionWithArgs(func, code.args));
            const end = performance.now();
            const elapsed = end - start;
            if (elapsed >= 20) console.warn(`generated function ${startHex} in ${end - start} ms. ${addressToHex(info.min)}-${addressToHex(info.max)} : ${addressToHex(info.start)} : instructions:${(info.max - info.start) / 4}`);
			return result;
		} catch (e) {
			console.info('code:\n', code.code);
			console.info('args:\n', code.args);
			console.error(e);
			throw (e);
		}
	}
	
	getFunctionInfo(address: number, level: number): FunctionInfo {
		if (address == CpuSpecialAddresses.EXIT_THREAD) return { start: address, min: address, max: address + 4, labels: {} };
        if (address == CpuSpecialAddresses.EXIT_INTERRUPT) return { start: address, min: address, max: address + 4, labels: {} };
		if (address == 0x00000000) throw new ProgramExitException("Trying to execute 0x00000000");

		const explored: NumberDictionary<Boolean> = {};
		const explore = [address];
		const info: FunctionInfo = { start: address, min: address, max: address, labels: {} };
		const MAX_EXPLORE = 20000;
        //const MAX_EXPLORE = 50000;
        let exploredCount = 0;

        function addToExplore(pc: number) {
			if (explored[pc]) return;
			explored[pc] = true;
			explore.push(pc);
		}

		while (explore.length > 0) {
            const PC = explore.shift()!;
            const di = this.decodeInstruction(PC);
            const type = di.type;
            info.min = Math.min(info.min, PC);
			info.max = Math.max(info.max, PC + 4); // delayed branch
			
			//printf("PC: %08X: %s", PC, di.type.name);
			if (++exploredCount >= MAX_EXPLORE) {
                let disassembler = new MipsDisassembler();
                disassembler.dump(this.memory, info.min, 4, console.error)
                console.error("...")
                disassembler.dump(this.memory, info.max - 4 * 4, 4, console.error)
                console.error(this)
			    throw new ProgramExitException(`Function too big ${exploredCount}`);
            }

            let exploreNext = true;
            const exploreTarget = type.isBranch && !type.isRegister;

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
	
	private detectSyscallCall(pc: number): number {
        const di = this.decodeInstruction(pc);
        const di2 = this.decodeInstruction(pc + 4);
        if (di.type.name == 'jr' && di2.type.name == 'syscall') {
			return di2.instruction.vsyscall;
		} else {
			return -1;
		}
	}

	getFunctionCode(info: FunctionInfo, level:number): FunctionCode {
        const args: any = {};
        if (info.start == CpuSpecialAddresses.EXIT_THREAD) return new FunctionCode("state.throwCpuBreakException();", args);
        if (info.start == CpuSpecialAddresses.EXIT_INTERRUPT) return new FunctionCode("state.throwInterruptBreakException();", args);

        const func = ast.func(
            info.start,
            ast.raw_stm('let label = 0, BRANCHPC = 0, BRANCHFLAG = false, expectedRA = 0; const memory = state.memory, gpr = state.gpr, gpr_f = state.gpr_f;'),
            ast.raw_stm('state.jumpCall = null; return;'),
            []
        );

        const labels: NumberDictionary<ANodeStmLabel> = {};
        for (let labelPC in info.labels) labels[labelPC] = ast.label(<number><any>labelPC);

		if (info.min != info.start) {
			func.add(ast.sjump(ast.raw('true'), info.start));
		}

		if ((info.max - info.min) == 4) {
            const syscallId = this.detectSyscallCall(info.min);
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
            const di = this.decodeInstruction(PC);
            const type = di.type;
            const ins = this.generatePspInstruction(di);
            let delayedSlotInstruction: PspInstructionStm;

            // @TODO: we should check the cycles per instruction
			cycles++;
			
			if (labels[PC]) func.add(labels[PC]);
			if (type.name == 'syscall') {
				func.add(ast.raw(`state.PC = ${PC + 4};`));
			}

			if (!type.hasDelayedBranch) {
				func.add(ins);
			} else {
                const di2 = this.decodeInstruction(PC + 4);
                delayedSlotInstruction = this.generatePspInstruction(di2);
                let isLikely = di.type.isLikely;
                const delayedCode = ast.stm(di.type.isLikely ? ast._if(ast.branchflag(), delayedSlotInstruction) : delayedSlotInstruction);

                const targetAddress = di.targetAddress & Memory.MASK;
                const nextAddress = (PC + 8) & Memory.MASK;
                const targetAddressHex = addressToHex(targetAddress);
                const nextAddressHex = addressToHex(nextAddress);

                if (type.name == 'jal' || type.name == 'j') {
                    const cachefuncName = `cache_${addressToHex(targetAddress)}`;
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
				} else if (type.isJal) { // jalr, bgezal...
					const cachefuncName = `cachefunc_${addressToHex(PC)}`; args[cachefuncName] = null;
                    const cacheaddrName = `cacheaddr_${addressToHex(PC)}`; args[cacheaddrName] = -1;
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
        const code = func.toJs();
        args.code = code;
		return new FunctionCode(code, args);
	}
}

export interface CreateOptions {
    originalName?: string;
	disableInsideInterrupt?: boolean;
	doNotWait?: boolean
}

export function createNativeFunction(
    exportId: number,
    firmwareVersion: number,
    retval: string,
    argTypesString: string,
    that: any,
    internalFunc: Function,
    options?: CreateOptions,
    classname?:string,
    name?:string
) {
	options = options || {};
	//const console = logger.named('createNativeFunction');
    let code = '';
    //let code = 'debugger;';

	let V0 = CpuState.GPR_access('state', 2);
	let V1 = CpuState.GPR_access('state', 3);

    const args: string[] = [];
    const maxGprIndex = 12;
    let gprindex = 4;
    let fprindex = 0;
    //let fprindex = 2;

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
        const gprLow = readGpr32_S();
        const gprHigh = readGpr32_S();
        return `Integer64.fromBits(${gprLow}, ${gprHigh})`;
	}

    const argTypes = argTypesString.split('/').filter(item => item.length > 0);

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
                let matches = item.match(/^byte\[(\d+)\]$/)
                if (matches) {
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
	
	
	code += 'let error = false;\n';
	if (DEBUG_NATIVEFUNC) {
		code += `console.info(state.thread.name, nativeFunction.name);`;
	}
	code += 'let result = internalFunc(' + args.join(', ') + ');\n';

	/*
	let debugSyscalls = false;
	//let debugSyscalls = true;

	if (debugSyscalls) {
		code += "const info = 'calling:' + state.thread.name + ':RA=' + state.RA.toString(16) + ':' + nativeFunction.name;\n";
		code += "if (DebugOnce(info, 10)) {\n";
		code += "logger.warn('#######', info, 'args=', args, 'result=', " + ((retval == 'uint') ? "sprintf('0x%08X', result) " : "result") + ");\n";
		code += "if (PromiseFast.isPromise(result)) { result.then(function(value) { logger.warn('------> PROMISE: ',info,'args=', args, 'result-->', " + ((retval == 'uint') ? "sprintf('0x%08X', value) " : "value") + "); }); }\n";
		code += "}\n";
	}
	*/

    if (!options.doNotWait) {
        //language=JavaScript
        code += `
            if (PromiseFast.isPromise(result)) {
                ${DEBUG_NATIVEFUNC ? 'console.log("returned promise!");' : ''}
                state.thread.suspendUntilPromiseDone(PromiseFast.ensure(result), nativeFunction);
                throwEndCycles();
                //return state.thread.suspendUntilPromiseDone(result, nativeFunction);
            }
            if (result instanceof WaitingThreadInfo) {
                ${DEBUG_NATIVEFUNC ? 'console.log("returned WaitingThreadInfo!");' : ''}
                if (PromiseFast.isPromise(result.promise)) {
                    state.thread.suspendUntilDone(result);
                    throwEndCycles();
                } else {
                    result = result.promise;
                }
            }
        `;
    }

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

    const nativeFunction = new NativeFunction();
    nativeFunction.name = name ?? 'unknown';
    nativeFunction.nid = exportId;
    nativeFunction.firmwareVersion = firmwareVersion;
	
	if (DEBUG_FUNCGEN) {
		console.log(code);
	}

	nativeFunction.nativeCall = internalFunc.bind(that);
	const funcName = ensureValidFunctionName(`${classname}.${name}.${addressToHex(nativeFunction.nid)}`)
	nativeFunction.call = <any>new Function(
		'logger', 'internalFunc', 'nativeFunction',
		`return function ${funcName}_wrapper(context, state) { "use strict"; /* ${addressToHex(nativeFunction.nid)} ${classname}.${name} */\n${code} };`
	)(
		logger, nativeFunction.nativeCall, nativeFunction
	);

    return nativeFunction;
}

export function ensureValidFunctionName(name: string) {
    const out = String(name).replace(/\W/g, '_')
    return out.substr(0, 1).match(/\d/) ? `_${out}` : out
}