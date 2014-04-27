import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceUtility {
	constructor(private context: _context.EmulatorContext) { }

	private currentStep: DialogStepEnum = DialogStepEnum.NONE;

	sceUtilitySavedataInitStart = createNativeFunction(0x50C4CD57, 150, 'uint', 'void*', this, (paramsPtr: Stream) => {
		this.currentStep = DialogStepEnum.SUCCESS;
		return 0;
	});

	sceUtilitySavedataShutdownStart = createNativeFunction(0x9790B33C, 150, 'uint', '', this, () => {
		this.currentStep = DialogStepEnum.SHUTDOWN;
		return 0;
	});

	sceUtilitySavedataGetStatus = createNativeFunction(0x8874DBE0, 150, 'uint', '', this, () => {
		try {
			return this.currentStep;
		} finally {
			if (this.currentStep == DialogStepEnum.SHUTDOWN) this.currentStep = DialogStepEnum.NONE;
		}
	});

	sceUtilityGetSystemParamInt = createNativeFunction(0xA5DA2406, 150, 'uint', 'int/void*', this, (id: PSP_SYSTEMPARAM_ID, valuePtr: Stream) => {
		console.warn("Not implemented sceUtilityGetSystemParamInt");
		valuePtr.writeInt32(0);
		return 0;
	});

	sceUtilityMsgDialogInitStart = createNativeFunction(0x2AD8E239, 150, 'uint', 'void*', this, (paramsPtr: Stream) => {
		console.warn("Not implemented sceUtilityMsgDialogInitStart");
		this.currentStep = DialogStepEnum.PROCESSING;

		return 0;
	});

	sceUtilityMsgDialogGetStatus = createNativeFunction(0x9A1C91D7, 150, 'uint', '', this, () => {
		try {
			return this.currentStep;
		} finally {
			if (this.currentStep == DialogStepEnum.SHUTDOWN) this.currentStep = DialogStepEnum.NONE;
		}
	});

	sceUtilityMsgDialogUpdate = createNativeFunction(0x9A1C91D7, 150, 'uint', 'int', this, (value: number) => {
	});
}

enum PSP_SYSTEMPARAM_ID {
	STRING_NICKNAME = 1,
	INT_ADHOC_CHANNEL = 2,
	INT_WLAN_POWERSAVE = 3,
	INT_DATE_FORMAT = 4,
	INT_TIME_FORMAT = 5,
	INT_TIMEZONE = 6, // Timezone offset from UTC in minutes, (EST = -300 = -5 * 60)
	INT_DAYLIGHTSAVINGS = 7,
	INT_LANGUAGE = 8,
	INT_BUTTON_PREFERENCE = 9,
}

enum DialogStepEnum {
	NONE = 0,
	INIT = 1,
	PROCESSING = 2,
	SUCCESS = 3,
	SHUTDOWN = 4,
}
