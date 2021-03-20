import * as _utils from '../utils';
import * as _context from '../../context';
import nativeFunction = _utils.nativeFunction;
import { SceKernelErrors } from '../SceKernelErrors';

export class sceWlanDrv {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0xD7763699, 150, 'bool', '')
	sceWlanGetSwitchState() {
		return true;
	}
}
