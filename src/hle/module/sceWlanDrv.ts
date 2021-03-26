import {EmulatorContext} from "../../emu/context";
import {BOOL, nativeFunction} from "../utils";

export class sceWlanDrv {
	constructor(private context: EmulatorContext) { }

	@nativeFunction(0xD7763699, 150)
	@BOOL sceWlanGetSwitchState() {
		return true;
	}
}
