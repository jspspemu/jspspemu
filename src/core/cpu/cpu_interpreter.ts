import {DecodingTable, Instruction, Instructions} from "./cpu_instructions";
import {CpuState} from "./cpu_core";
import {BitUtils} from "../../global/math";

const switchCode = DecodingTable.createSwitch(Instructions.instance.instructionTypeList, iname =>
    `cpu[${JSON.stringify(iname)}]()`
);
//this.decoder = <any>(new Function('instructionsByName', 'value', 'pc', '"use strict";' + switchCode));
//console.log(switchCode)

const switchFunction = new Function('cpu', 'value', 'pc', '"use strict";' + switchCode)

export class CpuInterpreter extends Instruction {
    constructor(public state: CpuState) {
        super(0, 0)
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

    movePC(count: number = 4) {
        this.state.PC += count
    }

    execute() {
        const cPC = this.state.PC
        this.data = this.state.memory.readInt32(cPC)

        switchFunction(this, this.data, cPC)

        if (this.state.PC == cPC) {
            throw new Error("Executing same instruction")
        }
    }

    // CPU
    add() { this.addu() }
    addu() { this.RD = this.RS + this.RT; this.movePC() }
    addi() { this.addiu() }
    addiu() { this.RT = this.RS + this.imm16; this.movePC() }
    sub() { this.subu() }
    subu() { this.RD = this.RS - this.RT; this.movePC() }

    sll() { this.RD = this.RT << this.pos; this.movePC() }
    sra() { this.RD = this.RT >> this.pos; this.movePC() }
    srl() { this.RD = this.RT >>> this.pos; this.movePC() }
    rotr() { this.RD = BitUtils.rotr(this.RT, this.pos); this.movePC() }

    sllv() { this.RD = this.RT << (this.RS & 0b11111); this.movePC() }
    srav() { this.RD = this.RT >> (this.RS & 0b11111); this.movePC() }
    srlv() { this.RD = this.RT >>> (this.RS & 0b11111); this.movePC() }
    rotrv() { this.RD = BitUtils.rotr(this.RT, this.RS); this.movePC() }

    bitrev() { this.RD = BitUtils.bitrev32(this.RT); this.movePC() }

    and() { this.RD = this.RS & this.RT; this.movePC() }
    or() { this.RD = this.RS | this.RT; this.movePC() }
    xor() { this.RD = this.RS ^ this.RT; this.movePC()}
    nor() { this.RD = ~(this.RS | this.RT); this.movePC()}

    andi() { this.RT = this.RS & this.u_imm16; this.movePC() }
    ori() { this.RT = this.RS | this.u_imm16; this.movePC() }
    xori() { this.RT = this.RS ^ this.u_imm16; this.movePC() }

    mflo() { this.RD = this.LO; this.movePC() }
    mfhi() { this.RD = this.HI; this.movePC() }
    mfic() { this.RT = this.IC; this.movePC() }

    mtlo() { this.LO = this.RS; this.movePC() }
    mthi() { this.HI = this.RS; this.movePC() }
    mtic() { this.IC = this.RT; this.movePC() }

}

