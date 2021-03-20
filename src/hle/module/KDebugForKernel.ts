import {nativeFunction} from "../utils";
import {EmulatorContext} from "../../emu/context";

export class KDebugForKernel {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0x84F370BC, 150, 'void', 'string')
	Kprintf(format: string) {
		console.info('Kprintf: ' + format);
	}
}
