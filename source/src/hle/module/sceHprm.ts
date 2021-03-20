import * as _utils from '../utils';
import * as _context from '../../context';
import nativeFunction = _utils.nativeFunction;
import {Stream} from "../../global/stream";

export class sceHprm {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0x1910B327, 150, 'uint', 'void*')
	sceHprmPeekCurrentKey(PspHprmKeysEnumKeyPtr: Stream) {
		PspHprmKeysEnumKeyPtr.writeInt32(0);
		return 0;
	}
}
