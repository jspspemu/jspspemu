import { SceKernelErrors } from '../SceKernelErrors';

import {PromiseFast} from "../../global/utils";
import {Stream} from "../../global/stream";
import {
    Int32,
    Struct,
    StructInt32, StructMember,
    StructStructArray, StructStructStringz, StructStructUtf8Stringz, StructUInt32, StructUInt8,
    UInt8
} from "../../global/struct";
import {MathUtils, parseIntFormat} from "../../global/math";
import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunctionEx, PTR, U32} from "../utils";
import {FileOpenFlags} from "../vfs/vfs";
import {EmulatorUI} from "../../ui/emulator_ui";
import {PspLanguages} from "../structs";

export class sceUtility {
	constructor(private context: EmulatorContext) { }

	private currentStep: DialogStepEnum = DialogStepEnum.NONE;

	@nativeFunctionEx(0x2A2B3DE0, 150)
	@U32 sceUtilityLoadModule(@I32 pspModule: PspModule) {
		console.warn("Not implemented sceUtilityLoadModule '" + pspModule + "'");
		return PromiseFast.resolve(0);
	}

	@nativeFunctionEx(0x50C4CD57, 150)
    @U32 async sceUtilitySavedataInitStart(@PTR paramsPtr: Stream) {
        const result = await this._sceUtilitySavedataInitStart(paramsPtr.clone())
        const params = SceUtilitySavedataParam.struct.read(paramsPtr.clone());
        params.base.result = result;
        return 0;
	}

