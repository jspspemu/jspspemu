import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceUtility {
	constructor(private context: _context.EmulatorContext) { }

	private currentStep: DialogStepEnum = DialogStepEnum.NONE;

	sceUtilityLoadModule = createNativeFunction(0x2A2B3DE0, 150, 'uint', 'int', this, (pspModule: PspModule) => {
		console.warn("Not implemented sceUtilityLoadModule '" + pspModule + "'");
		return Promise.resolve(0);
	});

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

	sceUtilityMsgDialogInitStart = createNativeFunction(0x2AD8E239, 150, 'uint', 'void*', this, (paramsPtr: Stream) => {
		console.warn("Not implemented sceUtilityMsgDialogInitStart()");
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

	sceUtilityLoadNetModule = createNativeFunction(0x1579A159, 150, 'uint', '', this, () => {
		console.warn('Not implemented sceUtilityLoadNetModule');
		return 0;
	});

	private _getKey(id: PSP_SYSTEMPARAM_ID): any {
		switch (id) {
			case PSP_SYSTEMPARAM_ID.INT_ADHOC_CHANNEL: return PSP_SYSTEMPARAM_ADHOC_CHANNEL.AUTOMATIC;
			case PSP_SYSTEMPARAM_ID.INT_WLAN_POWERSAVE: return PSP_SYSTEMPARAM_WLAN_POWERSAVE.ON;
			case PSP_SYSTEMPARAM_ID.INT_DATE_FORMAT: return PSP_SYSTEMPARAM_DATE_FORMAT.YYYYMMDD;
			case PSP_SYSTEMPARAM_ID.INT_TIME_FORMAT: return PSP_SYSTEMPARAM_TIME_FORMAT._24HR;
			case PSP_SYSTEMPARAM_ID.INT_TIMEZONE: return -5 * 60;
			case PSP_SYSTEMPARAM_ID.INT_DAYLIGHTSAVINGS: return PSP_SYSTEMPARAM_DAYLIGHTSAVINGS.STD;
			case PSP_SYSTEMPARAM_ID.INT_LANGUAGE: return PspLanguages.ENGLISH;
			case PSP_SYSTEMPARAM_ID.INT_BUTTON_PREFERENCE: return PSP_SYSTEMPARAM_BUTTON_PREFERENCE.NA;
			case PSP_SYSTEMPARAM_ID.STRING_NICKNAME: return "USERNAME";
		}
		throw (new Error("Invalid key " + id));
	}

	sceUtilityGetSystemParamInt = createNativeFunction(0xA5DA2406, 150, 'uint', 'int/void*', this, (id: PSP_SYSTEMPARAM_ID, valuePtr: Stream) => {
		//console.warn("Not implemented sceUtilityGetSystemParamInt", id, PSP_SYSTEMPARAM_ID[id]);
		var value = parseInt(this._getKey(id));
		if (valuePtr) valuePtr.writeInt32(value);
		return 0;
	});

	sceUtilityGetSystemParamString = createNativeFunction(0x34B78343, 150, 'uint', 'int/void*/int', this, (id: PSP_SYSTEMPARAM_ID, strPtr: Stream, len: number) => {
		var value = String(this._getKey(id));
		value = value.substr(0, Math.min(value.length, len - 1));
		if (strPtr) strPtr.writeStringz(value);
		return 0;
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

/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_ADHOC_CHANNEL
/// </summary>
enum PSP_SYSTEMPARAM_ADHOC_CHANNEL {
	AUTOMATIC = 0,
	C1 = 1,
	C6 = 6,
	C11 = 11,
}

/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_WLAN_POWERSAVE
/// </summary>
enum PSP_SYSTEMPARAM_WLAN_POWERSAVE {
	OFF = 0,
	ON = 1,
}

/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_DATE_FORMAT
/// </summary>
enum PSP_SYSTEMPARAM_DATE_FORMAT {
	YYYYMMDD = 0,
	MMDDYYYY = 1,
	DDMMYYYY = 2,
}

/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_TIME_FORMAT
/// </summary>
enum PSP_SYSTEMPARAM_TIME_FORMAT {
	_24HR = 0,
	_12HR = 1,
}

/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_DAYLIGHTSAVINGS
/// </summary>
enum PSP_SYSTEMPARAM_DAYLIGHTSAVINGS {
	STD = 0,
	SAVING = 1,
}

/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_LANGUAGE
/// </summary>
enum PSP_SYSTEMPARAM_LANGUAGE {
	JAPANESE = 0,
	ENGLISH = 1,
	FRENCH = 2,
	SPANISH = 3,
	GERMAN = 4,
	ITALIAN = 5,
	DUTCH = 6,
	PORTUGUESE = 7,
	RUSSIAN = 8,
	KOREAN = 9,
	CHINESE_TRADITIONAL = 10,
	CHINESE_SIMPLIFIED = 11,
}

/// <summary>
/// #9 seems to be Region or maybe X/O button swap.
/// It doesn't exist on JAP v1.0
/// is 1 on NA v1.5s
/// is 0 on JAP v1.5s
/// is read-only
/// </summary>
enum PSP_SYSTEMPARAM_BUTTON_PREFERENCE {
	JAP = 0,
	NA = 1,
	//CIRCLE = 0,
	//CROSS = 1,
}

enum PspLanguages {
	JAPANESE = 0,
	ENGLISH = 1,
	FRENCH = 2,
	SPANISH = 3,
	GERMAN = 4,
	ITALIAN = 5,
	DUTCH = 6,
	PORTUGUESE = 7,
	RUSSIAN = 8,
	KOREAN = 9,
	TRADITIONAL_CHINESE = 10,
	SIMPLIFIED_CHINESE = 11,
}

enum PspModule {
	PSP_MODULE_NET_COMMON = 0x0100,
	PSP_MODULE_NET_ADHOC = 0x0101,
	PSP_MODULE_NET_INET = 0x0102,
	PSP_MODULE_NET_PARSEURI = 0x0103,
	PSP_MODULE_NET_PARSEHTTP = 0x0104,
	PSP_MODULE_NET_HTTP = 0x0105,
	PSP_MODULE_NET_SSL = 0x0106,

	// USB Modules
	PSP_MODULE_USB_PSPCM = 0x0200,
	PSP_MODULE_USB_MIC = 0x0201,
	PSP_MODULE_USB_CAM = 0x0202,
	PSP_MODULE_USB_GPS = 0x0203,

	// Audio/video Modules
	PSP_MODULE_AV_AVCODEC = 0x0300,
	PSP_MODULE_AV_SASCORE = 0x0301,
	PSP_MODULE_AV_ATRAC3PLUS = 0x0302,
	PSP_MODULE_AV_MPEGBASE = 0x0303,
	PSP_MODULE_AV_MP3 = 0x0304,
	PSP_MODULE_AV_VAUDIO = 0x0305,
	PSP_MODULE_AV_AAC = 0x0306,
	PSP_MODULE_AV_G729 = 0x0307,

	// NP
	PSP_MODULE_NP_COMMON = 0x0400,
	PSP_MODULE_NP_SERVICE = 0x0401,
	PSP_MODULE_NP_MATCHING2 = 0x0402,

	PSP_MODULE_NP_DRM = 0x0500,

	// IrDA
	PSP_MODULE_IRDA = 0x0600,
	}