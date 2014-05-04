import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceMpeg {
	constructor(private context: _context.EmulatorContext) { }

	sceMpegInit = createNativeFunction(0x682A619B, 150, 'uint', '', this, () => {
		return 0;
	});
}
