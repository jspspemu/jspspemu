import { SceKernelErrors } from '../SceKernelErrors';
import {Stream} from "../../global/stream";
import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunctionEx, PTR, U32} from "../utils";
import {ScePspDateTime} from "../structs";

export class sceRtc {
    constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0x3F7AD767, 150)
	@I32 sceRtcGetCurrentTick(@PTR tickPtr: Stream) {
		tickPtr.writeUInt64(ScePspDateTime.fromDate(new Date()).getTotalMicroseconds());
        return 0;
    }

	@nativeFunctionEx(0x57726BC1, 150)
    @I32 sceRtcGetDayOfWeek(@I32 year: number, @I32 month: number, @I32 day: number) {
		return this.context.rtc.getDayOfWeek(year, month, day);
	}

	@nativeFunctionEx(0x05EF322C, 150)
    @I32 sceRtcGetDaysInMonth(@I32 year: number, @I32 month: number) {
		return this.context.rtc.getDaysInMonth(year, month);
	}

	@nativeFunctionEx(0xC41C2853, 150)
    @U32 sceRtcGetTickResolution(@PTR tickPtr: Stream) {
		return 1000000;
	}
	
	@nativeFunctionEx(0x7ED29E40, 150)
    @I32 sceRtcSetTick(@PTR datePtr: Stream, @PTR ticksPtr: Stream) {
        const ticks = ticksPtr.readInt64();
        datePtr.writeStruct(ScePspDateTime.struct, ScePspDateTime.fromTicks(ticks));
		return 0;
	}

	@nativeFunctionEx(0x6FF40ACC, 150)
    @I32 sceRtcGetTick(@PTR datePtr: Stream, @PTR ticksPtr: Stream) {
		try {
            const date = ScePspDateTime.struct.read(datePtr);
            ticksPtr.writeUInt64(date.getTotalMicroseconds());
			return 0;
		} catch (e) {
			return SceKernelErrors.ERROR_INVALID_VALUE;
		}
	}

	@nativeFunctionEx(0x4CFA57B0, 150)
    @I32 sceRtcGetCurrentClock(@U32 dateAddress: number, @I32 timezone: number) {
		//let currentDate = this.context.rtc.getCurrentUnixMicroseconds();
		//currentDate += timezone * 60 * 1000000;
		const date = new Date()
        const pointer = this.context.memory.getPointerPointer<ScePspDateTime>(ScePspDateTime.struct, dateAddress)!
		pointer.write(ScePspDateTime.fromDate(new Date()));

		return 0;
	}

    @nativeFunctionEx(0xE7C27D1B, 150)
    @nativeFunctionEx(0x9012B140, 660)
    @I32 sceRtcGetCurrentClockLocalTime(@U32 dateAddress: number) {
        const pointer = this.context.memory.getPointerPointer<ScePspDateTime>(ScePspDateTime.struct, dateAddress)!
        pointer.write(ScePspDateTime.fromDate(new Date()));
        return 0;
    }
}
