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
		get RA(): number { return this.gpr[31]; } set RA(value: number) { this.gpr[31] = value; }

		private callstack: number[] = [];

		callstackPush(PC: number) {
			this.callstack.push(PC);
		}

		callstackPop() {
			this.callstack.pop();
		}

		getCallstack() {
			return this.callstack.slice(0);
		}

		getPointerStream(address: number) {
			return this.memory.getPointerStream(address);
		}

		get REGS() {
			return sprintf('r1: %08X, r2: %08X, r3: %08X, r3: %08X', this.gpr[1], this.gpr[2], this.gpr[3], this.gpr[4]);
		}

		constructor(public memory: core.Memory, public syscallManager: core.ISyscallManager) {
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
				case 0: return MathFloat.rint(FS);
				case 1: return MathFloat.cast(FS);
				case 2: return MathFloat.ceil(FS);
				case 3: return MathFloat.floor(FS);
			}

			throw ("RM has an invalid value!!");
		}


		syscall(id: number) { this.syscallManager.call(this, id); }
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
		lh(address: number) { return this.memory.readInt16(address); }
		lhu(address: number) { return this.memory.readUInt16(address); }
		lw(address: number) { return this.memory.readInt32(address); }

		min(a: number, b: number) { return ((a | 0) < (b | 0)) ? a : b; }
		max(a: number, b: number) { return ((a | 0) > (b | 0)) ? a : b; }

		slt(a: number, b: number) { return ((a | 0) < (b | 0)) ? 1 : 0; }
		sltu(a: number, b: number) { return ((a >>> 0) < (b >>> 0)) ? 1 : 0; }

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

		private static SwlMask = [ 0xFFFFFF00, 0xFFFF0000, 0xFF000000, 0x00000000 ];
		private static SwlShift = [24, 16, 8, 0];

		private static SwrMask = [0x00000000, 0x000000FF, 0x0000FFFF, 0x00FFFFFF];
		private static SwrShift = [0, 8, 16, 24];

		swl(RS: number, Offset: number, RT: number) {
			var Address = (RS + Offset);
			var AddressAlign = Address & 3;
			var AddressPointer = Address & 0xFFFFFFFC;
			this.memory.writeInt32(AddressPointer, (RT >>> CpuState.SwlShift[AddressAlign]) | (this.memory.readInt32(AddressPointer) & CpuState.SwlMask[AddressAlign]));
		}

		swr(RS: number, Offset: number, RT: number) {
			var Address = (RS + Offset);
			var AddressAlign = Address & 3;
			var AddressPointer = Address & 0xFFFFFFFC;

			this.memory.writeInt32(AddressPointer, (RT << CpuState.SwrShift[AddressAlign]) | (this.memory.readInt32(AddressPointer) & CpuState.SwrMask[AddressAlign]));
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

		mult(rs: number, rt: number) {
			var a64 = Integer64.fromInt(rs);
			var b64 = Integer64.fromInt(rt);
			var result = a64.multiply(b64);
			this.HI = result.high;
			this.LO = result.low;
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
			var a64 = Integer64.fromUnsignedInt(rs);
			var b64 = Integer64.fromUnsignedInt(rt);
			var result = a64.multiply(b64);
			this.HI = result.high;
			this.LO = result.low;
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

		break() { throw (new CpuBreakException()); }
	}
}
