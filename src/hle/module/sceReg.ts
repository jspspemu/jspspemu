import {Stream} from "../../global/stream";
import {Int32, Stringz, StructClass, UInt32} from "../../global/struct";
import {EmulatorContext} from "../../emu/context";
import {nativeFunction} from "../utils";

export class sceReg {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0x92E41280, 150, 'int', 'void*/int/void*')
	sceRegOpenRegistry(regParamPtr: Stream, mode: number, regHandlePtr: Stream) {
		const regParam = RegParam.struct.read(regParamPtr);
		console.warn('sceRegOpenRegistry: ' + regParam.name);
		regHandlePtr.writeInt32(0);
		return 0;
	}

	@nativeFunction(0x1D8A762E, 150, 'int', 'int/string/int/void*')
	sceRegOpenCategory(regHandle: number, name:string, mode: number, regCategoryHandlePtr: Stream) {
		console.warn('sceRegOpenCategory: ' + name);
		return 0;
	}

	@nativeFunction(0xD4475AA8, 150, 'int', 'int/string/void*/void*/void*')
	sceRegGetKeyInfo(categoryHandle: number, name: string, regKeyHandlePtr: Stream, regKeyTypesPtr: Stream, sizePtr: Stream) {
		console.warn('sceRegGetKeyInfo: ' + name);
		return 0;
	}

	@nativeFunction(0x28A8E98A, 150, 'int', 'int/int/void*/int')
	sceRegGetKeyValue(categoryHandle: number, regKeyHandle: number, bufferPtr: Stream, size: number) {
		console.warn('sceRegGetKeyValue');
		return 0;
	}

	@nativeFunction(0x0D69BF40, 150, 'int', 'int')
	sceRegFlushCategory(categoryHandle: number) {
		console.warn('sceRegFlushCategory');
		return 0;
	}

	@nativeFunction(0x0CAE832B, 150, 'int', 'int')
	sceRegCloseCategory(categoryHandle: number) {
		console.warn('sceRegCloseCategory');
		return 0;
	}

	@nativeFunction(0x39461B4D, 150, 'int', 'int')
	sceRegFlushRegistry(regHandle: number) {
		console.warn('sceRegFlushRegistry');
		return 0;
	}

	@nativeFunction(0xFA8A5739, 150, 'int', 'int')
	sceRegCloseRegistry(regHandle: number) {
		console.warn('sceRegCloseRegistry');
		return 0;
	}
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
