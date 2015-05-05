///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import nativeFunction = _utils.nativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceWlanDrv {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0xD7763699, 150, 'bool', '')
	sceWlanGetSwitchState() {
		return true;
	}
}
