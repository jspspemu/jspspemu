import _utils = require('../utils');
import _context = require('../../context');
import _cpu = require('../../core/cpu');
import createNativeFunction = _utils.createNativeFunction;
import _manager = require('../manager');
import Thread = _manager.Thread;

export class LoadExecForUser {
    constructor(private context: _context.EmulatorContext) { }

    sceKernelExitGame = createNativeFunction(0xBD2F1094, 150, 'uint', 'Thread', this, (thread: Thread) => {
        console.info('sceKernelExitGame');
		thread.stop();
		this.context.threadManager.exitGame();
        throw (new CpuBreakException());
        return 0;
	});

	sceKernelExitGame2 = createNativeFunction(0x05572A5F, 150, 'uint', 'Thread', this, (thread: Thread) => {
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
