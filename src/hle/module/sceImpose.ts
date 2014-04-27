import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceImpose {
	constructor(private context: _context.EmulatorContext) { }

	sceImposeGetBatteryIconStatus = createNativeFunction(0x8C943191, 150, 'uint', 'void*/void*', this, (isChargingPointer: Stream, iconStatusPointer: Stream) => {
		isChargingPointer.writeInt32(ChargingEnum.NotCharging);
		iconStatusPointer.writeInt32(BatteryStatusEnum.FullyFilled);
		return 0;
	});
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
