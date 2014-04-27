import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceHprm {
	constructor(private context: _context.EmulatorContext) { }

	sceHprmPeekCurrentKey = createNativeFunction(0x1910B327, 150, 'uint', 'void*', this, (PspHprmKeysEnumKeyPtr: Stream) => {
		PspHprmKeysEnumKeyPtr.writeInt32(0);
		return 0;
	});
}
