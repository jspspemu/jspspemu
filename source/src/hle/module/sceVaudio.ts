import _utils = require('../utils');
import _context = require('../../context');
import nativeFunction = _utils.nativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceVaudio {
	constructor(private context: _context.EmulatorContext) { }
}
