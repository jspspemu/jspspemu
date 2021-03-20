import {EmulatorContext} from "../../emu/context";
import {nativeFunction} from "../utils";

export class ExceptionManagerForKernel {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0x565C0B0E, 150, 'uint', 'uint')
	sceKernelRegisterDefaultExceptionHandler(exceptionHandlerFunction: number) {
		return 0;
	}
}
