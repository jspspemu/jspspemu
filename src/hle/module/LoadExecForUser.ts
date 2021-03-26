import {logger, throwEndCycles} from "../../global/utils";
import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunction, THREAD, U32} from "../utils";
import {Thread} from "../manager/thread";

const console = logger.named('module.LoadExecForUser');

export class LoadExecForUser {
    constructor(private context: EmulatorContext) { }

    @nativeFunction(0xBD2F1094, 150)
	@U32 sceKernelExitGame(@THREAD thread: Thread) {
        console.info('sceKernelExitGame');
		thread.stop('sceKernelExitGame');
		this.context.threadManager.exitGame(0);
        throwEndCycles();
        return 0;
	}

	@nativeFunction(0x05572A5F, 150)
    @U32 sceKernelExitGame2(@THREAD thread: Thread) {
		console.info("Call stack:");
		thread.state.printCallstack(this.context.symbolLookup);
		//this.context.instructionCache.functionGenerator.getInstructionUsageCount().forEach((item) => { console.log(item.name, ':', item.count); });

		console.info('sceKernelExitGame2');
		this.context.threadManager.exitGame(0);
		thread.stop('sceKernelExitGame2');
        throwEndCycles();
    }

    @nativeFunction(0x4AC57943, 150)
    @U32 sceKernelRegisterExitCallback(@I32 callbackId: number) {
        //console.warn(`Not implemented sceKernelRegisterExitCallback: ${callbackId}`);
        return 0;
    }
}
