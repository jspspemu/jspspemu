import {nativeFunction, nativeFunctionEx, STRING, VOID} from "../utils";
import {EmulatorContext} from "../../emu/context";

export class KDebugForKernel {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0x84F370BC, 150)
	@VOID Kprintf(@STRING format: string) {
		console.info(`Kprintf: ${format}`);
	}
}
