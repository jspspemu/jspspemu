import _utils = require('../utils');
import _manager = require('../manager'); _manager.Thread;

import _context = require('../../context');
import nativeFunction = _utils.nativeFunction;

import Thread = _manager.Thread;
import {Promise2} from "../../global/utils";

export class Kernel_Library {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0x092968F4, 150, 'uint', '')
	sceKernelCpuSuspendIntr() {
		return Promise2.resolve(this.context.interruptManager.suspend());
	}

	@nativeFunction(0x5F10D406, 150, 'uint', 'Thread/uint')
	sceKernelCpuResumeIntr(thread:Thread, flags: number): any {
		this.context.interruptManager.resume(flags);
		//return 0;
		//throw(new CpuBreakException());
		//thread.state.V0 = 0;
		//throw (new CpuBreakException());
		thread.sceKernelCpuResumeIntrCount++;
		if (thread.sceKernelCpuResumeIntrCount >= 3) {
			thread.sceKernelCpuResumeIntrCount = 0;
			return Promise2.resolve(0);
			//return thread.delayMicrosecondsAsync(1000);
		} else {
			return Promise2.resolve(0);
		}
	}

	@nativeFunction(0xA089ECA4, 150, 'uint', 'uint/int/int')
	sceKernelMemset(address: number, value: number, size: number) {
		this.context.memory.memset(address, value, size);
		return address;
	}

	@nativeFunction(0x1839852A, 150, 'uint', 'uint/uint/int')
	sceKernelMemcpy(dst: number, src: number, size: number) {
		this.context.memory.copy(src, dst, size);
		return dst;
	}
}
