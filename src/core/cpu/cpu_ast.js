var core;
(function (core) {
    (function (cpu) {
        (function (_ast) {
            var ast = new MipsAstBuilder();

            function bind_ast(func) {
                return (_.bind(func, ast));
            }

            var assignGpr = bind_ast(ast.assignGpr);
            var assignFpr = bind_ast(ast.assignFpr);
            var assignFpr_I = bind_ast(ast.assignFpr_I);
            var assignIC = bind_ast(ast.assignIC);
            var fcr31_cc = bind_ast(ast.fcr31_cc);
            var fpr = bind_ast(ast.fpr);
            var fpr_i = bind_ast(ast.fpr_i);
            var gpr = bind_ast(ast.gpr);
            var imm32 = bind_ast(ast.imm32);
            var immBool = function (value) {
                return imm32(value ? 1 : 0);
            };
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

            function i_simm16(i) {
                return imm32(i.imm16);
            }
            function i_uimm16(i) {
                return u_imm32(i.u_imm16);
            }
            function rs_imm16(i) {
                return binop(binop(gpr(i.rs), '+', imm32(i.imm16)), '|', imm32(0));
            }
            function cast_uint(expr) {
                return binop(expr, '>>>', ast.imm32(0));
            }

            var InstructionAst = (function () {
                function InstructionAst() {
                }
                InstructionAst.prototype.lui = function (i) {
                    return assignGpr(i.rt, u_imm32(i.imm16 << 16));
                };

                InstructionAst.prototype.add = function (i) {
                    return this.addu(i);
                };
                InstructionAst.prototype.addu = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rs), '+', gpr(i.rt)));
                };
                InstructionAst.prototype.addi = function (i) {
                    return this.addiu(i);
                };
                InstructionAst.prototype.addiu = function (i) {
                    return assignGpr(i.rt, binop(gpr(i.rs), '+', imm32(i.imm16)));
                };

                InstructionAst.prototype.sub = function (i) {
                    return this.subu(i);
                };
                InstructionAst.prototype.subu = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rs), '-', gpr(i.rt)));
                };

                InstructionAst.prototype.sll = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rt), '<<', imm32(i.pos)));
                };
                InstructionAst.prototype.srl = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rt), '>>>', imm32(i.pos)));
                };
                InstructionAst.prototype.rotr = function (i) {
                    return assignGpr(i.rd, call('BitUtils.rotr', [gpr(i.rt), imm32(i.pos)]));
                };
                InstructionAst.prototype.rotrv = function (i) {
                    return assignGpr(i.rd, call('BitUtils.rotr', [gpr(i.rt), imm32(i.rs)]));
                };

                InstructionAst.prototype.bitrev = function (i) {
                    return assignGpr(i.rd, call('BitUtils.bitrev32', [gpr(i.rt)]));
                };

                InstructionAst.prototype.sra = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rt), '>>', imm32(i.pos)));
                };

                InstructionAst.prototype.sllv = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rt), '<<', binop(gpr(i.rs), '&', imm32(31))));
                };
                InstructionAst.prototype.srav = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rt), '>>', binop(gpr(i.rs), '&', imm32(31))));
                };
                InstructionAst.prototype.srlv = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rt), '>>>', binop(gpr(i.rs), '&', imm32(31))));
                };

                InstructionAst.prototype.and = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rs), '&', gpr(i.rt)));
                };
                InstructionAst.prototype.or = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rs), '|', gpr(i.rt)));
                };
                InstructionAst.prototype.xor = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rs), '^', gpr(i.rt)));
                };
                InstructionAst.prototype.nor = function (i) {
                    return assignGpr(i.rd, unop('~', binop(gpr(i.rs), '|', gpr(i.rt))));
                };

                InstructionAst.prototype.andi = function (i) {
                    return assignGpr(i.rt, binop(gpr(i.rs), '&', u_imm32(i.u_imm16)));
                };
                InstructionAst.prototype.ori = function (i) {
                    return assignGpr(i.rt, binop(gpr(i.rs), '|', u_imm32(i.u_imm16)));
                };
                InstructionAst.prototype.xori = function (i) {
                    return assignGpr(i.rt, binop(gpr(i.rs), '^', u_imm32(i.u_imm16)));
                };

                InstructionAst.prototype.mflo = function (i) {
                    return assignGpr(i.rd, lo());
                };
                InstructionAst.prototype.mfhi = function (i) {
                    return assignGpr(i.rd, hi());
                };
                InstructionAst.prototype.mfic = function (i) {
                    return assignGpr(i.rt, ic());
                };

                InstructionAst.prototype.mtic = function (i) {
                    return assignIC(gpr(i.rt));
                };
                InstructionAst.prototype.mtlo = function (i) {
                    return assign(lo(), gpr(i.rs));
                };
                InstructionAst.prototype.mthi = function (i) {
                    return assign(hi(), gpr(i.rs));
                };

                InstructionAst.prototype.slt = function (i) {
                    return assignGpr(i.rd, binop(gpr(i.rs), '<', gpr(i.rt)));
                };
                InstructionAst.prototype.slti = function (i) {
                    return assignGpr(i.rt, binop(gpr(i.rs), '<', imm32(i.imm16)));
                };
                InstructionAst.prototype.sltu = function (i) {
                    return assignGpr(i.rd, call('state.sltu', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.sltiu = function (i) {
                    return assignGpr(i.rt, call('state.sltu', [gpr(i.rs), u_imm32(i.u_imm16)]));
                };

                InstructionAst.prototype.movz = function (i) {
                    return _if(binop(gpr(i.rt), '==', imm32(0)), assignGpr(i.rd, gpr(i.rs)));
                };
                InstructionAst.prototype.movn = function (i) {
                    return _if(binop(gpr(i.rt), '!=', imm32(0)), assignGpr(i.rd, gpr(i.rs)));
                };

                InstructionAst.prototype.ext = function (i) {
                    return assignGpr(i.rt, call('BitUtils.extract', [gpr(i.rs), imm32(i.pos), imm32(i.size_e)]));
                };
                InstructionAst.prototype.ins = function (i) {
                    return assignGpr(i.rt, call('BitUtils.insert', [gpr(i.rt), imm32(i.pos), imm32(i.size_i), gpr(i.rs)]));
                };

                InstructionAst.prototype.clz = function (i) {
                    return assignGpr(i.rd, call('BitUtils.clz', [gpr(i.rs)]));
                };
                InstructionAst.prototype.clo = function (i) {
                    return assignGpr(i.rd, call('BitUtils.clo', [gpr(i.rs)]));
                };
                InstructionAst.prototype.seb = function (i) {
                    return assignGpr(i.rd, call('BitUtils.seb', [gpr(i.rt)]));
                };
                InstructionAst.prototype.seh = function (i) {
                    return assignGpr(i.rd, call('BitUtils.seh', [gpr(i.rt)]));
                };

                InstructionAst.prototype.wsbh = function (i) {
                    return assignGpr(i.rd, call('BitUtils.wsbh', [gpr(i.rt)]));
                };
                InstructionAst.prototype.wsbw = function (i) {
                    return assignGpr(i.rd, call('BitUtils.wsbw', [gpr(i.rt)]));
                };

                InstructionAst.prototype._trace_state = function () {
                    return stm(ast.call('state._trace_state', []));
                };

                InstructionAst.prototype["mov.s"] = function (i) {
                    return assignFpr(i.fd, fpr(i.fs));
                };
                InstructionAst.prototype["add.s"] = function (i) {
                    return assignFpr(i.fd, binop(fpr(i.fs), '+', fpr(i.ft)));
                };
                InstructionAst.prototype["sub.s"] = function (i) {
                    return assignFpr(i.fd, binop(fpr(i.fs), '-', fpr(i.ft)));
                };
                InstructionAst.prototype["mul.s"] = function (i) {
                    return assignFpr(i.fd, binop(fpr(i.fs), '*', fpr(i.ft)));
                };
                InstructionAst.prototype["div.s"] = function (i) {
                    return assignFpr(i.fd, binop(fpr(i.fs), '/', fpr(i.ft)));
                };
                InstructionAst.prototype["abs.s"] = function (i) {
                    return assignFpr(i.fd, call('Math.abs', [fpr(i.fs)]));
                };
                InstructionAst.prototype["sqrt.s"] = function (i) {
                    return assignFpr(i.fd, call('Math.sqrt', [fpr(i.fs)]));
                };
                InstructionAst.prototype["neg.s"] = function (i) {
                    return assignFpr(i.fd, unop('-', fpr(i.fs)));
                };

                InstructionAst.prototype.min = function (i) {
                    return assignGpr(i.rd, call('state.min', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.max = function (i) {
                    return assignGpr(i.rd, call('state.max', [gpr(i.rs), gpr(i.rt)]));
                };

                InstructionAst.prototype.div = function (i) {
                    return stm(call('state.div', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.divu = function (i) {
                    return stm(call('state.divu', [gpr(i.rs), gpr(i.rt)]));
                };

                InstructionAst.prototype.mult = function (i) {
                    return stm(call('state.mult', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.multu = function (i) {
                    return stm(call('state.multu', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.madd = function (i) {
                    return stm(call('state.madd', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.maddu = function (i) {
                    return stm(call('state.maddu', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.msub = function (i) {
                    return stm(call('state.msub', [gpr(i.rs), gpr(i.rt)]));
                };
                InstructionAst.prototype.msubu = function (i) {
                    return stm(call('state.msubu', [gpr(i.rs), gpr(i.rt)]));
                };

                InstructionAst.prototype.syscall = function (i) {
                    return stm(call('state.syscall', [imm32(i.syscall)]));
                };
                InstructionAst.prototype.dbreak = function (i) {
                    return stm(call('state.dbreak', []));
                };

                InstructionAst.prototype._likely = function (isLikely, code) {
                    return isLikely ? _if(branchflag(), code) : code;
                };

                InstructionAst.prototype._postBranch = function (nextPc) {
                    return _if(branchflag(), stm(assign(pc(), branchpc())), stm(assign(pc(), u_imm32(nextPc))));
                };

                InstructionAst.prototype._storePC = function (_pc) {
                    return assign(pc(), u_imm32(_pc));
                };

                InstructionAst.prototype._branch = function (i, cond) {
                    return stms([
                        stm(assign(branchflag(), cond)),
                        stm(assign(branchpc(), u_imm32(i.PC + i.imm16 * 4 + 4)))
                    ]);
                };

                InstructionAst.prototype.beq = function (i) {
                    return this._branch(i, binop(gpr(i.rs), "==", gpr(i.rt)));
                };
                InstructionAst.prototype.bne = function (i) {
                    return this._branch(i, binop(gpr(i.rs), "!=", gpr(i.rt)));
                };
                InstructionAst.prototype.bltz = function (i) {
                    return this._branch(i, binop(gpr(i.rs), "<", imm32(0)));
                };
                InstructionAst.prototype.blez = function (i) {
                    return this._branch(i, binop(gpr(i.rs), "<=", imm32(0)));
                };
                InstructionAst.prototype.bgtz = function (i) {
                    return this._branch(i, binop(gpr(i.rs), ">", imm32(0)));
                };
                InstructionAst.prototype.bgez = function (i) {
                    return this._branch(i, binop(gpr(i.rs), ">=", imm32(0)));
                };

                InstructionAst.prototype.beql = function (i) {
                    return this.beq(i);
                };
                InstructionAst.prototype.bnel = function (i) {
                    return this.bne(i);
                };
                InstructionAst.prototype.bltzl = function (i) {
                    return this.bltz(i);
                };
                InstructionAst.prototype.blezl = function (i) {
                    return this.blez(i);
                };
                InstructionAst.prototype.bgtzl = function (i) {
                    return this.bgtz(i);
                };
                InstructionAst.prototype.bgezl = function (i) {
                    return this.bgez(i);
                };

                InstructionAst.prototype.bltzal = function (i) {
                    return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bltz(i)]);
                };
                InstructionAst.prototype.bltzall = function (i) {
                    return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bltzl(i)]);
                };

                InstructionAst.prototype.bgezal = function (i) {
                    return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bgez(i)]);
                };
                InstructionAst.prototype.bgezall = function (i) {
                    return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bgezl(i)]);
                };

                InstructionAst.prototype.bc1t = function (i) {
                    return this._branch(i, fcr31_cc());
                };
                InstructionAst.prototype.bc1f = function (i) {
                    return this._branch(i, unop("!", fcr31_cc()));
                };

                InstructionAst.prototype.bc1tl = function (i) {
                    return this.bc1t(i);
                };
                InstructionAst.prototype.bc1fl = function (i) {
                    return this.bc1f(i);
                };

                InstructionAst.prototype.sb = function (i) {
                    return stm(call('state.sb', [gpr(i.rt), rs_imm16(i)]));
                };
                InstructionAst.prototype.sh = function (i) {
                    return stm(call('state.sh', [gpr(i.rt), rs_imm16(i)]));
                };
                InstructionAst.prototype.sw = function (i) {
                    return stm(call('state.sw', [gpr(i.rt), rs_imm16(i)]));
                };

                InstructionAst.prototype.swc1 = function (i) {
                    return stm(call('state.swc1', [fpr(i.ft), rs_imm16(i)]));
                };
                InstructionAst.prototype.lwc1 = function (i) {
                    return assignFpr_I(i.ft, call('state.lw', [rs_imm16(i)]));
                };

                //public AstNodeStm mfc1() { return ast.AssignGPR(RT, ast.CallStatic((Func < float, int>) MathFloat.ReinterpretFloatAsInt, ast.FPR(FS))); }
                //public AstNodeStm mtc1() { return ast.AssignFPR_F(FS, ast.CallStatic((Func < int, float>) MathFloat.ReinterpretIntAsFloat, ast.GPR_s(RT))); }
                InstructionAst.prototype.mfc1 = function (i) {
                    return assignGpr(i.rt, ast.fpr_i(i.fs));
                };
                InstructionAst.prototype.mtc1 = function (i) {
                    return assignFpr_I(i.fs, ast.gpr(i.rt));
                };

                //mtc1(i: Instruction) { return ast.AssignFPR_F(FS, ast.CallStatic((Func < int, float>) MathFloat.ReinterpretIntAsFloat, ast.GPR_s(RT))); }
                //cfc1(i: Instruction) { }
                //public AstNodeStm cfc1() { return ast.Statement(ast.CallStatic((Action < CpuThreadState, int, int>) CpuEmitterUtils._cfc1_impl, ast.CpuThreadState, RD, RT)); }
                //public AstNodeStm ctc1() { return ast.Statement(ast.CallStatic((Action < CpuThreadState, int, int>) CpuEmitterUtils._ctc1_impl, ast.CpuThreadState, RD, RT)); }
                InstructionAst.prototype.cfc1 = function (i) {
                    return stm(call('state._cfc1_impl', [imm32(i.rd), imm32(i.rt)]));
                };
                InstructionAst.prototype.ctc1 = function (i) {
                    return stm(call('state._ctc1_impl', [imm32(i.rd), gpr(i.rt)]));
                };

                //public AstNodeStm cvt_w_s() { return ast.AssignFPR_I(FD, ast.CallStatic((Func < CpuThreadState, float, int>) CpuEmitterUtils._cvt_w_s_impl, ast.CpuThreadState, ast.FPR(FS))); }
                //public AstNodeStm cvt_s_w() { return ast.AssignFPR_F(FD, ast.Cast<float>(ast.FPR_I(FS))); }
                //public AstNodeStm trunc_w_s() { return ast.AssignFPR_I(FD, ast.CallStatic((Func < float, int>) MathFloat.Cast, ast.FPR(FS))); }
                InstructionAst.prototype["trunc.w.s"] = function (i) {
                    return assignFpr_I(i.fd, call('MathFloat.cast', [fpr(i.fs)]));
                };

                InstructionAst.prototype["cvt.s.w"] = function (i) {
                    return assignFpr(i.fd, fpr_i(i.fs));
                };
                InstructionAst.prototype["cvt.w.s"] = function (i) {
                    return assignFpr_I(i.fd, call('state._cvt_w_s_impl', [fpr(i.fs)]));
                };

                InstructionAst.prototype.lb = function (i) {
                    return assignGpr(i.rt, call('state.lb', [rs_imm16(i)]));
                };
                InstructionAst.prototype.lbu = function (i) {
                    return assignGpr(i.rt, call('state.lbu', [rs_imm16(i)]));
                };
                InstructionAst.prototype.lw = function (i) {
                    return assignGpr(i.rt, call('state.lw', [rs_imm16(i)]));
                };
                InstructionAst.prototype.lwl = function (i) {
                    return assignGpr(i.rt, call('state.lwl', [gpr(i.rs), i_simm16(i), gpr(i.rt)]));
                };
                InstructionAst.prototype.lwr = function (i) {
                    return assignGpr(i.rt, call('state.lwr', [gpr(i.rs), i_simm16(i), gpr(i.rt)]));
                };

                InstructionAst.prototype.lh = function (i) {
                    return assignGpr(i.rt, call('state.lh', [rs_imm16(i)]));
                };
                InstructionAst.prototype.lhu = function (i) {
                    return assignGpr(i.rt, call('state.lhu', [rs_imm16(i)]));
                };

                InstructionAst.prototype.j = function (i) {
                    return stms([stm(assign(branchflag(), imm32(1))), stm(assign(branchpc(), u_imm32(i.u_imm26 * 4)))]);
                };
                InstructionAst.prototype.jr = function (i) {
                    return stms([stm(assign(branchflag(), imm32(1))), stm(assign(branchpc(), gpr(i.rs)))]);
                };
                InstructionAst.prototype.jal = function (i) {
                    return stms([assignGpr(31, u_imm32(i.PC + 8)), this.j(i)]);
                };
                InstructionAst.prototype.jalr = function (i) {
                    return stms([assignGpr(31, u_imm32(i.PC + 8)), this.jr(i)]);
                };

                InstructionAst.prototype._comp = function (i, fc02, fc3) {
                    //throw("Not implemented _comp");
                    var fc_unordererd = ((fc02 & 1) != 0);
                    var fc_equal = ((fc02 & 2) != 0);
                    var fc_less = ((fc02 & 4) != 0);
                    var fc_inv_qnan = (fc3 != 0);

                    return stm(call('state._comp_impl', [fpr(i.fs), fpr(i.ft), immBool(fc_unordererd), immBool(fc_equal), immBool(fc_less), immBool(fc_inv_qnan)]));
                };

                InstructionAst.prototype["c.f.s"] = function (i) {
                    return this._comp(i, 0, 0);
                };
                InstructionAst.prototype["c.un.s"] = function (i) {
                    return this._comp(i, 1, 0);
                };
                InstructionAst.prototype["c.eq.s"] = function (i) {
                    return this._comp(i, 2, 0);
                };
                InstructionAst.prototype["c.ueq.s"] = function (i) {
                    return this._comp(i, 3, 0);
                };
                InstructionAst.prototype["c.olt.s"] = function (i) {
                    return this._comp(i, 4, 0);
                };
                InstructionAst.prototype["c.ult.s"] = function (i) {
                    return this._comp(i, 5, 0);
                };
                InstructionAst.prototype["c.ole.s"] = function (i) {
                    return this._comp(i, 6, 0);
                };
                InstructionAst.prototype["c.ule.s"] = function (i) {
                    return this._comp(i, 7, 0);
                };

                InstructionAst.prototype["c.sf.s"] = function (i) {
                    return this._comp(i, 0, 1);
                };
                InstructionAst.prototype["c.ngle.s"] = function (i) {
                    return this._comp(i, 1, 1);
                };
                InstructionAst.prototype["c.seq.s"] = function (i) {
                    return this._comp(i, 2, 1);
                };
                InstructionAst.prototype["c.ngl.s"] = function (i) {
                    return this._comp(i, 3, 1);
                };
                InstructionAst.prototype["c.lt.s"] = function (i) {
                    return this._comp(i, 4, 1);
                };
                InstructionAst.prototype["c.nge.s"] = function (i) {
                    return this._comp(i, 5, 1);
                };
                InstructionAst.prototype["c.le.s"] = function (i) {
                    return this._comp(i, 6, 1);
                };
                InstructionAst.prototype["c.ngt.s"] = function (i) {
                    return this._comp(i, 7, 1);
                };

                InstructionAst.prototype["break"] = function (i) {
                    return assignGpr(i.rt, call('state.break', []));
                };
                return InstructionAst;
            })();
            _ast.InstructionAst = InstructionAst;
        })(cpu.ast || (cpu.ast = {}));
        var ast = cpu.ast;
    })(core.cpu || (core.cpu = {}));
    var cpu = core.cpu;
})(core || (core = {}));
//# sourceMappingURL=cpu_ast.js.map
