import {Stream} from "../../global/stream";
import {
    Struct,
    StructInt32,
    StructStructStringz,
    StructUInt32
} from "../../global/struct";
import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunction, nativeFunctionEx, PTR, STRING} from "../utils";

export class sceReg {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0x92E41280, 150)
	@I32 sceRegOpenRegistry(@PTR regParamPtr: Stream, @I32 mode: number, @PTR regHandlePtr: Stream) {
		const regParam = RegParam.struct.read(regParamPtr);
		console.warn(`sceRegOpenRegistry: ${regParam.name}`);
		regHandlePtr.writeInt32(0);
		return 0;
	}

	@nativeFunctionEx(0x1D8A762E, 150)
	@I32 sceRegOpenCategory(@I32 regHandle: number, @STRING name:string, @I32 mode: number, @PTR regCategoryHandlePtr: Stream) {
		console.warn(`sceRegOpenCategory: ${name}`);
		return 0;
	}

	@nativeFunctionEx(0xD4475AA8, 150)
    @I32 sceRegGetKeyInfo(@I32 categoryHandle: number, @STRING name: string, @PTR regKeyHandlePtr: Stream, @PTR regKeyTypesPtr: Stream, @PTR sizePtr: Stream) {
		console.warn(`sceRegGetKeyInfo: ${name}`);
		return 0;
	}

	@nativeFunctionEx(0x28A8E98A, 150)
    @I32 sceRegGetKeyValue(@I32 categoryHandle: number, @I32 regKeyHandle: number, @PTR bufferPtr: Stream, @I32 size: number) {
		console.warn('sceRegGetKeyValue');
		return 0;
	}

	@nativeFunctionEx(0x0D69BF40, 150)
    @I32 sceRegFlushCategory(@I32 categoryHandle: number) {
		console.warn('sceRegFlushCategory');
		return 0;
	}

	@nativeFunctionEx(0x0CAE832B, 150)
    @I32 sceRegCloseCategory(@I32 categoryHandle: number) {
		console.warn('sceRegCloseCategory');
		return 0;
	}

	@nativeFunctionEx(0x39461B4D, 150)
    @I32 sceRegFlushRegistry(@I32 regHandle: number) {
		console.warn('sceRegFlushRegistry');
		return 0;
	}

	@nativeFunctionEx(0xFA8A5739, 150)
    @I32 sceRegCloseRegistry(@I32 regHandle: number) {
		console.warn('sceRegCloseRegistry');
		return 0;
	}
}

class RegParam extends Struct {
	@StructUInt32 regType: number = 0
    @StructStructStringz(256) name: string = ''
    @StructInt32 nameLength: number = 0
    @StructInt32 unknown2: number = 0
    @StructInt32 unknown3: number = 0
}
