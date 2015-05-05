///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import nativeFunction = _utils.nativeFunction;

export class LoadCoreForKernel {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0xD8779AC6, 150, 'void', '')
	sceKernelIcacheClearAll() {
		this.context.currentInstructionCache.invalidateAll();
	}

	@nativeFunction(0xCCE4A157, 150, 'int', 'int')
	sceKernelFindModuleByUID(moduleID: number) {
		console.warn('Not implemented sceKernelFindModuleByUID(' + moduleID + ')');
		return 0;
	}
}
