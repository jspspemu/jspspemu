module core.cpu {
	export class CpuState {
		gpr: Int32Array = new Int32Array(32);
		fpr: Float32Array = new Float32Array(32);
		//fpr: Float64Array = new Float64Array(32);
		BRANCHFLAG: boolean = false;
		BRANCHPC: number = 0;

		PC: number = 0;
		LO: number = 0;
		HI: number = 0;
		IC: number = 0;

		thread: any = null;

		static getGprAccessName(index: number) { return 'gpr[' + index + ']'; }
		static getFprAccessName(index: number) { return 'fpr[' + index + ']'; }

		get V0():number { return this.gpr[2]; } set V0(value: number) { this.gpr[2] = value; }
		get V1():number { return this.gpr[3]; } set V1(value: number) { this.gpr[3] = value; }
		get K0():number { return this.gpr[26]; } set K0(value: number) { this.gpr[26] = value; }
		get GP():number { return this.gpr[28]; } set GP(value: number) { this.gpr[28] = value; }
		get SP():number { return this.gpr[29]; } set SP(value: number) { this.gpr[29] = value; }
		get FP():number { return this.gpr[30]; } set FP(value: number) { this.gpr[30] = value; }
		get RA():number { return this.gpr[31]; } set RA(value: number) { this.gpr[31] = value; }

		getPointerStream(address: number) {
			return this.memory.getPointerStream(address);
		}

		get REGS() {
			return sprintf('r1: %08X, r2: %08X, r3: %08X, r3: %08X', this.gpr[1], this.gpr[2], this.gpr[3], this.gpr[4]);
		}

		constructor(public memory: core.Memory, public syscallManager: core.ISyscallManager) {
		}

		fcr31_rm: number = 0;
		fcr31_cc: boolean = false;
		fcr31_fs: boolean = false;
		fcr0_imp = 0;
		fcr0_rev = 0;

		_trace_state() {
			console.info(this);
			throw ('_trace_state');
		}

		get fcr31() {
			var value = 0;
			value = BitUtils.insert(value, 0, 2, this.fcr31_rm);
			value = BitUtils.insert(value, 23, 1, this.fcr31_cc ? 1 : 0);
			value = BitUtils.insert(value, 24, 1, this.fcr31_fs ? 1 : 0);
			return value;
		}

		set fcr31(value: number) {
			this.fcr31_rm = BitUtils.extract(value, 0, 2);
			this.fcr31_cc = (BitUtils.extract(value, 23, 1) != 0);
			this.fcr31_fs = (BitUtils.extract(value, 24, 1) != 0);
		}

		get fcr0() {
			return (this.fcr0_imp << 8) | (this.fcr0_rev);
		}

		_cfc1_impl(d: number, t: number) {
			switch (d) {
				case 0: this.gpr[t] = this.fcr0; break;
				case 31: this.gpr[t] = this.fcr31; break;
				default: throw (new Error(sprintf("Unsupported CFC1(%d)", d)));
			}
		}


		_ctc1_impl(d: number, t: number) {
			switch (d) {
				case 31: this.fcr31 = t; break;
				default: throw (new Error(sprintf("Unsupported CFC1(%d)", d)));
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
				case 0: return MathFloat.rint(FS);
				case 1: return MathFloat.cast(FS);
				case 2: return MathFloat.ceil(FS);
				case 3: return MathFloat.floor(FS);
			}

			throw ("RM has an invalid value!!");
		}


		syscall(id: number) { this.syscallManager.call(this, id); }
		dbreak() { throw (new CpuBreakException()); }
		sb(value: number, address: number) { this.memory.writeInt8(address, value); }
		sh(value: number, address: number) { this.memory.writeInt16(address, value); }
		sw(value: number, address: number) { this.memory.writeInt32(address, value); }
		swc1(value: number, address: number) { this.memory.writeFloat32(address, value); }
		lwc1(address: number) {
			var value = this.memory.readFloat32(address);
			//console.warn('lwc1: ' + value);
			return this.memory.readFloat32(address);
		}
		lb(address: number) { return this.memory.readInt8(address); }
		lbu(address: number) { return this.memory.readUInt8(address); }
		lw(address: number) { return this.memory.readInt32(address); }
		lh(address: number) { return this.memory.readInt16(address); }
		lhu(address: number) { return this.memory.readUInt16(address); }
		min(a: number, b: number) { return (a < b) ? a : b; }
		max(a: number, b: number) { return (a > b) ? a : b; }
		sltu(a: number, b: number) { return ((a >>> 0) < (b >>> 0)); }

		private static LwrMask = [ 0x00000000, 0xFF000000, 0xFFFF0000, 0xFFFFFF00 ];
		private static LwrShift = [ 0, 8, 16, 24 ];

		private static LwlMask = [ 0x00FFFFFF, 0x0000FFFF, 0x000000FF, 0x00000000 ];
		private static LwlShift = [ 24, 16, 8, 0 ];

		lwl(RS: number, Offset: number, RT: number) {
			var Address = (RS + Offset);
			var AddressAlign = Address & 3;
			var Value = this.memory.readInt32(Address & ~3);
			return ((Value << CpuState.LwlShift[AddressAlign]) | (RT & CpuState.LwlMask[AddressAlign]));
		}

		lwr(RS: number, Offset: number, RT: number) {
			var Address = (RS + Offset);
			var AddressAlign = Address & 3;
			var Value = this.memory.readInt32(Address & ~3);
			return ((Value >>> CpuState.LwrShift[AddressAlign]) | (RT & CpuState.LwrMask[AddressAlign]));
		}

		div(rs: number, rt: number) {
			this.LO = (rs / rt) | 0;
			this.HI = (rs % rt) | 0;
		}

		divu(rs: number, rt: number) {
			rs >>>= 0; // unsigned
			rt >>>= 0; // unsigned
			this.LO = (rs / rt) | 0;
			this.HI = (rs % rt) | 0;
		}

		mult(rs: number, rt: number) {
			//this.LO = (((rs >> 0) & 0xFFFF) * ((rt >> 0) & 0xFFFF)) | 0;
			//this.HI = (((rs >> 16) & 0xFFFF) * ((rt >> 16) & 0xFFFF)) | 0; // @TODO: carry!

			var result = rs * rt;
			this.LO = Math.floor(result % Math.pow(2, 32)) | 0;
			this.HI = Math.floor(result / Math.pow(2, 32)) | 0;
		}

		multu(rs: number, rt: number) {
			var result = (rs >>> 0) * (rt >>> 0);
			this.LO = Math.floor(result % Math.pow(2, 32)) | 0;
			this.HI = Math.floor(result / Math.pow(2, 32)) | 0;
		}

		madd(rs: number, rt: number) {
			var result = rs * rt;
			this.LO = (this.LO + Math.floor(result % Math.pow(2, 32))) | 0;
			this.HI = (this.HI + Math.floor(result / Math.pow(2, 32))) | 0;
		}

		maddu(rs: number, rt: number) {
			var result = rs * rt;
			this.LO = (this.LO + Math.floor(result % Math.pow(2, 32))) | 0;
			this.HI = (this.HI + Math.floor(result / Math.pow(2, 32))) | 0;
		}

		msub(rs: number, rt: number) {
			var result = rs * rt;
			this.LO = (this.LO - Math.floor(result % Math.pow(2, 32))) | 0;
			this.HI = (this.HI - Math.floor(result / Math.pow(2, 32))) | 0;
		}

		msubu(rs: number, rt: number) {
			var result = rs * rt;
			this.LO = (this.LO - Math.floor(result % Math.pow(2, 32))) | 0;
			this.HI = (this.HI - Math.floor(result / Math.pow(2, 32))) | 0;
		}

		break() {
			console.log('break!');
		}
	}
}
