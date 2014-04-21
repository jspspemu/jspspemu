module hle {
	export enum SeekAnchor {
		Set = 0,
		Cursor = 1,
		End = 2,
	}

	export enum SceMode {
	}

	export enum IOFileModes {
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
		microsecond: number = 0;

		static fromDate(date: Date) {
			var pspdate = new ScePspDateTime();
			pspdate.year = date.getFullYear();
			pspdate.month = date.getMonth();
			pspdate.day = date.getDay();
			pspdate.hour = date.getHours();
			pspdate.minute = date.getMinutes();
			pspdate.second = date.getSeconds();
			pspdate.microsecond = date.getMilliseconds() * 1000;
			return pspdate;
		}

		static fromTicks(ticks: Integer64) {
			return new ScePspDateTime();
		}

		getTotalMicroseconds() {
			return Integer64.fromNumber(0);
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
		mode: SceMode = 0;
		attributes: IOFileModes = 0;
		size: number = 0;
		timeCreation: ScePspDateTime = new ScePspDateTime();
		timeLastAccess: ScePspDateTime = new ScePspDateTime();
		timeLastModification: ScePspDateTime = new ScePspDateTime();
		deviceDependentData: number[] = [0, 0, 0, 0, 0, 0];

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
}