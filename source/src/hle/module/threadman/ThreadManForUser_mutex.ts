///<reference path="../../../global.d.ts" />

import _utils = require('../../utils');
import _context = require('../../../context');
import _cpu = require('../../../core/cpu');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../../SceKernelErrors');
import _manager = require('../../manager');
import CpuSpecialAddresses = _cpu.CpuSpecialAddresses;
import CpuState = _cpu.CpuState;
import Thread = _manager.Thread;

export class ThreadManForUser {
	constructor(private context: _context.EmulatorContext) { }

	sceKernelCreateMutex = createNativeFunction(0xB7D098C6, 150, 'int', 'string/int/int', this, (name: string, attribute: number, options: number) => {
		return -1;
	});

	sceKernelLockMutexCB = createNativeFunction(0x5BF4DD27, 150, 'int', 'int/int/void*', this, (mutexId:number, count:number, timeout:Stream) => {
		return -1;
	});
}