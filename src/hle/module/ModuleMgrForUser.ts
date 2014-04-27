import _utils = require('../utils');
import _manager = require('../manager');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import Thread = _manager.Thread;

export class ModuleMgrForUser {
	constructor(private context: _context.EmulatorContext) { }

	sceKernelSelfStopUnloadModule = createNativeFunction(0xD675EBB8, 150, 'uint', 'HleThread/int/int/int', this, (thread: Thread, unknown: number, argsize: number, argp: number) => {
		console.info("Call stack:");
		thread.state.getCallstack().forEach((PC) => {
			console.info(sprintf("%08X : %s", PC, this.context.symbolLookup.getSymbolAt(PC)));
		});
		//this.context.instructionCache.functionGenerator.getInstructionUsageCount().forEach((item) => { console.log(item.name, ':', item.count); });
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelSelfStopUnloadModule(%d, %d, %d)', unknown, argsize, argp));
		return 0;
	});

	sceKernelLoadModule = createNativeFunction(0x977DE386, 150, 'uint', 'string/uint/void*', this, (path: string, flags: number, sceKernelLMOption: Stream) => {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModule(%s, %d)', path, flags));
		return 0;
	});

	sceKernelStartModule = createNativeFunction(0x50F0C1EC, 150, 'uint', 'int/int/uint/void*/void*', this, (moduleId: number, argumentSize: number, argumentPointer: number, status:Stream, sceKernelSMOption:Stream) => {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelStartModule(%d, %d, %d)', moduleId, argumentSize, argumentPointer));
		return 0;
	});

	sceKernelGetModuleIdByAddress = createNativeFunction(0xD8B73127, 150, 'uint', 'uint', this, (address: number) => {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelGetModuleIdByAddress(%08X)', address));
		return -1;
	});
}
