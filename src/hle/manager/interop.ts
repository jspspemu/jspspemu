import {CpuState} from "../../core/cpu/cpu_core";

export class Interop {
	execute(state: CpuState, address: number, gprArray: number[]) {
		state.preserveRegisters(() => {
			state.setRA(0x1234);
			for (var n = 0; n < gprArray.length; n++) {
				state.setGPR(4 + n, gprArray[n]);
			}

			state.PC = address;			
			state.executeAtPCAsync();			
            
			//state.PC = address;
			//state.executeAtPC();
		});
	}
} 