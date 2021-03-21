import {DecodingTable, Instruction, Instructions} from "./cpu_instructions";
import {CpuState} from "./cpu_core";
import {BitUtils, MathFloat} from "../../global/math";
import {ANodeStm} from "./cpu_ast";


// https://phoenix.goucher.edu/~kelliher/f2009/cs220/mipsir.html
export class CpuInterpreter extends Instruction {
    public state: CpuState = null

    static switchFunction?: Function = null

    constructor() {
        super(0, 0)

        if (!CpuInterpreter.switchFunction) {
            const switchCode = DecodingTable.createSwitch(Instructions.instance.instructionTypeList, iname => {
                const qname = JSON.stringify(iname)
                if ((this as any)[iname]) {
                    return `cpu[${qname}]()`
                } else {
                    return `cpu.unknown(${qname})`
                }
            });

            CpuInterpreter.switchFunction = new Function('cpu', 'value', 'pc', '"use strict";' + switchCode)
        }

    }

    get RD(): number { return this.state.getGPR(this.rd) }
    set RD(value: number) { this.state.setGPR(this.rd, value) }
    get RS(): number { return this.state.getGPR(this.rs) }
    set RS(value: number) { this.state.setGPR(this.rs, value) }
    get RT(): number { return this.state.getGPR(this.rt) }
    set RT(value: number) { this.state.setGPR(this.rt, value) }

    get LO(): number { return this.state.LO }
    set LO(value: number) { this.state.LO = value }
    get HI(): number { return this.state.HI }
    set HI(value: number) { this.state.HI = value }
    get IC(): number { return this.state.IC }
    set IC(value: number) { this.state.IC = value }

    get FD(): number { return this.state.fpr[this.fd] }
    set FD(value: number) { this.state.fpr[this.fd] = value }
    get FS(): number { return this.state.fpr[this.fs] }
    set FS(value: number) { this.state.fpr[this.fs] = value }
    get FT(): number { return this.state.fpr[this.ft] }
    set FT(value: number) { this.state.fpr[this.ft] = value }

    get FD_I(): number { return this.state.fpr_i[this.fd] }
    set FD_I(value: number) { this.state.fpr_i[this.fd] = value }
    get FS_I(): number { return this.state.fpr_i[this.fs] }
    set FS_I(value: number) { this.state.fpr_i[this.fs] = value }
    get FT_I(): number { return this.state.fpr_i[this.ft] }
    set FT_I(value: number) { this.state.fpr_i[this.ft] = value }

    advance_pc(offset: number = 4) {
        this.state.PC = this.state.nPC
        this.state.nPC += offset
    }

    jump_pc(address: number) {
        this.state.PC = this.state.nPC
        this.state.nPC = address
    }

    execute(state: CpuState) {
        this.state = state
        const cPC = this.state.PC
        this.data = this.state.memory.readInt32(cPC)

        CpuInterpreter.switchFunction(this, this.data, cPC)

        if (this.state.PC == cPC) {
            throw new Error("Executing same instruction")
        }
    }

    unknown(name: string) {
        throw new Error(`Unimplemented instruction '${name}'`)
    }

    // CPU
    lui() { this.RT = this.imm16 << 16; this.advance_pc() }

    add() { this.addu() }
    addu() { this.RD = this.RS + this.RT; this.advance_pc() }
    addi() { this.addiu() }
    addiu() { this.RT = this.RS + this.imm16; this.advance_pc() }
    sub() { this.subu() }
    subu() { this.RD = this.RS - this.RT; this.advance_pc() }

    sll() { this.RD = this.RT << this.pos; this.advance_pc() }
    sra() { this.RD = this.RT >> this.pos; this.advance_pc() }
    srl() { this.RD = this.RT >>> this.pos; this.advance_pc() }
    rotr() { this.RD = BitUtils.rotr(this.RT, this.pos); this.advance_pc() }

    sllv() { this.RD = this.RT << (this.RS & 0b11111); this.advance_pc() }
    srav() { this.RD = this.RT >> (this.RS & 0b11111); this.advance_pc() }
    srlv() { this.RD = this.RT >>> (this.RS & 0b11111); this.advance_pc() }
    rotrv() { this.RD = BitUtils.rotr(this.RT, this.RS); this.advance_pc() }

    bitrev() { this.RD = BitUtils.bitrev32(this.RT); this.advance_pc() }

    and() { this.RD = this.RS & this.RT; this.advance_pc() }
    or() { this.RD = this.RS | this.RT; this.advance_pc() }
    xor() { this.RD = this.RS ^ this.RT; this.advance_pc()}
    nor() { this.RD = ~(this.RS | this.RT); this.advance_pc()}

    andi() { this.RT = this.RS & this.u_imm16; this.advance_pc() }
    ori() { this.RT = this.RS | this.u_imm16; this.advance_pc() }
    xori() { this.RT = this.RS ^ this.u_imm16; this.advance_pc() }

    mflo() { this.RD = this.LO; this.advance_pc() }
    mfhi() { this.RD = this.HI; this.advance_pc() }
    mfic() { this.RT = this.IC; this.advance_pc() }