	async _sceUtilitySavedataInitStart(paramsPtr: Stream) {
		console.error('sceUtilitySavedataInitStart');
        const params = SceUtilitySavedataParam.struct.createProxy(paramsPtr);

        const func = (async () => {
            const fileManager = this.context.fileManager;
            const savePathFolder = "ms0:/PSP/SAVEDATA/" + params.gameName + params.saveName;
            const saveDataBin = savePathFolder + "/DATA.BIN";
            const saveIcon0 = savePathFolder + "/ICON0.PNG";
            const savePic1 = savePathFolder + "/PIC1.PNG";

            this.currentStep = DialogStepEnum.SUCCESS;

			//debugger;
			console.info('mode:', PspUtilitySavedataMode[params.mode]);
			switch (params.mode) {
				case PspUtilitySavedataMode.Autoload:
				case PspUtilitySavedataMode.Load:
				case PspUtilitySavedataMode.ListLoad: {
				    try {
                        const file = await fileManager.openAsync(saveDataBin, FileOpenFlags.Read, parseIntFormat('0777'))
                        const data = await file.entry.readAllAsync()
                        console.info('readed:', data.byteLength);
                        params.dataSize = data.byteLength;
                        this.context.memory.writeBytes(params.dataBufPointer, data);
                        return 0;
                    } catch (error) {
                        console.info("can't read file:", saveDataBin, error);
                        return SceKernelErrors.ERROR_SAVEDATA_LOAD_NO_DATA;
                    }
                }
				case PspUtilitySavedataMode.Autosave:
				case PspUtilitySavedataMode.Save:
				case PspUtilitySavedataMode.ListSave:
                {
                    try {
                        const data = this.context.memory.readArrayBuffer(params.dataBufPointer, params.dataSize);
                        const file = await fileManager.openAsync(saveDataBin, FileOpenFlags.Create | FileOpenFlags.Truncate | FileOpenFlags.Write, parseIntFormat('0777'))
                        const written = file.entry.writeAllAsync(data)
                        return 0
                    } catch (e) {
                        return SceKernelErrors.ERROR_SAVEDATA_SAVE_ACCESS_ERROR;
                    }
                }
				case PspUtilitySavedataMode.Read:
				case PspUtilitySavedataMode.ReadSecure: {
                    console.error("Not Implemented: sceUtilitySavedataInitStart.Read");
                    return 0
                }
				case PspUtilitySavedataMode.Sizes: {
                    const SceKernelError = SceKernelErrors.ERROR_OK;

                    //Console.Error.WriteLine("Not Implemented: sceUtilitySavedataInitStart.Sizes");

                    const SectorSize = 1024;
                    const FreeSize = 32 * 1024 * 1024; // 32 MB
                    const UsedSize = 0;

                    // MS free size.
                    // Gets the ammount of free space in the Memory Stick. If null,
                    // the size is ignored and no error is returned.
                    {
                        const sizeFreeInfoPtr = this.context.memory.getPointerPointer<SizeFreeInfo>(SizeFreeInfo.struct, params.msFreeAddr)!
                        sizeFreeInfoPtr.readWrite(sizeFreeInfo => {
                            sizeFreeInfo.sectorSize = SectorSize;
                            sizeFreeInfo.freeSectors = FreeSize / SectorSize;
                            sizeFreeInfo.freeKb = FreeSize / 1024;
                            sizeFreeInfo.freeKbString = sizeFreeInfo.freeKb + 'KB';
                        });
                    }

                    // MS data size.
                    // Gets the size of the data already saved in the Memory Stick.
                    // If null, the size is ignored and no error is returned.
                    {
                        const sizeUsedInfoPtr = this.context.memory.getPointerPointer<SizeUsedInfo>(SizeUsedInfo.struct, params.msDataAddr);
                    }

                    // Utility data size.
                    // Gets the size of the data to be saved in the Memory Stick.
                    // If null, the size is ignored and no error is returned.
                    {
                        const sizeRequiredSpaceInfoPtr = this.context.memory.getPointerPointer<SizeRequiredSpaceInfo>(SizeRequiredSpaceInfo.struct, params.utilityDataAddr);

                        if (sizeRequiredSpaceInfoPtr != null) {
                            let RequiredSize = 0;
                            RequiredSize += params.icon0FileData.size;
                            RequiredSize += params.icon1FileData.size;
                            RequiredSize += params.pic1FileData.size;
                            RequiredSize += params.snd0FileData.size;
                            RequiredSize += params.dataSize;

                            sizeRequiredSpaceInfoPtr.readWrite(sizeRequiredSpaceInfo => {
                                sizeRequiredSpaceInfo.requiredSpaceSectors = MathUtils.requiredBlocks(RequiredSize, SectorSize);
                                sizeRequiredSpaceInfo.requiredSpaceKb = MathUtils.requiredBlocks(RequiredSize, 1024);
                                sizeRequiredSpaceInfo.requiredSpace32KB = MathUtils.requiredBlocks(RequiredSize, 32 * 1024);

                                sizeRequiredSpaceInfo.requiredSpaceString = (sizeRequiredSpaceInfo.requiredSpaceKb) + "KB";
                                sizeRequiredSpaceInfo.requiredSpace32KBString = (sizeRequiredSpaceInfo.requiredSpace32KB) + "KB";
                            });
                        }
                    }

                    if (SceKernelError != SceKernelErrors.ERROR_OK) return PromiseFast.resolve(SceKernelError);
                    break;
                }
				default: {
                    console.error(`Not implemented ${params.mode}: ${PspUtilitySavedataMode[params.mode]}`);
                    break;
                }
			}
			return PromiseFast.resolve(0);
		})
        const result = await func()
        try {
            console.error('result: ', result);
            params.base.result = result as number;
            return 0;
        } catch (e) {
			console.error(e);
			return 0;
		}
	}

	@nativeFunctionEx(0x9790B33C, 150)
    @U32 sceUtilitySavedataShutdownStart() {
		//console.log('sceUtilitySavedataShutdownStart');
		//debugger;
		this.currentStep = DialogStepEnum.SHUTDOWN;
		return 0;
	}

