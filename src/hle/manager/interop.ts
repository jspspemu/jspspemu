import {CpuSpecialAddresses, CpuState} from "../../core/cpu/cpu_core";
import {CpuExecutor} from "../../core/cpu/cpu_executor";

export class Interop {
	execute(state: CpuState, address: number, gprArray: number[]) {
		state.preserveRegisters(() => {
			state.setRA(CpuSpecialAddresses.EXIT_INTERRUPT);
			for (let n = 0; n < gprArray.length; n++) {
				state.setGPR(4 + n, gprArray[n]);
			}

			state.setPC(address);
			CpuExecutor.executeAtPCAsync(state)

			//state.PC = address;
			//state.executeAtPC();
		});
	}
} 