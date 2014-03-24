module core.cpu.ast {
	var ast = new MipsAstBuilder();

	function bind_ast<T>(func: T): T { return <any>(_.bind(<any>func, ast)); }

	var assignGpr = bind_ast(ast.assignGpr);
	var assignFpr = bind_ast(ast.assignFpr);
	var assignFpr_I = bind_ast(ast.assignFpr_I);
	var assignIC = bind_ast(ast.assignIC);
	var fcr31_cc = bind_ast(ast.fcr31_cc);
	var fpr = bind_ast(ast.fpr);
	var fpr_i = bind_ast(ast.fpr_i);
	var gpr = bind_ast(ast.gpr);
	var imm32 = bind_ast(ast.imm32);
	var immBool = function (value: boolean) { return imm32(value ? 1 : 0); }
    var u_imm32 = bind_ast(ast.u_imm32);
	var unop = bind_ast(ast.unop);
	var binop = bind_ast(ast.binop);
	var binop_i = bind_ast(ast.binop_i);
	var _if = bind_ast(ast._if);
	var call = bind_ast(ast.call);
	var lo = bind_ast(ast.lo);
	var hi = bind_ast(ast.hi);
	var ic = bind_ast(ast.ic);
	var stm = bind_ast(ast.stm);
	var stms = bind_ast(ast.stms);
	var branchflag = bind_ast(ast.branchflag);
	var branchpc = bind_ast(ast.branchpc);
	var assign = bind_ast(ast.assign);
	var pc = bind_ast(ast.pc);

	function i_simm16(i: Instruction) { return imm32(i.imm16); }
	function i_uimm16(i: Instruction) { return u_imm32(i.u_imm16); }
	function rs_imm16(i: Instruction) { return binop(binop(gpr(i.rs), '+', imm32(i.imm16)), '|', imm32(0)); }
	function cast_uint(expr: ANodeExpr) { return binop(expr, '>>>', ast.imm32(0)); }

	export class InstructionAst {
		lui(i: Instruction) { return assignGpr(i.rt, u_imm32(i.imm16 << 16)); }

		add(i: Instruction) { return this.addu(i); }
		addu(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rs), '+', gpr(i.rt))); }
		addi(i: Instruction) { return this.addiu(i); }
		addiu(i: Instruction) { return assignGpr(i.rt, binop(gpr(i.rs), '+', imm32(i.imm16))); }

		sub(i: Instruction) { return this.subu(i); }
		subu(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rs), '-', gpr(i.rt))); }

		sll(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rt), '<<', imm32(i.pos))); }
		srl(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rt), '>>>', imm32(i.pos))); }
		rotr(i: Instruction) { return assignGpr(i.rd, call('BitUtils.rotr', [gpr(i.rt), imm32(i.pos)])); }
		rotrv(i: Instruction) { return assignGpr(i.rd, call('BitUtils.rotr', [gpr(i.rt), imm32(i.rs)])); }

		bitrev(i: Instruction) { return assignGpr(i.rd, call('BitUtils.bitrev32', [gpr(i.rt)])); }

		sra(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rt), '>>', imm32(i.pos))); }

		sllv(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rt), '<<', binop(gpr(i.rs), '&', imm32(31)))); }
		srav(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rt), '>>', binop(gpr(i.rs), '&', imm32(31)))); }
		srlv(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rt), '>>>', binop(gpr(i.rs), '&', imm32(31)))); }

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

		mtic(i: Instruction) { return assignIC(gpr(i.rt)); }
		mtlo(i: Instruction) { return assign(lo(), gpr(i.rs)); }
		mthi(i: Instruction) { return assign(hi(), gpr(i.rs)); }

		slt(i: Instruction) { return assignGpr(i.rd, binop(gpr(i.rs), '<', gpr(i.rt))); }
		slti(i: Instruction) { return assignGpr(i.rt, binop(gpr(i.rs), '<', imm32(i.imm16))); }
		sltu(i: Instruction) { return assignGpr(i.rd, call('state.sltu', [gpr(i.rs), gpr(i.rt)])); }
		sltiu(i: Instruction) { return assignGpr(i.rt, call('state.sltu', [gpr(i.rs), u_imm32(i.u_imm16)])); }

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

		syscall(i: Instruction) { return stm(call('state.syscall', [imm32(i.syscall)])); }
		dbreak(i: Instruction) { return stm(call('state.dbreak', [])); }

		_likely(isLikely: boolean, code: ANodeStm) {
			return isLikely ? _if(branchflag(), code) : code;
		}

		_postBranch(nextPc: number) {
			return _if(
				branchflag(),
				stm(assign(pc(), branchpc())),
				stm(assign(pc(), u_imm32(nextPc)))
				);
		}

		_storePC(_pc: number) {
			return assign(pc(), u_imm32(_pc));
		}

		private _branch(i: Instruction, cond: ANodeExpr) {
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

		//public AstNodeStm mfc1() { return ast.AssignGPR(RT, ast.CallStatic((Func < float, int>) MathFloat.ReinterpretFloatAsInt, ast.FPR(FS))); }
		//public AstNodeStm mtc1() { return ast.AssignFPR_F(FS, ast.CallStatic((Func < int, float>) MathFloat.ReinterpretIntAsFloat, ast.GPR_s(RT))); }

		mfc1(i: Instruction) { return assignGpr(i.rt, ast.fpr_i(i.fs)); }
		mtc1(i: Instruction) { return assignFpr_I(i.fs, ast.gpr(i.rt)); }
		//mtc1(i: Instruction) { return ast.AssignFPR_F(FS, ast.CallStatic((Func < int, float>) MathFloat.ReinterpretIntAsFloat, ast.GPR_s(RT))); }

		//cfc1(i: Instruction) { }
		//public AstNodeStm cfc1() { return ast.Statement(ast.CallStatic((Action < CpuThreadState, int, int>) CpuEmitterUtils._cfc1_impl, ast.CpuThreadState, RD, RT)); }
		//public AstNodeStm ctc1() { return ast.Statement(ast.CallStatic((Action < CpuThreadState, int, int>) CpuEmitterUtils._ctc1_impl, ast.CpuThreadState, RD, RT)); }

		cfc1(i: Instruction) { return stm(call('state._cfc1_impl', [imm32(i.rd), imm32(i.rt)])); }
		ctc1(i: Instruction) { return stm(call('state._ctc1_impl', [imm32(i.rd), gpr(i.rt)])); }

		//public AstNodeStm cvt_w_s() { return ast.AssignFPR_I(FD, ast.CallStatic((Func < CpuThreadState, float, int>) CpuEmitterUtils._cvt_w_s_impl, ast.CpuThreadState, ast.FPR(FS))); }

		//public AstNodeStm cvt_s_w() { return ast.AssignFPR_F(FD, ast.Cast<float>(ast.FPR_I(FS))); }

		//public AstNodeStm trunc_w_s() { return ast.AssignFPR_I(FD, ast.CallStatic((Func < float, int>) MathFloat.Cast, ast.FPR(FS))); }

		"trunc.w.s"(i: Instruction) { return assignFpr_I(i.fd, call('MathFloat.cast', [fpr(i.fs)])); }

		"cvt.s.w"(i: Instruction) { return assignFpr(i.fd, fpr_i(i.fs)); }
		"cvt.w.s"(i: Instruction) { return assignFpr_I(i.fd, call('state._cvt_w_s_impl', [fpr(i.fs)])); }

		lb(i: Instruction) { return assignGpr(i.rt, call('state.lb', [rs_imm16(i)])); }
		lbu(i: Instruction) { return assignGpr(i.rt, call('state.lbu', [rs_imm16(i)])); }
		lw(i: Instruction) { return assignGpr(i.rt, call('state.lw', [rs_imm16(i)])); }
		lwl(i: Instruction) { return assignGpr(i.rt, call('state.lwl', [gpr(i.rs), i_simm16(i), gpr(i.rt)])); }
		lwr(i: Instruction) { return assignGpr(i.rt, call('state.lwr', [gpr(i.rs), i_simm16(i), gpr(i.rt)])); }
		
		lh(i: Instruction) { return assignGpr(i.rt, call('state.lh', [rs_imm16(i)])); }
		lhu(i: Instruction) { return assignGpr(i.rt, call('state.lhu', [rs_imm16(i)])); }

		j(i: Instruction) { return stms([stm(assign(branchflag(), imm32(1))), stm(assign(branchpc(), u_imm32(i.u_imm26 * 4)))]); }
		jr(i: Instruction) { return stms([stm(assign(branchflag(), imm32(1))), stm(assign(branchpc(), gpr(i.rs)))]); }
		jal(i: Instruction) { return stms([assignGpr(31, u_imm32(i.PC + 8)), this.j(i)]); }
		jalr(i: Instruction) { return stms([assignGpr(31, u_imm32(i.PC + 8)), this.jr(i)]); }

		_comp(i: Instruction, fc02: number, fc3: number) {
			//throw("Not implemented _comp");
			var fc_unordererd = ((fc02 & 1) != 0);
			var fc_equal = ((fc02 & 2) != 0);
			var fc_less = ((fc02 & 4) != 0);
			var fc_inv_qnan = (fc3 != 0); // TODO -- Only used for detecting invalid operations?

            return stm(call('state._comp_impl', [fpr(i.fs), fpr(i.ft), immBool(fc_unordererd), immBool(fc_equal), immBool(fc_less), immBool(fc_inv_qnan)]))
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

		"break"(i: Instruction) { return assignGpr(i.rt, call('state.break', [])); }
	}
}