	@nativeFunctionEx(0x8874DBE0, 150)
    @U32 sceUtilitySavedataGetStatus() {
		//console.log('sceUtilitySavedataGetStatus');
		//debugger;
		try {
			return this.currentStep;
		} finally {
			if (this.currentStep == DialogStepEnum.SHUTDOWN) this.currentStep = DialogStepEnum.NONE;
		}
	}

	@nativeFunctionEx(0x2AD8E239, 150)
    @U32 async sceUtilityMsgDialogInitStart(@PTR paramsPtr: Stream) {
		// @TODO: should not stop
		let params = PspUtilityMsgDialogParams.struct.createProxy(paramsPtr);
		console.warn('sceUtilityMsgDialogInitStart:', params.message);
        await EmulatorUI.openMessageAsync(params.message)
        params.buttonPressed = PspUtilityMsgDialogPressed.PSP_UTILITY_MSGDIALOG_RESULT_YES;
        this.currentStep = DialogStepEnum.SUCCESS;
        return 0;
	}

	@nativeFunctionEx(0x9A1C91D7, 150)
    @U32 sceUtilityMsgDialogGetStatus() {
		try {
			return this.currentStep;
		} finally {
			if (this.currentStep == DialogStepEnum.SHUTDOWN) this.currentStep = DialogStepEnum.NONE;
		}
	}

	@nativeFunctionEx(0x9A1C91D7, 150)
    @U32 sceUtilityMsgDialogUpdate(@I32 value: number) {
	}

	@nativeFunctionEx(0x1579A159, 150)
    @U32 sceUtilityLoadNetModule() {
		console.warn('Not implemented sceUtilityLoadNetModule');
		return 0;
	}

	private _getKey(id: PSP_SYSTEMPARAM_ID): any {
		switch (id) {
			case PSP_SYSTEMPARAM_ID.INT_ADHOC_CHANNEL: return PSP_SYSTEMPARAM_ADHOC_CHANNEL.AUTOMATIC;
			case PSP_SYSTEMPARAM_ID.INT_WLAN_POWERSAVE: return PSP_SYSTEMPARAM_WLAN_POWERSAVE.ON;
			case PSP_SYSTEMPARAM_ID.INT_DATE_FORMAT: return PSP_SYSTEMPARAM_DATE_FORMAT.YYYYMMDD;
			case PSP_SYSTEMPARAM_ID.INT_TIME_FORMAT: return PSP_SYSTEMPARAM_TIME_FORMAT._24HR;
			case PSP_SYSTEMPARAM_ID.INT_TIMEZONE: return -5 * 60;
			case PSP_SYSTEMPARAM_ID.INT_DAYLIGHTSAVINGS: return PSP_SYSTEMPARAM_DAYLIGHTSAVINGS.STD;
			case PSP_SYSTEMPARAM_ID.INT_LANGUAGE: return this.context.config.language;
			case PSP_SYSTEMPARAM_ID.INT_BUTTON_PREFERENCE: return PSP_SYSTEMPARAM_BUTTON_PREFERENCE.NA;
			case PSP_SYSTEMPARAM_ID.STRING_NICKNAME: return "USERNAME";
		}
		throw (new Error("Invalid key " + id));
	}

	@nativeFunctionEx(0xA5DA2406, 150)
    @U32 sceUtilityGetSystemParamInt(@I32 id: PSP_SYSTEMPARAM_ID, @PTR valuePtr: Stream) {
		//console.warn("Not implemented sceUtilityGetSystemParamInt", id, PSP_SYSTEMPARAM_ID[id]);
        const value = parseInt(this._getKey(id));
        if (valuePtr) valuePtr.writeInt32(value);
		return 0;
	}

	@nativeFunctionEx(0x34B78343, 150)
    @U32 sceUtilityGetSystemParamString(@I32 id: PSP_SYSTEMPARAM_ID, @PTR strPtr: Stream, @I32 len: number) {
        let value = String(this._getKey(id));
        value = value.substr(0, Math.min(value.length, len - 1));
		if (strPtr) strPtr.writeStringz(value);
		return 0;
	}

