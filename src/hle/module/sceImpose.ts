import {nativeFunctionEx, PTR, U32} from '../utils';
import {Stream} from "../../global/stream";
import {EmulatorContext} from "../../emu/context";
import {ButtonPreference, PspLanguages} from "../structs";

export class sceImpose {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0x8C943191, 150)
	@U32 sceImposeGetBatteryIconStatus(@PTR isChargingPointer: Stream, @PTR iconStatusPointer: Stream) {
		isChargingPointer.writeInt32(this.context.battery.chargingType);
		iconStatusPointer.writeInt32(this.context.battery.iconStatus);
		return 0;
	}

	@nativeFunctionEx(0x36AA6E91, 150)
    @U32 sceImposeSetLanguageMode(@U32 language: PspLanguages, @U32 buttonPreference: ButtonPreference) {
		this.context.config.language = language;
		this.context.config.buttonPreference = buttonPreference;
		return 0;
	}

	@nativeFunctionEx(0x24FD7BCF, 150)
    @U32 sceImposeGetLanguageMode(@PTR languagePtr: Stream, @PTR buttonPreferencePtr: Stream) {
		languagePtr.writeUInt32(this.context.config.language);
		buttonPreferencePtr.writeUInt32(this.context.config.buttonPreference);
		return 0;
	}
}
