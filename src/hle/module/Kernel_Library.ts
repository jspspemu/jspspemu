import _utils = require('../utils');
import _manager = require('../manager'); _manager.Thread;
import SceKernelErrors = require('../SceKernelErrors');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;

import Thread = _manager.Thread;

export class Kernel_Library {
	constructor(private context: _context.EmulatorContext) { }

	sceKernelCpuSuspendIntr = createNativeFunction(0x092968F4, 150, 'uint', '', this, () => {
		return this.context.interruptManager.suspend();
	});

	sceKernelCpuResumeIntr = createNativeFunction(0x5F10D406, 150, 'uint', 'Thread/uint', this, (thread:Thread, flags: number): any => {
		this.context.interruptManager.resume(flags);
		//return 0;
		//throw(new CpuBreakException());
		//thread.state.V0 = 0;
		//throw (new CpuBreakException());
		if (thread['sceKernelCpuResumeIntrCount'] === undefined) thread['sceKernelCpuResumeIntrCount'] = 0;
		thread['sceKernelCpuResumeIntrCount']++;
		if (thread['sceKernelCpuResumeIntrCount'] >= 3) {
			thread['sceKernelCpuResumeIntrCount'] = 0;
			return Promise.resolve(0);
			//return thread.delayMicrosecondsAsync(1000);
		} else {
			return 0;
		}
	});

	sceKernelMemset = createNativeFunction(0xA089ECA4, 150, 'uint', 'uint/int/int', this, (address: number, value: number, size: number) => {
		this.context.memory.memset(address, value, size);
		return address;
	});

	sceKernelMemcpy = createNativeFunction(0x1839852A, 150, 'uint', 'uint/uint/int', this, (dst: number, src: number, size: number) => {
		this.context.memory.copy(src, dst, size);
		return dst;
	});
}
