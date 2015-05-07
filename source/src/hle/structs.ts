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

export class ScePspDateTime {
	year: number = 0;
	month: number = 0;
	day: number = 0;
	hour: number = 0;
	minute: number = 0;
	second: number = 0;
	microseconds: number = 0;

	static fromDate(date: Date) {
		if (!date) date = new Date();
		var pspdate = new ScePspDateTime();
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

	static struct = StructClass.create<ScePspDateTime>(ScePspDateTime, [
		{ year: Int16 },
		{ month: Int16 },
		{ day: Int16 },
		{ hour: Int16 },
		{ minute: Int16 },
		{ second: Int16 },
		{ microsecond: Int32 },
	]);
}

export class SceIoStat {
	mode = <SceMode>0;
	attributes = IOFileModes.File;
	size = 0;
	timeCreation = new ScePspDateTime();
	timeLastAccess = new ScePspDateTime();
	timeLastModification = new ScePspDateTime();
	deviceDependentData = [0, 0, 0, 0, 0, 0];

	static struct = StructClass.create<SceIoStat>(SceIoStat, <StructEntry[]>[
		{ mode: Int32 },
		{ attributes: Int32 },
		{ size: Int64 },
		{ timeCreation: ScePspDateTime.struct },
		{ timeLastAccess: ScePspDateTime.struct },
		{ timeLastModification: ScePspDateTime.struct },
		{ deviceDependentData: StructArray(Int32, 6) },
	]);
}

export class HleIoDirent {
	stat = new SceIoStat();
	name = '';
	privateData = 0;
	dummy = 0;

	static struct = StructClass.create<HleIoDirent>(HleIoDirent, <StructEntry[]>[
		{ stat: SceIoStat.struct },
		{ name: Stringz(256) },
		{ privateData: Int32 },
		{ dummy: Int32 },
	]);
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