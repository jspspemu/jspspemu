import {Stream} from "../../global/stream";
import {EmulatorContext} from "../../emu/context";
import {nativeFunctionEx, PTR, U32} from "../utils";

export class sceHprm {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0x1910B327, 150)
    @U32 sceHprmPeekCurrentKey(@PTR PspHprmKeysEnumKeyPtr: Stream) {
		PspHprmKeysEnumKeyPtr.writeInt32(0);
		return 0;
	}
}
