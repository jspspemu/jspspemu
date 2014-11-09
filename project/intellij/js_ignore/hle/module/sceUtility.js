///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var _vfs = require('../vfs');
var _structs = require('../structs');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');
var PspLanguages = _structs.PspLanguages;
var FileOpenFlags = _vfs.FileOpenFlags;
var sceUtility = (function () {
    function sceUtility(context) {
        var _this = this;
        this.context = context;
        this.currentStep = 0 /* NONE */;
        this.sceUtilityLoadModule = createNativeFunction(0x2A2B3DE0, 150, 'uint', 'int', this, function (pspModule) {
            console.warn("Not implemented sceUtilityLoadModule '" + pspModule + "'");
            return Promise.resolve(0);
        });
        this.sceUtilitySavedataInitStart = createNativeFunction(0x50C4CD57, 150, 'uint', 'void*', this, function (paramsPtr) {
            return Promise.resolve(_this._sceUtilitySavedataInitStart(paramsPtr.clone())).then(function (result) {
                var params = SceUtilitySavedataParam.struct.read(paramsPtr.clone());
                params.base.result = result;
                return 0;
            });
        });
        this.sceUtilitySavedataShutdownStart = createNativeFunction(0x9790B33C, 150, 'uint', '', this, function () {
            //console.log('sceUtilitySavedataShutdownStart');
            //debugger;
            _this.currentStep = 4 /* SHUTDOWN */;
            return 0;
        });
        this.sceUtilitySavedataGetStatus = createNativeFunction(0x8874DBE0, 150, 'uint', '', this, function () {
            try {
                return _this.currentStep;
            }
            finally {
                if (_this.currentStep == 4 /* SHUTDOWN */)
                    _this.currentStep = 0 /* NONE */;
            }
        });
        this.sceUtilityMsgDialogInitStart = createNativeFunction(0x2AD8E239, 150, 'uint', 'void*', this, function (paramsPtr) {
            console.warn("Not implemented sceUtilityMsgDialogInitStart()");
            _this.currentStep = 2 /* PROCESSING */;
            return 0;
        });
        this.sceUtilityMsgDialogGetStatus = createNativeFunction(0x9A1C91D7, 150, 'uint', '', this, function () {
            try {
                return _this.currentStep;
            }
            finally {
                if (_this.currentStep == 4 /* SHUTDOWN */)
                    _this.currentStep = 0 /* NONE */;
            }
        });
        this.sceUtilityMsgDialogUpdate = createNativeFunction(0x9A1C91D7, 150, 'uint', 'int', this, function (value) {
        });
        this.sceUtilityLoadNetModule = createNativeFunction(0x1579A159, 150, 'uint', '', this, function () {
            console.warn('Not implemented sceUtilityLoadNetModule');
            return 0;
        });
        this.sceUtilityGetSystemParamInt = createNativeFunction(0xA5DA2406, 150, 'uint', 'int/void*', this, function (id, valuePtr) {
            //console.warn("Not implemented sceUtilityGetSystemParamInt", id, PSP_SYSTEMPARAM_ID[id]);
            var value = parseInt(_this._getKey(id));
            if (valuePtr)
                valuePtr.writeInt32(value);
            return 0;
        });
        this.sceUtilityGetSystemParamString = createNativeFunction(0x34B78343, 150, 'uint', 'int/void*/int', this, function (id, strPtr, len) {
            var value = String(_this._getKey(id));
            value = value.substr(0, Math.min(value.length, len - 1));
            if (strPtr)
                strPtr.writeStringz(value);
            return 0;
        });
        this.sceUtilityLoadAvModule = createNativeFunction(0xC629AF26, 150, 'uint', 'int', this, function (id) {
            return 0;
        });
    }
    sceUtility.prototype._sceUtilitySavedataInitStart = function (paramsPtr) {
        var _this = this;
        console.log('sceUtilitySavedataInitStart');
        var params = SceUtilitySavedataParam.struct.read(paramsPtr);
        var fileManager = this.context.fileManager;
        var savePathFolder = "ms0:/PSP/SAVEDATA/" + params.gameName + params.saveName;
        var saveDataBin = savePathFolder + "/DATA.BIN";
        var saveIcon0 = savePathFolder + "/ICON0.PNG";
        var savePic1 = savePathFolder + "/PIC1.PNG";
        this.currentStep = 3 /* SUCCESS */;
        //debugger;
        params.base.result = 0;
        switch (params.mode) {
            case 0 /* Autoload */:
            case 2 /* Load */:
            case 4 /* ListLoad */:
                return fileManager.openAsync(saveDataBin, 1 /* Read */, parseIntFormat('0777')).then(function (file) { return file.entry.readAllAsync(); }).then(function (data) {
                    _this.context.memory.writeBytes(params.dataBufPointer, data);
                    return 0;
                }).catch(function (error) {
                    return 2148598535 /* ERROR_SAVEDATA_LOAD_NO_DATA */;
                });
            case 1 /* Autosave */:
            case 3 /* Save */:
            case 5 /* ListSave */:
                var data = this.context.memory.readArrayBuffer(params.dataBufPointer, params.dataSize);
                return fileManager.openAsync(saveDataBin, 512 /* Create */ | 1024 /* Truncate */ | 2 /* Write */, parseIntFormat('0777')).then(function (file) { return file.entry.writeAllAsync(data); }).then(function (written) {
                    return 0;
                }).catch(function (error) {
                    return 2148598661 /* ERROR_SAVEDATA_SAVE_ACCESS_ERROR */;
                });
            case 16 /* Read */:
            case 15 /* ReadSecure */:
                {
                    //throw (new SceKernelException(SceKernelErrors.ERROR_SAVEDATA_RW_NO_DATA));
                    console.error("Not Implemented: sceUtilitySavedataInitStart.Read");
                    //return Promise.resolve(-1);
                    return Promise.resolve(0);
                }
                break;
            case 8 /* Sizes */:
                {
                    var SceKernelError = 0 /* ERROR_OK */;
                    //Console.Error.WriteLine("Not Implemented: sceUtilitySavedataInitStart.Sizes");
                    var SectorSize = 1024;
                    var FreeSize = 32 * 1024 * 1024; // 32 MB
                    var UsedSize = 0;
                    {
                        var sizeFreeInfoPtr = this.context.memory.getPointerPointer(SizeFreeInfo.struct, params.msFreeAddr);
                        sizeFreeInfoPtr.readWrite(function (sizeFreeInfo) {
                            sizeFreeInfo.sectorSize = SectorSize;
                            sizeFreeInfo.freeSectors = FreeSize / SectorSize;
                            sizeFreeInfo.freeKb = FreeSize / 1024;
                            sizeFreeInfo.freeKbString = sizeFreeInfo.freeKb + 'KB';
                        });
                    }
                    {
                        var sizeUsedInfoPtr = this.context.memory.getPointerPointer(SizeUsedInfo.struct, params.msDataAddr);
                    }
                    {
                        var sizeRequiredSpaceInfoPtr = this.context.memory.getPointerPointer(SizeRequiredSpaceInfo.struct, params.utilityDataAddr);
                        if (sizeRequiredSpaceInfoPtr != null) {
                            var RequiredSize = 0;
                            RequiredSize += params.icon0FileData.size;
                            RequiredSize += params.icon1FileData.size;
                            RequiredSize += params.pic1FileData.size;
                            RequiredSize += params.snd0FileData.size;
                            RequiredSize += params.dataSize;
                            sizeRequiredSpaceInfoPtr.readWrite(function (sizeRequiredSpaceInfo) {
                                sizeRequiredSpaceInfo.requiredSpaceSectors = MathUtils.requiredBlocks(RequiredSize, SectorSize);
                                sizeRequiredSpaceInfo.requiredSpaceKb = MathUtils.requiredBlocks(RequiredSize, 1024);
                                sizeRequiredSpaceInfo.requiredSpace32KB = MathUtils.requiredBlocks(RequiredSize, 32 * 1024);
                                sizeRequiredSpaceInfo.requiredSpaceString = (sizeRequiredSpaceInfo.requiredSpaceKb) + "KB";
                                sizeRequiredSpaceInfo.requiredSpace32KBString = (sizeRequiredSpaceInfo.requiredSpace32KB) + "KB";
                            });
                        }
                    }
                    if (SceKernelError != 0 /* ERROR_OK */)
                        throw (new SceKernelException(SceKernelError));
                }
                break;
            default:
                throw (new Error("Not implemented " + params.mode + ': ' + PspUtilitySavedataMode[params.mode]));
        }
        return Promise.resolve(0);
    };
    sceUtility.prototype._getKey = function (id) {
        switch (id) {
            case 2 /* INT_ADHOC_CHANNEL */:
                return 0 /* AUTOMATIC */;
            case 3 /* INT_WLAN_POWERSAVE */:
                return 1 /* ON */;
            case 4 /* INT_DATE_FORMAT */:
                return 0 /* YYYYMMDD */;
            case 5 /* INT_TIME_FORMAT */:
                return 0 /* _24HR */;
            case 6 /* INT_TIMEZONE */:
                return -5 * 60;
            case 7 /* INT_DAYLIGHTSAVINGS */:
                return 0 /* STD */;
            case 8 /* INT_LANGUAGE */:
                return this.context.config.language;
            case 9 /* INT_BUTTON_PREFERENCE */:
                return 1 /* NA */;
            case 1 /* STRING_NICKNAME */:
                return "USERNAME";
        }
        throw (new Error("Invalid key " + id));
    };
    return sceUtility;
})();
exports.sceUtility = sceUtility;
var PSP_SYSTEMPARAM_ID;
(function (PSP_SYSTEMPARAM_ID) {
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["STRING_NICKNAME"] = 1] = "STRING_NICKNAME";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_ADHOC_CHANNEL"] = 2] = "INT_ADHOC_CHANNEL";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_WLAN_POWERSAVE"] = 3] = "INT_WLAN_POWERSAVE";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_DATE_FORMAT"] = 4] = "INT_DATE_FORMAT";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_TIME_FORMAT"] = 5] = "INT_TIME_FORMAT";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_TIMEZONE"] = 6] = "INT_TIMEZONE";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_DAYLIGHTSAVINGS"] = 7] = "INT_DAYLIGHTSAVINGS";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_LANGUAGE"] = 8] = "INT_LANGUAGE";
    PSP_SYSTEMPARAM_ID[PSP_SYSTEMPARAM_ID["INT_BUTTON_PREFERENCE"] = 9] = "INT_BUTTON_PREFERENCE";
})(PSP_SYSTEMPARAM_ID || (PSP_SYSTEMPARAM_ID = {}));
var DialogStepEnum;
(function (DialogStepEnum) {
    DialogStepEnum[DialogStepEnum["NONE"] = 0] = "NONE";
    DialogStepEnum[DialogStepEnum["INIT"] = 1] = "INIT";
    DialogStepEnum[DialogStepEnum["PROCESSING"] = 2] = "PROCESSING";
    DialogStepEnum[DialogStepEnum["SUCCESS"] = 3] = "SUCCESS";
    DialogStepEnum[DialogStepEnum["SHUTDOWN"] = 4] = "SHUTDOWN";
})(DialogStepEnum || (DialogStepEnum = {}));
/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_ADHOC_CHANNEL
/// </summary>
var PSP_SYSTEMPARAM_ADHOC_CHANNEL;
(function (PSP_SYSTEMPARAM_ADHOC_CHANNEL) {
    PSP_SYSTEMPARAM_ADHOC_CHANNEL[PSP_SYSTEMPARAM_ADHOC_CHANNEL["AUTOMATIC"] = 0] = "AUTOMATIC";
    PSP_SYSTEMPARAM_ADHOC_CHANNEL[PSP_SYSTEMPARAM_ADHOC_CHANNEL["C1"] = 1] = "C1";
    PSP_SYSTEMPARAM_ADHOC_CHANNEL[PSP_SYSTEMPARAM_ADHOC_CHANNEL["C6"] = 6] = "C6";
    PSP_SYSTEMPARAM_ADHOC_CHANNEL[PSP_SYSTEMPARAM_ADHOC_CHANNEL["C11"] = 11] = "C11";
})(PSP_SYSTEMPARAM_ADHOC_CHANNEL || (PSP_SYSTEMPARAM_ADHOC_CHANNEL = {}));
/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_WLAN_POWERSAVE
/// </summary>
var PSP_SYSTEMPARAM_WLAN_POWERSAVE;
(function (PSP_SYSTEMPARAM_WLAN_POWERSAVE) {
    PSP_SYSTEMPARAM_WLAN_POWERSAVE[PSP_SYSTEMPARAM_WLAN_POWERSAVE["OFF"] = 0] = "OFF";
    PSP_SYSTEMPARAM_WLAN_POWERSAVE[PSP_SYSTEMPARAM_WLAN_POWERSAVE["ON"] = 1] = "ON";
})(PSP_SYSTEMPARAM_WLAN_POWERSAVE || (PSP_SYSTEMPARAM_WLAN_POWERSAVE = {}));
/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_DATE_FORMAT
/// </summary>
var PSP_SYSTEMPARAM_DATE_FORMAT;
(function (PSP_SYSTEMPARAM_DATE_FORMAT) {
    PSP_SYSTEMPARAM_DATE_FORMAT[PSP_SYSTEMPARAM_DATE_FORMAT["YYYYMMDD"] = 0] = "YYYYMMDD";
    PSP_SYSTEMPARAM_DATE_FORMAT[PSP_SYSTEMPARAM_DATE_FORMAT["MMDDYYYY"] = 1] = "MMDDYYYY";
    PSP_SYSTEMPARAM_DATE_FORMAT[PSP_SYSTEMPARAM_DATE_FORMAT["DDMMYYYY"] = 2] = "DDMMYYYY";
})(PSP_SYSTEMPARAM_DATE_FORMAT || (PSP_SYSTEMPARAM_DATE_FORMAT = {}));
/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_TIME_FORMAT
/// </summary>
var PSP_SYSTEMPARAM_TIME_FORMAT;
(function (PSP_SYSTEMPARAM_TIME_FORMAT) {
    PSP_SYSTEMPARAM_TIME_FORMAT[PSP_SYSTEMPARAM_TIME_FORMAT["_24HR"] = 0] = "_24HR";
    PSP_SYSTEMPARAM_TIME_FORMAT[PSP_SYSTEMPARAM_TIME_FORMAT["_12HR"] = 1] = "_12HR";
})(PSP_SYSTEMPARAM_TIME_FORMAT || (PSP_SYSTEMPARAM_TIME_FORMAT = {}));
/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_DAYLIGHTSAVINGS
/// </summary>
var PSP_SYSTEMPARAM_DAYLIGHTSAVINGS;
(function (PSP_SYSTEMPARAM_DAYLIGHTSAVINGS) {
    PSP_SYSTEMPARAM_DAYLIGHTSAVINGS[PSP_SYSTEMPARAM_DAYLIGHTSAVINGS["STD"] = 0] = "STD";
    PSP_SYSTEMPARAM_DAYLIGHTSAVINGS[PSP_SYSTEMPARAM_DAYLIGHTSAVINGS["SAVING"] = 1] = "SAVING";
})(PSP_SYSTEMPARAM_DAYLIGHTSAVINGS || (PSP_SYSTEMPARAM_DAYLIGHTSAVINGS = {}));
/// <summary>
/// Valid values for PSP_SYSTEMPARAM_ID_INT_LANGUAGE
/// </summary>
var PSP_SYSTEMPARAM_LANGUAGE;
(function (PSP_SYSTEMPARAM_LANGUAGE) {
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["JAPANESE"] = 0] = "JAPANESE";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["ENGLISH"] = 1] = "ENGLISH";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["FRENCH"] = 2] = "FRENCH";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["SPANISH"] = 3] = "SPANISH";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["GERMAN"] = 4] = "GERMAN";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["ITALIAN"] = 5] = "ITALIAN";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["DUTCH"] = 6] = "DUTCH";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["PORTUGUESE"] = 7] = "PORTUGUESE";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["RUSSIAN"] = 8] = "RUSSIAN";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["KOREAN"] = 9] = "KOREAN";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["CHINESE_TRADITIONAL"] = 10] = "CHINESE_TRADITIONAL";
    PSP_SYSTEMPARAM_LANGUAGE[PSP_SYSTEMPARAM_LANGUAGE["CHINESE_SIMPLIFIED"] = 11] = "CHINESE_SIMPLIFIED";
})(PSP_SYSTEMPARAM_LANGUAGE || (PSP_SYSTEMPARAM_LANGUAGE = {}));
/// <summary>
/// #9 seems to be Region or maybe X/O button swap.
/// It doesn't exist on JAP v1.0
/// is 1 on NA v1.5s
/// is 0 on JAP v1.5s
/// is read-only
/// </summary>
var PSP_SYSTEMPARAM_BUTTON_PREFERENCE;
(function (PSP_SYSTEMPARAM_BUTTON_PREFERENCE) {
    PSP_SYSTEMPARAM_BUTTON_PREFERENCE[PSP_SYSTEMPARAM_BUTTON_PREFERENCE["JAP"] = 0] = "JAP";
    PSP_SYSTEMPARAM_BUTTON_PREFERENCE[PSP_SYSTEMPARAM_BUTTON_PREFERENCE["NA"] = 1] = "NA";
})(PSP_SYSTEMPARAM_BUTTON_PREFERENCE || (PSP_SYSTEMPARAM_BUTTON_PREFERENCE = {}));
var PspModule;
(function (PspModule) {
    PspModule[PspModule["PSP_MODULE_NET_COMMON"] = 0x0100] = "PSP_MODULE_NET_COMMON";
    PspModule[PspModule["PSP_MODULE_NET_ADHOC"] = 0x0101] = "PSP_MODULE_NET_ADHOC";
    PspModule[PspModule["PSP_MODULE_NET_INET"] = 0x0102] = "PSP_MODULE_NET_INET";
    PspModule[PspModule["PSP_MODULE_NET_PARSEURI"] = 0x0103] = "PSP_MODULE_NET_PARSEURI";
    PspModule[PspModule["PSP_MODULE_NET_PARSEHTTP"] = 0x0104] = "PSP_MODULE_NET_PARSEHTTP";
    PspModule[PspModule["PSP_MODULE_NET_HTTP"] = 0x0105] = "PSP_MODULE_NET_HTTP";
    PspModule[PspModule["PSP_MODULE_NET_SSL"] = 0x0106] = "PSP_MODULE_NET_SSL";
    // USB Modules
    PspModule[PspModule["PSP_MODULE_USB_PSPCM"] = 0x0200] = "PSP_MODULE_USB_PSPCM";
    PspModule[PspModule["PSP_MODULE_USB_MIC"] = 0x0201] = "PSP_MODULE_USB_MIC";
    PspModule[PspModule["PSP_MODULE_USB_CAM"] = 0x0202] = "PSP_MODULE_USB_CAM";
    PspModule[PspModule["PSP_MODULE_USB_GPS"] = 0x0203] = "PSP_MODULE_USB_GPS";
    // Audio/video Modules
    PspModule[PspModule["PSP_MODULE_AV_AVCODEC"] = 0x0300] = "PSP_MODULE_AV_AVCODEC";
    PspModule[PspModule["PSP_MODULE_AV_SASCORE"] = 0x0301] = "PSP_MODULE_AV_SASCORE";
    PspModule[PspModule["PSP_MODULE_AV_ATRAC3PLUS"] = 0x0302] = "PSP_MODULE_AV_ATRAC3PLUS";
    PspModule[PspModule["PSP_MODULE_AV_MPEGBASE"] = 0x0303] = "PSP_MODULE_AV_MPEGBASE";
    PspModule[PspModule["PSP_MODULE_AV_MP3"] = 0x0304] = "PSP_MODULE_AV_MP3";
    PspModule[PspModule["PSP_MODULE_AV_VAUDIO"] = 0x0305] = "PSP_MODULE_AV_VAUDIO";
    PspModule[PspModule["PSP_MODULE_AV_AAC"] = 0x0306] = "PSP_MODULE_AV_AAC";
    PspModule[PspModule["PSP_MODULE_AV_G729"] = 0x0307] = "PSP_MODULE_AV_G729";
    // NP
    PspModule[PspModule["PSP_MODULE_NP_COMMON"] = 0x0400] = "PSP_MODULE_NP_COMMON";
    PspModule[PspModule["PSP_MODULE_NP_SERVICE"] = 0x0401] = "PSP_MODULE_NP_SERVICE";
    PspModule[PspModule["PSP_MODULE_NP_MATCHING2"] = 0x0402] = "PSP_MODULE_NP_MATCHING2";
    PspModule[PspModule["PSP_MODULE_NP_DRM"] = 0x0500] = "PSP_MODULE_NP_DRM";
    // IrDA
    PspModule[PspModule["PSP_MODULE_IRDA"] = 0x0600] = "PSP_MODULE_IRDA";
})(PspModule || (PspModule = {}));
var PspUtilityDialogCommon = (function () {
    function PspUtilityDialogCommon() {
        this.size = 0; // 0000 - Size of the structure
        this.language = 3 /* SPANISH */; // 0004 - Language
        this.buttonSwap = 0; // 0008 - Set to 1 for X/O button swap
        this.graphicsThread = 0; // 000C - Graphics thread priority
        this.accessThread = 0; // 0010 - Access/fileio thread priority (SceJobThread)
        this.fontThread = 0; // 0014 - Font thread priority (ScePafThread)
        this.soundThread = 0; // 0018 - Sound thread priority
        this.result = 0 /* ERROR_OK */; // 001C - Result
        this.reserved = [0, 0, 0, 0]; // 0020 - Set to 0
    }
    PspUtilityDialogCommon.struct = StructClass.create(PspUtilityDialogCommon, [
        { size: Int32 },
        { language: Int32 },
        { buttonSwap: Int32 },
        { graphicsThread: Int32 },
        { accessThread: Int32 },
        { fontThread: Int32 },
        { soundThread: Int32 },
        { result: Int32 },
        { reserved: StructArray(Int32, 4) },
    ]);
    return PspUtilityDialogCommon;
})();
var PspUtilitySavedataMode;
(function (PspUtilitySavedataMode) {
    PspUtilitySavedataMode[PspUtilitySavedataMode["Autoload"] = 0] = "Autoload";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Autosave"] = 1] = "Autosave";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Load"] = 2] = "Load";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Save"] = 3] = "Save";
    PspUtilitySavedataMode[PspUtilitySavedataMode["ListLoad"] = 4] = "ListLoad";
    PspUtilitySavedataMode[PspUtilitySavedataMode["ListSave"] = 5] = "ListSave";
    PspUtilitySavedataMode[PspUtilitySavedataMode["ListDelete"] = 6] = "ListDelete";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Delete"] = 7] = "Delete";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Sizes"] = 8] = "Sizes";
    PspUtilitySavedataMode[PspUtilitySavedataMode["AutoDelete"] = 9] = "AutoDelete";
    PspUtilitySavedataMode[PspUtilitySavedataMode["SingleDelete"] = 10] = "SingleDelete";
    PspUtilitySavedataMode[PspUtilitySavedataMode["List"] = 11] = "List";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Files"] = 12] = "Files";
    PspUtilitySavedataMode[PspUtilitySavedataMode["MakeDataSecure"] = 13] = "MakeDataSecure";
    PspUtilitySavedataMode[PspUtilitySavedataMode["MakeData"] = 14] = "MakeData";
    PspUtilitySavedataMode[PspUtilitySavedataMode["ReadSecure"] = 15] = "ReadSecure";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Read"] = 16] = "Read";
    PspUtilitySavedataMode[PspUtilitySavedataMode["WriteSecure"] = 17] = "WriteSecure";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Write"] = 18] = "Write";
    PspUtilitySavedataMode[PspUtilitySavedataMode["EraseSecure"] = 19] = "EraseSecure";
    PspUtilitySavedataMode[PspUtilitySavedataMode["Erase"] = 20] = "Erase";
    PspUtilitySavedataMode[PspUtilitySavedataMode["DeleteData"] = 21] = "DeleteData";
    PspUtilitySavedataMode[PspUtilitySavedataMode["GetSize"] = 22] = "GetSize";
})(PspUtilitySavedataMode || (PspUtilitySavedataMode = {}));
var PspUtilitySavedataFocus;
(function (PspUtilitySavedataFocus) {
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN"] = 0] = "PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_FIRSTLIST"] = 1] = "PSP_UTILITY_SAVEDATA_FOCUS_FIRSTLIST";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_LASTLIST"] = 2] = "PSP_UTILITY_SAVEDATA_FOCUS_LASTLIST";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_LATEST"] = 3] = "PSP_UTILITY_SAVEDATA_FOCUS_LATEST";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_OLDEST"] = 4] = "PSP_UTILITY_SAVEDATA_FOCUS_OLDEST";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN2"] = 5] = "PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN2";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN3"] = 6] = "PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN3";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_FIRSTEMPTY"] = 7] = "PSP_UTILITY_SAVEDATA_FOCUS_FIRSTEMPTY";
    PspUtilitySavedataFocus[PspUtilitySavedataFocus["PSP_UTILITY_SAVEDATA_FOCUS_LASTEMPTY"] = 8] = "PSP_UTILITY_SAVEDATA_FOCUS_LASTEMPTY";
})(PspUtilitySavedataFocus || (PspUtilitySavedataFocus = {}));
var PspUtilitySavedataFileData = (function () {
    function PspUtilitySavedataFileData() {
        this.bufferPointer = 0; // 0000 -
        this.bufferSize = 0; // 0004 -
        this.size = 0; // 0008 - why are there two sizes?
        this.unknown = 0; // 000C -
    }
    Object.defineProperty(PspUtilitySavedataFileData.prototype, "used", {
        get: function () {
            if (this.bufferPointer == 0)
                return false;
            //if (BufferSize == 0) return false;
            if (this.size == 0)
                return false;
            return true;
        },
        enumerable: true,
        configurable: true
    });
    PspUtilitySavedataFileData.struct = StructClass.create(PspUtilitySavedataFileData, [
        { bufferPointer: Int32 },
        { bufferSize: Int32 },
        { size: Int32 },
        { unknown: Int32 },
    ]);
    return PspUtilitySavedataFileData;
})();
var PspUtilitySavedataSFOParam = (function () {
    function PspUtilitySavedataSFOParam() {
        this.title = ''; // 0000 -
        this.savedataTitle = ''; // 0080 -
        this.detail = ''; // 0100 -
        this.parentalLevel = 0; // 0500 -
        this.unknown = [0, 0, 0]; // 0501 -
    }
    PspUtilitySavedataSFOParam.struct = StructClass.create(PspUtilitySavedataSFOParam, [
        { title: Stringz(0x80) },
        { savedataTitle: Stringz(0x80) },
        { detail: Stringz(0x400) },
        { parentalLevel: UInt8 },
        { unknown: StructArray(UInt8, 3) },
    ]);
    return PspUtilitySavedataSFOParam;
})();
var SceUtilitySavedataParam = (function () {
    function SceUtilitySavedataParam() {
        this.base = new PspUtilityDialogCommon(); // 0000 - PspUtilityDialogCommon
        this.mode = 0; // 0030 - 
        this.unknown1 = 0; // 0034 -
        this.overwrite = 0; // 0038 -
        this.gameName = ''; // 003C - GameName: name used from the game for saves, equal for all saves
        this.saveName = ''; // 004C - SaveName: name of the particular save, normally a number
        this.saveNameListPointer = 0; // 0060 - SaveNameList: used by multiple modes (char[20])
        this.fileName = ''; // 0064 - FileName: Name of the data file of the game for example DATA.BIN
        this.dataBufPointer = 0; // 0074 - Pointer to a buffer that will contain data file unencrypted data
        this.dataBufSize = 0; // 0078 - Size of allocated space to dataBuf
        this.dataSize = 0; // 007C -
        this.sfoParam = new PspUtilitySavedataSFOParam(); // 0080 - (504?)
        this.icon0FileData = new PspUtilitySavedataFileData(); // 0584 - (16)
        this.icon1FileData = new PspUtilitySavedataFileData(); // 0594 - (16)
        this.pic1FileData = new PspUtilitySavedataFileData(); // 05A4 - (16)
        this.snd0FileData = new PspUtilitySavedataFileData(); // 05B4 - (16)
        this.newDataPointer = 0; // 05C4 -Pointer to an PspUtilitySavedataListSaveNewData structure (PspUtilitySavedataListSaveNewData *)
        this.focus = 0 /* PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN */; // 05C8 -Initial focus for lists
        this.abortStatus = 0; // 05CC -
        this.msFreeAddr = 0; // 05D0 -
        this.msDataAddr = 0; // 05D4 -
        this.utilityDataAddr = 0; // 05D8 -
        //#if _PSP_FW_VERSION >= 200
        this.key = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 05E0 - Key: Encrypt/decrypt key for save with firmware >= 2.00
        this.secureVersion = 0; // 05F0 -
        this.multiStatus = 0; // 05F4 -
        this.idListAddr = 0; // 05F8 -
        this.fileListAddr = 0; // 05FC -
        this.sizeAddr = 0; // 0600 -
        this.unknown3 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 0604 -unknown3: ?
    }
    //#endif
    SceUtilitySavedataParam.struct = StructClass.create(SceUtilitySavedataParam, [
        { base: PspUtilityDialogCommon.struct },
        { mode: Int32 },
        { unknown1: Int32 },
        { overwrite: Int32 },
        { gameName: Stringz(16) },
        { saveName: Stringz(20) },
        { saveNameListPointer: UInt32 },
        { fileName: Stringz(16) },
        { dataBufPointer: UInt32 },
        { dataBufSize: UInt32 },
        { dataSize: UInt32 },
        { sfoParam: PspUtilitySavedataSFOParam.struct },
        { icon0FileData: PspUtilitySavedataFileData.struct },
        { icon1FileData: PspUtilitySavedataFileData.struct },
        { pic1FileData: PspUtilitySavedataFileData.struct },
        { snd0FileData: PspUtilitySavedataFileData.struct },
        { newDataPointer: UInt32 },
        { focus: UInt32 },
        { abortStatus: UInt32 },
        { msFreeAddr: UInt32 },
        { msDataAddr: UInt32 },
        { utilityDataAddr: UInt32 },
        { key: StructArray(UInt8, 16) },
        { secureVersion: UInt32 },
        { multiStatus: UInt32 },
        { idListAddr: UInt32 },
        { fileListAddr: UInt32 },
        { sizeAddr: UInt32 },
        { unknown3: StructArray(UInt8, 20 - 5) },
    ]);
    return SceUtilitySavedataParam;
})();
var SizeFreeInfo = (function () {
    function SizeFreeInfo() {
    }
    SizeFreeInfo.struct = StructClass.create(SizeFreeInfo, [
        { sectorSize: UInt32 },
        { freeSectors: UInt32 },
        { freeKb: UInt32 },
        { freeKbString: Stringz(8) },
    ]);
    return SizeFreeInfo;
})();
var SizeUsedInfo = (function () {
    function SizeUsedInfo() {
    }
    SizeUsedInfo.struct = StructClass.create(SizeUsedInfo, [
        { gameName: Stringz(16) },
        { saveName: Stringz(24) },
        { usedSectors: UInt32 },
        { usedKb: UInt32 },
        { usedKbString: Stringz(8) },
        { usedKb32: UInt32 },
        { usedKb32String: Stringz(8) },
    ]);
    return SizeUsedInfo;
})();
var SizeRequiredSpaceInfo = (function () {
    function SizeRequiredSpaceInfo() {
    }
    SizeRequiredSpaceInfo.struct = StructClass.create(SizeRequiredSpaceInfo, [
        { requiredSpaceSectors: UInt32 },
        { requiredSpaceKb: UInt32 },
        { requiredSpaceString: Stringz(8) },
        { requiredSpace32KB: UInt32 },
        { requiredSpace32KBString: Stringz(8) },
    ]);
    return SizeRequiredSpaceInfo;
})();
//# sourceMappingURL=sceUtility.js.map