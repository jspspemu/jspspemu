///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class scePspNpDrm_user {
	constructor(private context: _context.EmulatorContext) { }
}
