///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import nativeFunction = _utils.nativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceDmac {
	constructor(private context: _context.EmulatorContext) { }

	private _sceDmacMemcpy(destination: number, source: number, size: number): any {
		if (size == 0) return SceKernelErrors.ERROR_INVALID_SIZE;
		if (destination == 0) return SceKernelErrors.ERROR_INVALID_POINTER;
		if (source == 0) return SceKernelErrors.ERROR_INVALID_POINTER;
		this.context.memory.copy(source, destination, size);
		if (size < 272) return 0;
		return Promise2.resolve(0);
	}

	@nativeFunction(0x617F3FE6, 150, 'uint', 'uint/uint/int')
	sceDmacMemcpy(destination: number, source: number, size: number) {
		return this._sceDmacMemcpy(destination, source, size);
	}

	@nativeFunction(0xD97F94D8, 150, 'uint', 'uint/uint/int')
	sceDmacTryMemcpy(destination: number, source: number, size: number) {
		return this._sceDmacMemcpy(destination, source, size);
	}
}
