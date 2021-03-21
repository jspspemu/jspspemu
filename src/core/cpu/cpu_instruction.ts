import {Memory} from "../memory";
import {BitUtils} from "../../global/math";
import {HalfFloat} from "../../global/utils";
import {InstructionType} from "./cpu_instructions";

export class Instruction {
    constructor(public PC: number, public IDATA: number) {
    }

    static fromMemoryAndPC(memory: Memory, PC: number) { return new Instruction(PC, memory.readInt32(PC)); }

    extract(offset: number, length: number) { return BitUtils.extract(this.IDATA, offset, length); }
    extract_s(offset: number, length: number) { return BitUtils.extractSigned(this.IDATA, offset, length); }
    insert(offset: number, length: number, value: number) { this.IDATA = BitUtils.insert(this.IDATA, offset, length, value); }

    get rd() { return (this.IDATA >> 11) & 0b11111; } set rd(value: number) { this.insert(11, 5, value); }
    get rt() { return (this.IDATA >> 16) & 0b11111; } set rt(value: number) { this.insert(16, 5, value); }
    get rs() { return (this.IDATA >> 21) & 0b11111; } set rs(value: number) { this.insert(21, 5, value); }

    get fd() { return (this.IDATA >> 6) & 0b11111; } set fd(value: number) { this.insert(6, 5, value); }
    get fs() { return (this.IDATA >> 11) & 0b11111; } set fs(value: number) { this.insert(11, 5, value); }
    get ft() { return (this.IDATA >> 16) & 0b11111; } set ft(value: number) { this.insert(16, 5, value); }

    get VD() { return (this.IDATA >> 0) & 0b1111111; } set VD(value: number) { this.insert(0, 7, value); }
    get VS() { return (this.IDATA >> 8) & 0b1111111; } set VS(value: number) { this.insert(8, 7, value); }
    get VT() { return (this.IDATA >> 16) & 0b1111111; } set VT(value: number) { this.insert(16, 7, value); }
    get VT5_1() { return this.VT5 | (this.VT1 << 5); } set VT5_1(value: number) { this.VT5 = value; this.VT1 = (value >>> 5); }
    get IMM14() { return this.extract_s(2, 14); } set IMM14(value: number) { this.insert(2, 14, value); }

    get ONE() { return (this.IDATA >> 7) & 1; } set ONE(value: number) { this.insert(7, 1, value); }
    get TWO() { return (this.IDATA >> 15) & 1; } set TWO(value: number) { this.insert(15, 1, value); }
    get ONE_TWO() { return (1 + 1 * this.ONE + 2 * this.TWO); } set ONE_TWO(value: number) { this.ONE = (((value - 1) >>> 0) & 1); this.TWO = (((value - 1) >>> 1) & 1); }

    get IMM8() { return this.extract(16, 8); } set IMM8(value: number) { this.insert(16, 8, value); }
    get IMM5() { return this.extract(16, 5); } set IMM5(value: number) { this.insert(16, 5, value); }
    get IMM3() { return this.extract(18, 3); } set IMM3(value: number) { this.insert(18, 3, value); }
    get IMM7() { return this.extract(0, 7); } set IMM7(value: number) { this.insert(0, 7, value); }
    get IMM4() { return this.extract(0, 4); } set IMM4(value: number) { this.insert(0, 4, value); }
    get VT1() { return this.extract(0, 1); } set VT1(value: number) { this.insert(0, 1, value); }
    get VT2() { return this.extract(0, 2); } set VT2(value: number) { this.insert(0, 2, value); }
    get VT5() { return this.extract(16, 5); } set VT5(value: number) { this.insert(16, 5, value); }
    get VT5_2() { return this.VT5 | (this.VT2 << 5); }
    get IMM_HF() { return HalfFloat.toFloat(this.imm16); }

    get pos() { return this.lsb; } set pos(value: number) { this.lsb = value; }
    get size_e() { return this.msb + 1; } set size_e(value: number) { this.msb = value - 1; }
    get size_i() { return this.msb - this.lsb + 1; } set size_i(value: number) { this.msb = this.lsb + value - 1; }

    get lsb() { return (this.IDATA >> 6) & 0b11111; } set lsb(value: number) { this.insert(6, 5, value); }
    get msb() { return (this.IDATA >> 11) & 0b11111; } set msb(value: number) { this.insert(11, 5, value); }
    //get c1cr() { return (this.IDATA >> 11) & 0b11111; } set c1cr(value: number) { this.insert(11, 5, value); }

    get vsyscall() { return (this.IDATA >> 6) & 0xFFFFF; } set vsyscall(value: number) { this.insert(6, 20, value); }

    get imm16() { return this.IDATA << 16 >> 16; } set imm16(value: number) { this.insert(0, 16, value); }
    get u_imm16() { return this.IDATA & 0xFFFF; } set u_imm16(value: number) { this.insert(0, 16, value); }
    get u_imm26() { return this.IDATA & 0x3FFFFFF; } set u_imm26(value: number) { this.insert(0, 26, value); }

    get jump_bits() { return this.IDATA & 0x3FFFFFF; } set jump_bits(value: number) { this.insert(0, 26, value); }
    get jump_real() { return (this.jump_bits * 4) >>> 0; } set jump_real(value: number) { this.jump_bits = (value / 4) >>> 0; }

    set branch_address(value: number) { this.imm16 = (value - this.PC - 4) / 4; }
    set jump_address(value: number) { this.u_imm26 = value / 4; }

    get branch_address() { return this.PC + this.imm16 * 4 + 4; }
    get jump_address() { return this.u_imm26 * 4; }
}

export class DecodedInstruction {
    constructor(public instruction: Instruction, public type: InstructionType) {
    }

    get PC() {
        return this.instruction.PC;
    }

    get isUnconditional() {
        switch (this.type.name) {
            case 'j':
            case 'b':
                return true;
            // @TODO: Check beq rX, rX
        }
        return false;
    }

    get isUnconditionalFixedJump() {
        return this.type.name == 'j';
    }

    get targetAddress() {
        if (this.type.isRegister) return this.PC;
        if (this.type.isBranch) return this.instruction.branch_address;
        if (this.type.isJump) return this.instruction.jump_address;
        return this.PC + 4;
    }
}