///<reference path="../../global.d.ts" />

import { nativeFunction } from '../utils';
import _context = require('../../context');
import _structs = require('../structs');
import SceKernelErrors = require('../SceKernelErrors');
import { Battery } from './scePower';

export class sceImpose {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0x8C943191, 150, 'uint', 'void*/void*')
	sceImposeGetBatteryIconStatus(isChargingPointer: Stream, iconStatusPointer: Stream) {
		return Battery.getAsync().then(b => {
			var charging = b.charging ? ChargingEnum.Charging : ChargingEnum.NotCharging;
			var status = BatteryStatusEnum.FullyFilled;
			
			if (b.level < 0.15) status = BatteryStatusEnum.VeryLow;
			if (b.level < 0.30) status = BatteryStatusEnum.Low;
			else if (b.level < 0.80) status = BatteryStatusEnum.PartiallyFilled;
			else status = BatteryStatusEnum.FullyFilled;

			isChargingPointer.writeInt32(charging);
			iconStatusPointer.writeInt32(status);
			return 0;
		});
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

enum ChargingEnum {
	NotCharging = 0,
	Charging = 1,
}

enum BatteryStatusEnum {
	VeryLow = 0,
	Low = 1,
	PartiallyFilled = 2,
	FullyFilled = 3,
}
