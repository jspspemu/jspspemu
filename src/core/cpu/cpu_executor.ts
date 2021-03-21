import {CpuState} from "./cpu_core";
import {CpuInterpreter} from "./cpu_interpreter";

export class CpuExecutor {
    static getInterpreter(state: CpuState): CpuInterpreter | null {
        if (!state.interpreted) return null
        if (state.interpreter == null) {
            state.interpreter = new CpuInterpreter()
        }
        return state.interpreter
    }

    static executeAtPC(state: CpuState) {
        state.startThreadStep();
        //var expectedRA = this.RA;
        //while (this.PC != this.RA) {
        const int = CpuExecutor.getInterpreter(state)
        if (int) {
            while (true) {
                if (state.PC == 0x1234) break;
                int.execute(state)
            }
        } else {
            while (true) {
                if (state.PC == 0x1234) break;
                state.getFunction(state.PC).execute(state);
            }
        }
    }

    static executeAtPCAsync(state: CpuState) {
        state.startThreadStep();
        const int = CpuExecutor.getInterpreter(state)
        try {
            if (int) {
                for (let n = 0; n < 100000; n++) {
                    int.execute(state)
                }
            } else {
                state.getFunction(state.PC).execute(state);
            }
        } catch (e) {
            if (e.message != 'CpuBreakException') throw e;
        }
    }
}