	@nativeFunctionEx(0xC629AF26, 150)
    @U32 sceUtilityLoadAvModule(@I32 id: number) {
		return 0;
	}
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

enum PspUtilityMsgDialogMode {
	PSP_UTILITY_MSGDIALOG_MODE_ERROR = 0, // Error message
	PSP_UTILITY_MSGDIALOG_MODE_TEXT = 1, // String message
}

enum PspUtilityMsgDialogOption {
	PSP_UTILITY_MSGDIALOG_OPTION_ERROR = 0x00000000, // Error message (why two flags?)
	PSP_UTILITY_MSGDIALOG_OPTION_TEXT = 0x00000001, // Text message (why two flags?)
	PSP_UTILITY_MSGDIALOG_OPTION_YESNO_BUTTONS = 0x00000010, // Yes/No buttons instead of 'Cancel'
	PSP_UTILITY_MSGDIALOG_OPTION_DEFAULT_NO = 0x00000100, // Default position 'No', if not set will default to 'Yes'
}

enum PspUtilityMsgDialogPressed {
	PSP_UTILITY_MSGDIALOG_RESULT_UNKNOWN1 = 0,
	PSP_UTILITY_MSGDIALOG_RESULT_YES = 1,
	PSP_UTILITY_MSGDIALOG_RESULT_NO = 2,
	PSP_UTILITY_MSGDIALOG_RESULT_BACK = 3,
}

class PspUtilityDialogCommon extends Struct {
	@StructInt32 size = 0; // 0000 - Size of the structure
	@StructInt32 language = PspLanguages.SPANISH; // 0004 - Language
	@StructInt32 buttonSwap = 0; // 0008 - Set to 1 for X/O button swap
	@StructInt32 graphicsThread = 0; // 000C - Graphics thread priority
	@StructInt32 accessThread = 0; // 0010 - Access/fileio thread priority (SceJobThread)
	@StructInt32 fontThread = 0; // 0014 - Font thread priority (ScePafThread)
	@StructInt32 soundThread = 0; // 0018 - Sound thread priority
	@StructInt32 result = SceKernelErrors.ERROR_OK; // 001C - Result
	@StructStructArray<number>(Int32, 4) reserved = [0, 0, 0, 0]; // 0020 - Set to 0
}

enum PspUtilitySavedataMode {
	Autoload = 0, // PSP_UTILITY_SAVEDATA_AUTOLOAD = 0
	Autosave = 1, // PSP_UTILITY_SAVEDATA_AUTOSAVE = 1
	Load = 2, // PSP_UTILITY_SAVEDATA_LOAD = 2
	Save = 3, // PSP_UTILITY_SAVEDATA_SAVE = 3
	ListLoad = 4, // PSP_UTILITY_SAVEDATA_LISTLOAD = 4
	ListSave = 5, // PSP_UTILITY_SAVEDATA_LISTSAVE = 5 
	ListDelete = 6, // PSP_UTILITY_SAVEDATA_LISTDELETE = 6
	Delete = 7, // PSP_UTILITY_SAVEDATA_DELETE = 7
	Sizes = 8, // PSP_UTILITY_SAVEDATA_SIZES = 8
	AutoDelete = 9, // PSP_UTILITY_SAVEDATA_AUTODELETE = 9
	SingleDelete = 10, // PSP_UTILITY_SAVEDATA_SINGLEDELETE = 10 = 0x0A
	List = 11, // PSP_UTILITY_SAVEDATA_LIST = 11 = 0x0B
	Files = 12, // PSP_UTILITY_SAVEDATA_FILES = 12 = 0x0C
	MakeDataSecure = 13, // PSP_UTILITY_SAVEDATA_MAKEDATASECURE = 13 = 0x0D
	MakeData = 14, // PSP_UTILITY_SAVEDATA_MAKEDATA = 14 = 0x0E
	ReadSecure = 15, // PSP_UTILITY_SAVEDATA_READSECURE = 15 = 0x0F
	Read = 16, // PSP_UTILITY_SAVEDATA_READ = 16 = 0x10
	WriteSecure = 17, // PSP_UTILITY_SAVEDATA_WRITESECURE = 17 = 0x11
	Write = 18, // PSP_UTILITY_SAVEDATA_WRITE = 18 = 0x12
	EraseSecure = 19, // PSP_UTILITY_SAVEDATA_ERASESECURE = 19 = 0x13
	Erase = 20, // PSP_UTILITY_SAVEDATA_ERASE = 20 = 0x14
	DeleteData = 21, // PSP_UTILITY_SAVEDATA_DELETEDATA = 21 = 0x15
	GetSize = 22, // PSP_UTILITY_SAVEDATA_GETSIZE = 22 = 0x16
}

enum PspUtilitySavedataFocus {
	PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN = 0, // 
	PSP_UTILITY_SAVEDATA_FOCUS_FIRSTLIST = 1, // First in list
	PSP_UTILITY_SAVEDATA_FOCUS_LASTLIST = 2, // Last in list
	PSP_UTILITY_SAVEDATA_FOCUS_LATEST = 3, // Most recent date
	PSP_UTILITY_SAVEDATA_FOCUS_OLDEST = 4, // Oldest date
	PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN2 = 5, //
	PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN3 = 6, //
	PSP_UTILITY_SAVEDATA_FOCUS_FIRSTEMPTY = 7, // First empty slot
	PSP_UTILITY_SAVEDATA_FOCUS_LASTEMPTY = 8, // Last empty slot
}

class PspUtilitySavedataFileData extends Struct {
	@StructInt32 bufferPointer = 0; // 0000 -
    @StructInt32 bufferSize = 0; // 0004 -
    @StructInt32 size = 0; // 0008 - why are there two sizes?
    @StructInt32 unknown = 0; // 000C -

