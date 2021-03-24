

import {MipsAssembler} from "../../src/core/cpu/cpu_assembler";
import {getMemoryInstance, Memory, TestMemory} from "../../src/core/memory";
import {interpretCpuInstruction} from "../../src/core/cpu/cpu_interpreter";
import {CpuConfig, CpuState, SyscallManager} from "../../src/core/cpu/cpu_core";
import {assert, before, after, it, describe} from "../@microtest";

describe("cpu_interpreter", () => {
    const mem = new TestMemory(1024)
    const syscalls = new SyscallManager({})
    let cpuConfig = new CpuConfig(true)
    let asm = new MipsAssembler();
    asm.assembleToMemory(mem, 0, ["addi r1, r0, 1000"])
    const state = new CpuState(mem, syscalls, cpuConfig)
    interpretCpuInstruction(state)
    assert.equal(state.getGPR(1), 1000)
})
