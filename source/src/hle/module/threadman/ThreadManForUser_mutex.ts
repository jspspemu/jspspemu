import _utils = require('../../utils');
import _context = require('../../../context');
import nativeFunction = _utils.nativeFunction;
import {Stream} from "../../../global/stream";

export class ThreadManForUser {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0xB7D098C6, 150, 'int', 'string/int/int')
	sceKernelCreateMutex(name: string, attribute: number, options: number) {
		return -1;
	}

	@nativeFunction(0x5BF4DD27, 150, 'int', 'int/int/void*')
	sceKernelLockMutexCB(mutexId:number, count:number, timeout:Stream) {
		return -1;
	}
}