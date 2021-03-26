import {EmulatorContext} from "../../emu/context";
import {BOOL, nativeFunctionEx} from "../utils";

export class sceWlanDrv {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0xD7763699, 150)
	@BOOL sceWlanGetSwitchState() {
		return true;
	}
}
