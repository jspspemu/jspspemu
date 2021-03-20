import * as _utils from '../utils';
import * as _context from '../../context';
import nativeFunction = _utils.nativeFunction;
import { SceKernelErrors } from '../SceKernelErrors';

export class UtilsForKernel {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0xC2DF770E, 150, 'void', 'uint/uint')
	sceKernelIcacheInvalidateRange(address: number, size: number) {
		this.context.currentInstructionCache.invalidateRange(address, address + size);
	}
}
