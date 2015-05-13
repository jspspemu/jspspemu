///<reference path="../../global.d.ts" />

import { nativeFunction } from '../utils';
import _context = require('../../context');
import _structs = require('../structs');
import SceKernelErrors = require('../SceKernelErrors');
import { Battery } from '../../core/battery';


export class sceImpose {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0x8C943191, 150, 'uint', 'void*/void*')
	sceImposeGetBatteryIconStatus(isChargingPointer: Stream, iconStatusPointer: Stream) {
		isChargingPointer.writeInt32(this.context.battery.chargingType);
		iconStatusPointer.writeInt32(this.context.battery.iconStatus);
		return 0;
	}

	@nativeFunction(0x36AA6E91, 150, 'uint', 'uint/uint')
	sceImposeSetLanguageMode(language: _structs.PspLanguages, buttonPreference: _structs.ButtonPreference) {
		this.context.config.language = language;
		this.context.config.buttonPreference = buttonPreference;
		return 0;
	}

	@nativeFunction(0x24FD7BCF, 150, 'uint', 'void*/void*')
	sceImposeGetLanguageMode(languagePtr: Stream, buttonPreferencePtr: Stream) {
		languagePtr.writeUInt32(this.context.config.language);
		buttonPreferencePtr.writeUInt32(this.context.config.buttonPreference);
		return 0;
	}
}