    mtlo() { this.LO = this.RS; this.advance_pc() }
    mthi() { this.HI = this.RS; this.advance_pc() }
    mtic() { this.IC = this.RT; this.advance_pc() }

    slt() { this.RD = this.state.slt(this.RS, this.RT); this.advance_pc() }
    sltu() { this.RD = this.state.sltu(this.RS, this.RT); this.advance_pc() }
    slti() { this.RT = this.state.slt(this.RS, this.imm16); this.advance_pc() }
    sltiu() { this.RT = this.state.sltu(this.RS, this.imm16 >>> 0); this.advance_pc() }

    movz() { if (this.RT == 0) { this.RD = this.RS } this.advance_pc() }
    movn() { if (this.RT != 0) { this.RD = this.RS } this.advance_pc() }

    ext() { this.RT = BitUtils.extract(this.RS, this.pos, this.size_e); this.advance_pc() }
    ins() { this.RT = BitUtils.insert(this.RT, this.pos, this.size_i, this.RS); this.advance_pc() }

    clz() { this.RD = BitUtils.clz(this.RS); this.advance_pc() }
    clo() { this.RD = BitUtils.clo(this.RS); this.advance_pc() }
    seb() { this.RD = BitUtils.seb(this.RT); this.advance_pc() }
    seh() { this.RD = BitUtils.seh(this.RT); this.advance_pc() }

    wsbh() { this.RD = BitUtils.wsbh(this.RT); this.advance_pc() }
    wsbw() { this.RD = BitUtils.wsbw(this.RT); this.advance_pc() }

    min() { this.RD = this.state.min(this.RS, this.RT); this.advance_pc() }
    max() { this.RD = this.state.max(this.RS, this.RT); this.advance_pc() }

    div() { this.state.div(this.RS, this.RT); this.advance_pc() }
    divu() { this.state.divu(this.RS, this.RT); this.advance_pc() }

    mult() { this.state.mult(this.RS, this.RT); this.advance_pc() }
    multu() { this.state.multu(this.RS, this.RT); this.advance_pc() }
    madd() { this.state.madd(this.RS, this.RT); this.advance_pc() }
    maddu() { this.state.maddu(this.RS, this.RT); this.advance_pc() }
    msub() { this.state.msub(this.RS, this.RT); this.advance_pc() }
    msubu() { this.state.msubu(this.RS, this.RT); this.advance_pc() }

    cache() { this.state.cache(this.RS, this.RT, this.imm16); this.advance_pc() }

    syscall() { this.advance_pc(); this.state.syscall(this.vsyscall) }
    "break"() { this.advance_pc(); this.state.break() }
    dbreak() { debugger; this.advance_pc() }

    // MEMORY

    get RS_IMM16() { return this.RS + this.imm16 }

    sb  () { this.state.memory.sb(this.RS_IMM16, this.RT); this.advance_pc() }
    sh  () { this.state.memory.sh(this.RS_IMM16, this.RT); this.advance_pc() }
    sw  () { this.state.memory.sw(this.RS_IMM16, this.RT); this.advance_pc() }
    swc1() { this.state.memory.sw(this.RS_IMM16, this.FT_I); this.advance_pc() }
    swl () { this.state.memory.swl(this.RS_IMM16, this.RT); this.advance_pc() }
    swr () { this.state.memory.swr(this.RS_IMM16, this.RT); this.advance_pc() }

    lb  () { this.RT = this.state.memory.lb(this.RS_IMM16); this.advance_pc() }
    lbu () { this.RT = this.state.memory.lbu(this.RS_IMM16); this.advance_pc() }
    lh  () { this.RT = this.state.memory.lh(this.RS_IMM16); this.advance_pc() }
    lhu () { this.RT = this.state.memory.lhu(this.RS_IMM16); this.advance_pc() }
    lw  () { this.RT = this.state.memory.lw(this.RS_IMM16); this.advance_pc() }
    lwc1() { this.RT = this.state.memory.lw(this.RS_IMM16); this.advance_pc() }
    lwl () { this.RT = this.state.memory.lwl(this.RS_IMM16, this.RT); this.advance_pc() }
    lwr () { this.RT = this.state.memory.lwr(this.RS_IMM16, this.RT); this.advance_pc() }

    // BRANCHES

    _branch(likely: boolean, link: boolean, cond: boolean) {
        if (link) {
            this.state.setGPR(31, this.PC + 8)
        }
        if (cond) {
            this.advance_pc(this.imm16 * 4)
        } else {
            if (likely) {
                this.state.PC = this.state.nPC + 4
                this.state.nPC = this.state.PC + 4
            } else {
                this.advance_pc()
            }
        }
    }

    _beq (likely: boolean, link: boolean = false) { this._branch(likely, link, this.RS == this.RT); }
    _bne (likely: boolean, link: boolean = false) { this._branch(likely, link, this.RS != this.RT); }
    _bltz(likely: boolean, link: boolean = false) { this._branch(likely, link, this.RS < 0); }
    _blez(likely: boolean, link: boolean = false) { this._branch(likely, link, this.RS <= 0); }
    _bgtz(likely: boolean, link: boolean = false) { this._branch(likely, link, this.RS > 0); }
    _bgez(likely: boolean, link: boolean = false) { this._branch(likely, link, this.RS >= 0); }

