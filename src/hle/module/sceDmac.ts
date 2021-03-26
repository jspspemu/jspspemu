import { SceKernelErrors } from '../SceKernelErrors';
import {PromiseFast} from "../../global/utils";
import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunctionEx, U32} from "../utils";

export class sceDmac {
	constructor(private context: EmulatorContext) { }

	private _sceDmacMemcpy(destination: number, source: number, size: number): any {
		if (size == 0) return SceKernelErrors.ERROR_INVALID_SIZE;
		if (destination == 0) return SceKernelErrors.ERROR_INVALID_POINTER;
		if (source == 0) return SceKernelErrors.ERROR_INVALID_POINTER;
		this.context.memory.copy(source, destination, size);
		if (size < 272) return 0;
		return PromiseFast.resolve(0);
	}

	@nativeFunctionEx(0x617F3FE6, 150)
	@U32 sceDmacMemcpy(@U32 destination: number, @U32 source: number, @I32 size: number) {
		return this._sceDmacMemcpy(destination, source, size);
	}

	@nativeFunctionEx(0xD97F94D8, 150)
    @U32 sceDmacTryMemcpy(@U32 destination: number, @U32 source: number, @I32 size: number) {
		return this._sceDmacMemcpy(destination, source, size);
	}
}
