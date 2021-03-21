import {DecodingTable, Instructions} from "./cpu_instructions";
import {CpuState} from "./cpu_core";
import {BitUtils, MathFloat} from "../../global/math";
import {ANodeStm} from "./cpu_ast";
import {Instruction} from "./cpu_instruction";

const dummy = new CpuState(null, null, true) as any

const switchCode = DecodingTable.createSwitch(Instructions.instance.instructionTypeList, iname => {
    const iiname = `int_${iname}`
    const qname = JSON.stringify(iiname)
    if (dummy[iiname]) {
        return `state[${qname}](); return;`
    } else {
        return `state.int_unknown(${qname}); return;`
    }
});

// noinspection UnnecessaryLocalVariableJS
export const interpretCpuInstruction: (s: CpuState) => void = eval(`(function switchFunction(state) {
    "use strict";
    const pc = state.PC
    const value = state.memory.lw(pc)
    state.IDATA = value
    ${switchCode}
})`)
