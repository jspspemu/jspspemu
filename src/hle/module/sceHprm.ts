import {Stream} from "../../global/stream";
import {EmulatorContext} from "../../emu/context";
import {nativeFunction} from "../utils";

export class sceHprm {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0x1910B327, 150, 'uint', 'void*')
	sceHprmPeekCurrentKey(PspHprmKeysEnumKeyPtr: Stream) {
		PspHprmKeysEnumKeyPtr.writeInt32(0);
		return 0;
	}
}
