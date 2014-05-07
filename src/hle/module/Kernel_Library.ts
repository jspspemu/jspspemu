import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
export class Kernel_Library {
	constructor(private context: _context.EmulatorContext) { }

	sceKernelCpuSuspendIntr = createNativeFunction(0x092968F4, 150, 'uint', '', this, () => {
		return this.context.interruptManager.suspend();
	});

	sceKernelCpuResumeIntr = createNativeFunction(0x5F10D406, 150, 'uint', 'uint', this, (flags: number) => {
		this.context.interruptManager.resume(flags);
		return 0;
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
