///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _manager = require('../manager');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import Thread = _manager.Thread;

export class ModuleMgrForUser {
	constructor(private context: _context.EmulatorContext) { }

	sceKernelStopModule = createNativeFunction(0xD1FF982A, 150, 'uint', '', this, () => {
		return 0;
	});

	sceKernelUnloadModule = createNativeFunction(0x2E0911AA, 150, 'uint', 'int', this, (id: number) => {
		return 0;
	});

	sceKernelSelfStopUnloadModule = createNativeFunction(0xD675EBB8, 150, 'uint', 'int/int/int/Thread', this, (unknown: number, argsize: number, argp: number, thread: Thread) => {
		console.info("Call stack:");
		thread.state.printCallstack(this.context.symbolLookup);
		//this.context.instructionCache.functionGenerator.getInstructionUsageCount().forEach((item) => { console.log(item.name, ':', item.count); });
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelSelfStopUnloadModule(%d, %d, %d)', unknown, argsize, argp));
		throw (new Error("sceKernelSelfStopUnloadModule"));
		return 0;
	});

	sceKernelStopUnloadSelfModule = createNativeFunction(0xCC1D3699, 150, 'uint', 'int/int/int/Thread', this, (argsize: number, argp: number, optionsAddress:number, thread: Thread) => {
		throw (new Error("sceKernelStopUnloadSelfModule"));
		return 0;
	});

	sceKernelLoadModule = createNativeFunction(0x977DE386, 150, 'uint', 'string/uint/void*', this, (path: string, flags: number, sceKernelLMOption: Stream) => {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModule("%s", %d)', path, flags));
		return 0x08900000;
	});

	sceKernelStartModule = createNativeFunction(0x50F0C1EC, 150, 'uint', 'int/int/uint/void*/void*', this, (moduleId: number, argumentSize: number, argumentPointer: number, status:Stream, sceKernelSMOption:Stream) => {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelStartModule(%d, %d, %d)', moduleId, argumentSize, argumentPointer));
		return 0;
	});

	sceKernelGetModuleIdByAddress = createNativeFunction(0xD8B73127, 150, 'uint', 'uint', this, (address: number) => {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelGetModuleIdByAddress(%08X)', address));
		return 3;
	});

	sceKernelGetModuleId = createNativeFunction(0xF0A26395, 150, 'uint', '', this, () => {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelGetModuleId()'));
		return 4; // TODO!
	});

	sceKernelLoadModuleByID = createNativeFunction(0xB7F46618, 150, 'uint', 'uint/uint/void*', this, (fileId: number, flags: number, sceKernelLMOption: Stream) => {
		console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModuleByID(%d, %08X)', fileId, flags));
		return 0;
	});
}
