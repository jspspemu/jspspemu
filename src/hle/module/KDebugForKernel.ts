import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
export class KDebugForKernel {
	constructor(private context: _context.EmulatorContext) { }
}
