///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import _cpu = require('../../core/cpu');
import nativeFunction = _utils.nativeFunction;
import _manager = require('../manager');
import Thread = _manager.Thread;

var console = logger.named('module.LoadExecForUser');

export class LoadExecForUser {
    constructor(private context: _context.EmulatorContext) { }

    @nativeFunction(0xBD2F1094, 150, 'uint', 'Thread')
	sceKernelExitGame(thread: Thread) {
        console.info('sceKernelExitGame');
		thread.stop('sceKernelExitGame');
		this.context.threadManager.exitGame();
        throw new Error('CpuBreakException');
        return 0;
	}

	@nativeFunction(0x05572A5F, 150, 'uint', 'Thread')
	sceKernelExitGame2(thread: Thread) {
		console.info("Call stack:");
		thread.state.printCallstack(this.context.symbolLookup);
		//this.context.instructionCache.functionGenerator.getInstructionUsageCount().forEach((item) => { console.log(item.name, ':', item.count); });

		console.info('sceKernelExitGame2');
		this.context.threadManager.exitGame();
		thread.stop('sceKernelExitGame2');
        throw new Error('CpuBreakException');
    }

    @nativeFunction(0x4AC57943, 150, 'uint', 'int')
	sceKernelRegisterExitCallback(callbackId: number) {
        //console.warn('Not implemented sceKernelRegisterExitCallback: ' + callbackId);
        return 0;
    }
}
