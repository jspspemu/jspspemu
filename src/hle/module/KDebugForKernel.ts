///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;

export class KDebugForKernel {
	constructor(private context: _context.EmulatorContext) { }

	Kprintf = createNativeFunction(0x84F370BC, 150, 'void', 'string', this, (format: string) => {
		console.info('Kprintf: ' + format);
	});
}
