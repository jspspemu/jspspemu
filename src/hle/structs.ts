import {
    Int16,
    Int32,
    Int64,
    Stringz,
    Struct,
    StructArray,
    StructClass,
    StructEntry,
    StructInt16, StructInt32, StructInt64, StructMember, StructStringz, StructStructArray, StructStructStringz
} from "../global/struct";
import {Integer64} from "../global/int64";

export const enum SeekAnchor {
	Set = 0,
	Cursor = 1,
	End = 2,
}

export const enum SceMode {
}

export const enum IOFileModes {
	FormatMask = 0x0038,
	SymbolicLink = 0x0008,
	Directory = 0x0010,
	File = 0x0020,
	CanRead = 0x0004,
	CanWrite = 0x0002,
	CanExecute = 0x0001,
}

export class ScePspDateTime extends Struct {
    @StructInt16 year: number = 0;
    @StructInt16 month: number = 0;
    @StructInt16 day: number = 0;
    @StructInt16 hour: number = 0;
    @StructInt16 minute: number = 0;
    @StructInt16 second: number = 0;
    @StructInt32 microseconds: number = 0;

	static fromDate(date: Date) {
		if (!date) date = new Date();
        const pspdate = new ScePspDateTime();
		pspdate.year = date.getFullYear();
		pspdate.month = date.getMonth();
		pspdate.day = date.getDay();
		pspdate.hour = date.getHours();
		pspdate.minute = date.getMinutes();
		pspdate.second = date.getSeconds();
		pspdate.microseconds = date.getMilliseconds() * 1000;
		return pspdate;
	}

	static fromTicks(ticks: Integer64) {
		return ScePspDateTime.fromDate(new Date(ticks.getNumber()));
	}

	getTotalMicroseconds() {
		return Integer64.fromNumber(
			(Date.UTC(this.year + 1970, this.month - 1, this.day, this.hour, this.minute, this.second, this.microseconds / 1000) * 1000)// + 62135596800000000
		);
	}
}

export class SceIoStat extends Struct {
	@StructInt32 mode = <SceMode>0;
    @StructInt32 attributes = IOFileModes.File;
    @StructInt64 size = 0;
    @StructMember(ScePspDateTime.struct) timeCreation = new ScePspDateTime();
    @StructMember(ScePspDateTime.struct) timeLastAccess = new ScePspDateTime();
    @StructMember(ScePspDateTime.struct) timeLastModification = new ScePspDateTime();
	@StructStructArray(Int32, 6) deviceDependentData = [0, 0, 0, 0, 0, 0];
}

export class HleIoDirent extends Struct {
	@StructMember(SceIoStat.struct) stat = new SceIoStat();
	@StructStructStringz(256) name = '';
	@StructInt32 privateData = 0;
    @StructInt32 dummy = 0;
}

export const enum PspLanguages { // ISO-639-1
	JAPANESE = 0, // ja
	ENGLISH = 1, // en
	FRENCH = 2, // fr
	SPANISH = 3, // es
	GERMAN = 4, // de
	ITALIAN = 5, // it
	DUTCH = 6, // nl
	PORTUGUESE = 7, // pt
	RUSSIAN = 8, // ru
	KOREAN = 9, // ko
	TRADITIONAL_CHINESE = 10, // zh
	SIMPLIFIED_CHINESE = 11, // zh?
}

export const enum ButtonPreference {
	JAP = 0,
	NA = 1,
}