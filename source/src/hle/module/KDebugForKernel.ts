import _utils = require('../utils');
import _context = require('../../context');
import nativeFunction = _utils.nativeFunction;

export class KDebugForKernel {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0x84F370BC, 150, 'void', 'string')
	Kprintf(format: string) {
		console.info('Kprintf: ' + format);
	}
}
