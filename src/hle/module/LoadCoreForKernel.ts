import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;

export class LoadCoreForKernel {
	constructor(private context: _context.EmulatorContext) { }

	sceKernelIcacheClearAll = createNativeFunction(0xD8779AC6, 150, 'void', '', this, () => {
		this.context.instructionCache.invalidateAll();
	});
}
