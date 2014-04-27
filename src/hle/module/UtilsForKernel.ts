import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class UtilsForKernel {
	constructor(private context: _context.EmulatorContext) { }

	sceKernelIcacheInvalidateRange = createNativeFunction(0xC2DF770E, 150, 'void', 'uint/uint', this, (address: number, size: number) => {
		this.context.instructionCache.invalidateRange(address, address + size);
	});
}
