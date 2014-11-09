///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;

export class LoadCoreForKernel {
	constructor(private context: _context.EmulatorContext) { }

	sceKernelIcacheClearAll = createNativeFunction(0xD8779AC6, 150, 'void', '', this, () => {
		this.context.instructionCache.invalidateAll();
	});

	sceKernelFindModuleByUID = createNativeFunction(0xCCE4A157, 150, 'int', 'int', this, (moduleID: number) => {
		console.warn('Not implemented sceKernelFindModuleByUID(' + moduleID + ')');
		return 0;
	});
}
