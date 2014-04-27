import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceSuspendForUser {
	constructor(private context: _context.EmulatorContext) { }

	sceKernelPowerLock = createNativeFunction(0xEADB1BD7, 150, 'uint', 'uint', this, (lockType: number) => {
		if (lockType != 0) return SceKernelErrors.ERROR_INVALID_MODE;
		return 0;
	});

	sceKernelPowerUnlock = createNativeFunction(0x3AEE7261, 150, 'uint', 'uint', this, (lockType: number) => {
		if (lockType != 0) return SceKernelErrors.ERROR_INVALID_MODE;
		return 0;
	});
}
