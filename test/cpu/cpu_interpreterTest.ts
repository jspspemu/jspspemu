///<reference path="../global.d.ts" />

import {assert} from "chai"
import {MipsAssembler} from "../../src/core/cpu/cpu_assembler";
import {getMemoryInstance, Memory, TestMemory} from "../../src/core/memory";
import {interpretCpuInstruction} from "../../src/core/cpu/cpu_interpreter";
import {CpuState, SyscallManager} from "../../src/core/cpu/cpu_core";

describe("cpu_interpreter", () => {
    const mem = new TestMemory(1024)
    const syscalls = new SyscallManager({})
    let asm = new MipsAssembler();
    asm.assembleToMemory(mem, 0, ["addi r1, r0, 1000"])
    const state = new CpuState(mem, syscalls)
    interpretCpuInstruction(state)
    assert.equal(state.getGPR(1), 1000)
})
