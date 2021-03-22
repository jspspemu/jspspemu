import {CpuSpecialAddresses, CpuState} from "./cpu_core";
import {interpretCpuInstruction} from "./cpu_interpreter";
import {CpuBreakException, InterruptBreakException} from "../../global/utils";

export class CpuExecutor {
    static executeAtPC(state: CpuState) {
        state.startThreadStep();
        //const expectedRA = this.RA;
        //while (this.PC != this.RA) {
        try {
            if (state.interpreted) {
                // noinspection InfiniteLoopJS
                while (true) {
                    if (state.PC == CpuSpecialAddresses.EXIT_INTERRUPT) state.throwInterruptBreakException();
                    if (state.PC == CpuSpecialAddresses.EXIT_THREAD) state.throwCpuBreakException();
                    interpretCpuInstruction(state)
                }
            } else {
                // noinspection InfiniteLoopJS
                while (true) {
                    state.getFunction(state.PC).execute(state);
                }
            }
        } catch (e) {
            if (InterruptBreakException.is(e)) return;
            throw e;
        }
    }

    static executeAtPCAsync(state: CpuState) {
        state.startThreadStep();
        try {
            if (state.interpreted) {
                for (let n = 0; n < 100000; n++) {
                    if (state.PC == CpuSpecialAddresses.EXIT_INTERRUPT) state.throwInterruptBreakException();
                    if (state.PC == CpuSpecialAddresses.EXIT_THREAD) state.throwCpuBreakException();
                    interpretCpuInstruction(state)
                }
            } else {
                state.getFunction(state.PC).execute(state);
            }
        } catch (e) {
            if (CpuBreakException.is(e)) return;
            if (InterruptBreakException.is(e)) return;
            throw e;
        }
    }
}