    beq () { this._beq(false) }
    bne () { this._bne(false) }
    bltz() { this._bltz(false) }
    blez() { this._blez(false) }
    bgtz() { this._bgtz(false) }
    bgez() { this._bgez(false) }

    beql () { this._beq(true) }
    bnel () { this._bne(true) }
    bltzl() { this._bltz(true) }
    blezl() { this._blez(true) }
    bgtzl() { this._bgtz(true) }
    bgezl() { this._bgez(true) }

    bltzal() { this._bltz(false, true) }
    bltzall() { this._bltz(true, true) }

    bgezal() { this._bgez(false, true) }
    bgezall() { this._bgez(true, true) }

    _bc1t(likely: boolean) { this._branch(likely, false, this.state.fcr31_cc) }
    _bc1f(likely: boolean) { this._branch(likely, false, !this.state.fcr31_cc) }

    bc1t() { this._bc1t(false) }
    bc1f() { this._bc1f(false) }

    bc1tl() { this._bc1t(true) }
    bc1fl() { this._bc1f(true) }

    mfc1() { this.RT = this.FS_I; this.advance_pc() }
    mtc1() { this.FS_I = this.RT; this.advance_pc() }
    cfc1() { this.state._cfc1_impl(this.rd, this.RT); this.advance_pc() }
    ctc1() { this.state._ctc1_impl(this.rd, this.RT); this.advance_pc() }

    _j(link: boolean) {
        if (link) {
            this.state.setGPR(31, this.state.PC + 8)
        }
        this.jump_pc(this.jump_address)
    }
    _jr(link: boolean) {
        if (link) {
            this.RD = this.state.PC + 8
        }
        this.jump_pc((this.state.PC & 0xf0000000) | this.RS)
    }

    j() { this._j(false) }
    jr() { this._jr(false) }

    jal() { this._j(true) }
    jalr() { this._jr(true) }

    // FPU

    "mov.s"() { this.FD = this.FS; this.advance_pc() }
    "add.s"() { this.FD = this.FS + this.FT; this.advance_pc() }
    "sub.s"() { this.FD = this.FS - this.FT; this.advance_pc() }
    "mul.s"() { this.FD = this.FS * this.FT; this.advance_pc() }
    "div.s"() { this.FD = this.FS / this.FT; this.advance_pc() }
    "abs.s"() { this.FD = Math.abs(this.FS); this.advance_pc() }
    "sqrt.s"() { this.FD = Math.sqrt(this.FS); this.advance_pc() }
    "neg.s"() { this.FD = -this.FS; this.advance_pc() }

    "trunc.w.s"() { this.FD_I = MathFloat.trunc(this.FS); this.advance_pc() }
    "round.w.s"() { this.FD_I = MathFloat.round(this.FS); this.advance_pc() }
    "ceil.w.s"() { this.FD_I = MathFloat.ceil(this.FS); this.advance_pc() }
    "floor.w.s"() { this.FD_I = MathFloat.floor(this.FS); this.advance_pc() }

    "cvt.s.w"() { this.FD = this.FS_I; this.advance_pc() }
    "cvt.w.s"() { this.FD_I = this.state._cvt_w_s_impl(this.FS); this.advance_pc() }

    "c.f.s"() { return this._comp(0, 0); }
    "c.un.s"() { return this._comp(1, 0); }
    "c.eq.s"() { return this._comp(2, 0); }
    "c.ueq.s"() { return this._comp(3, 0); }
    "c.olt.s"() { return this._comp(4, 0); }
    "c.ult.s"() { return this._comp(5, 0); }
    "c.ole.s"() { return this._comp(6, 0); }
    "c.ule.s"() { return this._comp(7, 0); }

    "c.sf.s"() { return this._comp(0, 1); }
    "c.ngle.s"() { return this._comp(1, 1); }
    "c.seq.s"() { return this._comp(2, 1); }
    "c.ngl.s"() { return this._comp(3, 1); }
    "c.lt.s"() { return this._comp(4, 1); }
    "c.nge.s"() { return this._comp(5, 1); }
    "c.le.s"() { return this._comp(6, 1); }
    "c.ngt.s"() { return this._comp(7, 1); }

    _comp(fc02: number, fc3: number) {
        var fc_unordererd = ((fc02 & 1) != 0);
        var fc_equal = ((fc02 & 2) != 0);
        var fc_less = ((fc02 & 4) != 0);
        var fc_inv_qnan = (fc3 != 0); // TODO -- Only used for detecting invalid operations?

        var s = this.FS;
        var t = this.FT;

        let result = false
        if (isNaN(s) || isNaN(t)) {
            result ||= fc_unordererd
        } else {
            if (fc_equal) result ||= s == t
            if (fc_less) result ||= s < t
        }

        this.state.fcr31_cc = result
        this.advance_pc()
    }
}
