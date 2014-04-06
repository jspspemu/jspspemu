module hle.modules {
    export class LoadExecForUser {
        constructor(private context: EmulatorContext) { }

        sceKernelExitGame = createNativeFunction(0xBD2F1094, 150, 'uint', 'HleThread', this, (thread: Thread) => {
            console.info('sceKernelExitGame');
			thread.stop();
			this.context.threadManager.exitGame();
            throw (new CpuBreakException());
            return 0;
		});

		sceKernelExitGame2 = createNativeFunction(0x05572A5F, 150, 'uint', 'HleThread', this, (thread: Thread) => {
			console.info("Call stack:");
			thread.state.getCallstack().forEach((PC) => {
				console.info(sprintf("%08X : %s", PC, this.context.symbolLookup.getSymbolAt(PC)));
			});
			//this.context.instructionCache.functionGenerator.getInstructionUsageCount().forEach((item) => { console.log(item.name, ':', item.count); });

			console.info('sceKernelExitGame2');
			this.context.threadManager.exitGame();
            thread.stop();
            throw (new CpuBreakException());
        });

        sceKernelRegisterExitCallback = createNativeFunction(0x4AC57943, 150, 'uint', 'int', this, (callbackId: number) => {
            console.warn('Not implemented sceKernelRegisterExitCallback: ' + callbackId);
            return 0;
        });
    }
}
