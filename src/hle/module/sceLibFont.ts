import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceLibFont {
	constructor(private context: _context.EmulatorContext) { }

	private fontLibUid = new UidCollection<FontLib>(1);

	sceFontNewLib = createNativeFunction(0x67F17ED7, 150, 'uint', 'void*/void*', this, (paramsPtr: Stream, errorCodePtr: Stream) => {
		var fontLib = new FontLib();
		return this.fontLibUid.allocate(fontLib);
	});
}

class FontLib {
}