	get used() {
		if (this.bufferPointer == 0) return false;
		//if (BufferSize == 0) return false;
		if (this.size == 0) return false;
		return true;
	}
}

class PspUtilitySavedataSFOParam extends Struct {
	@StructStructStringz(0x80) title = ''; // 0000 -
	@StructStructStringz(0x80) savedataTitle = ''; // 0080 -
	@StructStructStringz(0x400) detail = ''; // 0100 -
	@StructUInt8 parentalLevel = 0; // 0500 -
	@StructStructArray(UInt8, 3) unknown = [0, 0, 0]; // 0501 -
}

class SceUtilitySavedataParam extends Struct {
	@StructMember(PspUtilityDialogCommon.struct) base = new PspUtilityDialogCommon(); // 0000 - PspUtilityDialogCommon
	@StructInt32 mode = <PspUtilitySavedataMode>0; // 0030 -
	@StructInt32 unknown1 = 0; // 0034 -
	@StructInt32 overwrite = 0; // 0038 -
	@StructStructStringz(16) gameName = ''; // 003C - GameName: name used from the game for saves, equal for all saves
	@StructStructStringz(20) saveName = ''; // 004C - SaveName: name of the particular save, normally a number
	@StructUInt32 saveNameListPointer = 0; // 0060 - SaveNameList: used by multiple modes (char[20])
	@StructStructStringz(16) fileName = ''; // 0064 - FileName: Name of the data file of the game for example DATA.BIN
	@StructUInt32 dataBufPointer = 0; // 0074 - Pointer to a buffer that will contain data file unencrypted data
	@StructUInt32 dataBufSize = 0; // 0078 - Size of allocated space to dataBuf
	@StructUInt32 dataSize = 0; // 007C -
	@StructMember(PspUtilitySavedataSFOParam.struct) sfoParam = new PspUtilitySavedataSFOParam(); // 0080 - (504?)
	@StructMember(PspUtilitySavedataFileData.struct) icon0FileData = new PspUtilitySavedataFileData(); // 0584 - (16)
	@StructMember(PspUtilitySavedataFileData.struct) icon1FileData = new PspUtilitySavedataFileData(); // 0594 - (16)
	@StructMember(PspUtilitySavedataFileData.struct) pic1FileData = new PspUtilitySavedataFileData(); // 05A4 - (16)
	@StructMember(PspUtilitySavedataFileData.struct) snd0FileData = new PspUtilitySavedataFileData(); // 05B4 - (16)
	@StructUInt32 newDataPointer = 0; // 05C4 -Pointer to an PspUtilitySavedataListSaveNewData structure (PspUtilitySavedataListSaveNewData *)
	@StructUInt32 focus = PspUtilitySavedataFocus.PSP_UTILITY_SAVEDATA_FOCUS_UNKNOWN; // 05C8 -Initial focus for lists
	@StructUInt32 abortStatus = 0; // 05CC -
	@StructUInt32 msFreeAddr = 0; // 05D0 -
	@StructUInt32 msDataAddr = 0; // 05D4 -
	@StructUInt32 utilityDataAddr = 0; // 05D8 -
    @StructStructArray(UInt8, 16) key = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 05E0 - Key: Encrypt/decrypt key for save with firmware >= 2.00
	@StructUInt32 secureVersion = 0; // 05F0 -
	@StructUInt32 multiStatus = 0; // 05F4 -
	@StructUInt32 idListAddr = 0; // 05F8 -
	@StructUInt32 fileListAddr = 0; // 05FC -
	@StructUInt32 sizeAddr = 0; // 0600 -
	@StructStructArray(UInt8, 20 - 5) unknown3 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 0604 -unknown3: ?

}

class SizeFreeInfo extends Struct {
	@StructUInt32 sectorSize: number = 0
    @StructUInt32 freeSectors: number = 0
    @StructUInt32 freeKb: number = 0
    @StructStructStringz(8) freeKbString: string = ''
}

class SizeUsedInfo extends Struct {
	@StructStructStringz(16) gameName: string = '' // 16
	@StructStructStringz(24) saveName: string = '' // 20
	@StructUInt32 usedSectors: number = 0
	@StructUInt32 usedKb: number = 0
	@StructStructStringz(8) usedKbString: string = '' // 8
	@StructUInt32 usedKb32: number = 0
	@StructStructStringz(8) usedKb32String: string = '' // 8
}

class SizeRequiredSpaceInfo extends Struct {
	@StructUInt32 requiredSpaceSectors: number = 0
	@StructUInt32 requiredSpaceKb: number = 0
	@StructStructStringz(8) requiredSpaceString: string = '' // 8
	@StructUInt32 requiredSpace32KB: number = 0
	@StructStructStringz(8) requiredSpace32KBString: string = '' // 8
}

class PspUtilityMsgDialogParams extends Struct {
	// @ts-ignore
    @StructMember(PspUtilityDialogCommon.struct) base: PspUtilityDialogCommon;
	@StructInt32 unknown: number = 0 // uint
	@StructInt32 mnode: PspUtilityMsgDialogMode = PspUtilityMsgDialogMode.PSP_UTILITY_MSGDIALOG_MODE_ERROR // uint
	@StructInt32 errorValue: number = 0 // uint
	@StructStructUtf8Stringz(512) message: string = '' // byte[512]
	@StructInt32 options: PspUtilityMsgDialogOption = PspUtilityMsgDialogOption.PSP_UTILITY_MSGDIALOG_OPTION_ERROR
	@StructInt32 buttonPressed: PspUtilityMsgDialogPressed = PspUtilityMsgDialogPressed.PSP_UTILITY_MSGDIALOG_RESULT_UNKNOWN1
}