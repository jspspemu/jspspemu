///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import nativeFunction = _utils.nativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceHprm {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0x1910B327, 150, 'uint', 'void*')
	sceHprmPeekCurrentKey(PspHprmKeysEnumKeyPtr: Stream) {
		PspHprmKeysEnumKeyPtr.writeInt32(0);
		return 0;
	}
}
