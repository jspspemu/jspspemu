module core.cpu.ast {
	var ast: MipsAstBuilder;

	function assignGpr(index: number, expr: ANodeStm) { return ast.assignGpr(index, expr); }
	function assignFpr(index: number, expr: ANodeStm) { return ast.assignFpr(index, expr); }
	function assignFpr_I(index: number, expr: ANodeStm) { return ast.assignFpr_I(index, expr); }
	function assignIC(expr: ANodeStm) { return ast.assignIC(expr); }

	function fcr31_cc() { return ast.fcr31_cc(); }
	function fpr(index: number) { return ast.fpr(index); }
	function fpr_i(index: number) { return ast.fpr_i(index); }
	function gpr(index: number) { return ast.gpr(index); }
	function immBool(value: boolean) { return ast.imm32(value ? 1 : 0); }
	function imm32(value: number) { return ast.imm32(value); }
	function u_imm32(value: number) { return ast.u_imm32(value); }
	function unop(op: string, right: ANodeExpr) { return ast.unop(op, right); }
	function binop(left: ANodeExpr, op: string, right: ANodeExpr) { return ast.binop(left, op, right); }
	function binop_i(left: ANodeExpr, op: string, right: number) { return ast.binop_i(left, op, right); }
	function _if(cond: ANodeExpr, codeTrue: ANodeStm, codeFalse?: ANodeStm) { return ast._if(cond, codeTrue, codeFalse); }
	function call(name: string, exprList: ANodeExpr[]) { return ast.call(name, exprList); }
	function stm(expr: ANodeExpr) { return ast.stm(expr); }
	function stms(stms: ANodeStm[]) { return ast.stms(stms); }
	function pc() { return ast.pc(); }
	function lo() { return ast.lo(); }
	function hi() { return ast.hi(); }
	function ic() { return ast.ic(); }
	function branchflag() { return ast.branchflag(); }
	function branchpc() { return ast.branchpc(); }
	function assign(ref: ANodeExprLValue, value: ANodeExpr) { return ast.assign(ref, value); }
	function i_simm16(i: Instruction) { return imm32(i.imm16); }
	function i_uimm16(i: Instruction) { return u_imm32(i.u_imm16); }
	function rs_imm16(i: Instruction) { return binop(binop(gpr(i.rs), '+', imm32(i.imm16)), '|', imm32(0)); }
	function cast_uint(expr: ANodeExpr) { return binop(expr, '>>>', ast.imm32(0)); }

	export class InstructionAst {
		constructor() {
			ast = new MipsAstBuilder();
		}

		lui(i: Instruction) { return assignGpr(i.rt, u_imm32(i.imm16 << 16)); }

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
		sltiu(i: Instruction) { return assignGpr(i.rt, call('state.sltu', [gpr(i.rs), u_imm32(i.imm16)])); }

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
		"break"(i: Instruction) { return stm(call('state.break', [])); }
		dbreak(i: Instruction) { return ast.debugger("dbreak"); }

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
	}
}
