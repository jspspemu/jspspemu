///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceReg {
	constructor(private context: _context.EmulatorContext) { }

	sceRegOpenRegistry = createNativeFunction(0x92E41280, 150, 'int', 'void*/int/void*', this, (regParamPtr: Stream, mode: number, regHandlePtr: Stream) => {
		var regParam = RegParam.struct.read(regParamPtr);
		console.warn('sceRegOpenRegistry: ' + regParam.name);
		regHandlePtr.writeInt32(0);
		return 0;
	});

	sceRegOpenCategory = createNativeFunction(0x1D8A762E, 150, 'int', 'int/string/int/void*', this, (regHandle: number, name:string, mode: number, regCategoryHandlePtr: Stream) => {
		console.warn('sceRegOpenCategory: ' + name);
		return 0;
	});

	sceRegGetKeyInfo = createNativeFunction(0xD4475AA8, 150, 'int', 'int/string/void*/void*/void*', this, (categoryHandle: number, name: string, regKeyHandlePtr: Stream, regKeyTypesPtr: Stream, sizePtr: Stream) => {
		console.warn('sceRegGetKeyInfo: ' + name);
		return 0;
	});

	sceRegGetKeyValue = createNativeFunction(0x28A8E98A, 150, 'int', 'int/int/void*/int', this, (categoryHandle: number, regKeyHandle: number, bufferPtr: Stream, size: number) => {
		console.warn('sceRegGetKeyValue');
		return 0;
	});

	sceRegFlushCategory = createNativeFunction(0x0D69BF40, 150, 'int', 'int', this, (categoryHandle: number) => {
		console.warn('sceRegFlushCategory');
		return 0;
	});

	sceRegCloseCategory = createNativeFunction(0x0CAE832B, 150, 'int', 'int', this, (categoryHandle: number) => {
		console.warn('sceRegCloseCategory');
		return 0;
	});

	sceRegFlushRegistry = createNativeFunction(0x39461B4D, 150, 'int', 'int', this, (regHandle: number) => {
		console.warn('sceRegFlushRegistry');
		return 0;
	});

	sceRegCloseRegistry = createNativeFunction(0xFA8A5739, 150, 'int', 'int', this, (regHandle: number) => {
		console.warn('sceRegCloseRegistry');
		return 0;
	});
}

class RegParam {
	regType: number;
	name: string;
	nameLength: number;
	unknown2: number;
	unknown3: number;

	static struct = StructClass.create<RegParam>(RegParam, [
		{ regType: UInt32 },
		{ name: Stringz(256) },
		{ nameLength: Int32 },
		{ unknown2: Int32 },
		{ unknown3: Int32 },
	]);
}
