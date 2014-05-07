import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class StdioForUser {
    constructor(private context: _context.EmulatorContext) { }

    sceKernelStdin = createNativeFunction(0x172D316E, 150, 'int', '', this, () => 0);
    sceKernelStdout = createNativeFunction(0xA6BAB2E9, 150, 'int', '', this, () => 1);
    sceKernelStderr = createNativeFunction(0xF78BA90A, 150, 'int', '', this, () => 2);
}
