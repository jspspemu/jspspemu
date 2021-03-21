import {CpuSpecialAddresses, CpuState} from "./cpu_core";
import {interpretCpuInstruction} from "./cpu_interpreter";
import {CpuBreakException} from "../../global/utils";

export class CpuExecutor {
    static executeAtPC(state: CpuState) {
        state.startThreadStep();
        //var expectedRA = this.RA;
        //while (this.PC != this.RA) {
        if (state.interpreted) {
            while (true) {
                if (state.PC == CpuSpecialAddresses.EXIT_INTERRUPT) break;
                if (state.PC == CpuSpecialAddresses.EXIT_THREAD) state.throwCpuBreakException();
                interpretCpuInstruction(state)
            }
        } else {
            while (true) {
                if (state.PC == CpuSpecialAddresses.EXIT_INTERRUPT) break;
                state.getFunction(state.PC).execute(state);
            }
        }
    }

    static executeAtPCAsync(state: CpuState) {
        state.startThreadStep();
        try {
            if (state.interpreted) {
                for (let n = 0; n < 100000; n++) {
                    if (state.PC == CpuSpecialAddresses.EXIT_THREAD) state.throwCpuBreakException();
                    interpretCpuInstruction(state)
                }
            } else {
                state.getFunction(state.PC).execute(state);
            }
        } catch (e) {
            if (CpuBreakException.is(e)) return;
            throw e;
        }
    }
}