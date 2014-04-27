import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;

export class ExceptionManagerForKernel {
	constructor(private context: _context.EmulatorContext) { }

	sceKernelRegisterDefaultExceptionHandler = createNativeFunction(0x565C0B0E, 150, 'uint', 'uint', this, (exceptionHandlerFunction: number) => {
		return 0;
	});
}
