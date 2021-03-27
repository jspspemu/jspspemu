import {logger} from "../../global/utils";
import {EmulatorContext} from "../../emu/context";
import {CPUSTATE, I32, nativeFunction, THREAD, U32} from "../utils";
import {Thread} from "../manager/thread";
import {CpuState} from "../../core/cpu/cpu_core";

const console = logger.named('module.LoadExecForUser');

export class LoadExecForUser {
    constructor(private context: EmulatorContext) { }

    @nativeFunction(0xBD2F1094, 150)
	@U32 sceKernelExitGame(@THREAD thread: Thread, @CPUSTATE state: CpuState) {
        console.info('sceKernelExitGame');
		thread.stop('sceKernelExitGame');
		this.context.threadManager.exitGame(0);
		state.throwEndCycles()
        return 0;
	}

	@nativeFunction(0x05572A5F, 150)
    @U32 sceKernelExitGame2(@THREAD thread: Thread, @CPUSTATE state: CpuState) {
		console.info("Call stack:");
		state.printCallstack(this.context.symbolLookup);
		//this.context.instructionCache.functionGenerator.getInstructionUsageCount().forEach((item) => { console.log(item.name, ':', item.count); });

		console.info('sceKernelExitGame2');
		this.context.threadManager.exitGame(0);
		thread.stop('sceKernelExitGame2');
        state.throwEndCycles();
    }

    @nativeFunction(0x4AC57943, 150)
    @U32 sceKernelRegisterExitCallback(@I32 callbackId: number) {
        //console.warn(`Not implemented sceKernelRegisterExitCallback: ${callbackId}`);
        return 0;
    }
}
