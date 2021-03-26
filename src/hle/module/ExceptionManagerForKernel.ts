import {EmulatorContext} from "../../emu/context";
import {nativeFunctionEx, U32} from "../utils";

export class ExceptionManagerForKernel {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0x565C0B0E, 150)
	@U32 sceKernelRegisterDefaultExceptionHandler(@U32 exceptionHandlerFunction: number) {
		return 0;
	}
}
