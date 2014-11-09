///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceWlanDrv {
	constructor(private context: _context.EmulatorContext) { }

	sceWlanGetSwitchState = createNativeFunction(0xD7763699, 150, 'bool', '', this, () => {
		return true;
	});
}
