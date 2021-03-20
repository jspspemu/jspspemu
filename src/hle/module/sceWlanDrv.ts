import {EmulatorContext} from "../../emu/context";
import {nativeFunction} from "../utils";

export class sceWlanDrv {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0xD7763699, 150, 'bool', '')
	sceWlanGetSwitchState() {
		return true;
	}
}
