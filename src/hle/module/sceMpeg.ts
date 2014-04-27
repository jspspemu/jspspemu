import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceMpeg {
	constructor(private context: _context.EmulatorContext) { }
}
