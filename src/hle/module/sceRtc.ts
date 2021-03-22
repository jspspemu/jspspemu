import { SceKernelErrors } from '../SceKernelErrors';
import {Stream} from "../../global/stream";
import {EmulatorContext} from "../../emu/context";
import {nativeFunction} from "../utils";
import {ScePspDateTime} from "../structs";

export class sceRtc {
    constructor(private context: EmulatorContext) { }

	@nativeFunction(0x3F7AD767, 150, 'int', 'void*')
	sceRtcGetCurrentTick(tickPtr: Stream) {
		tickPtr.writeUInt64(ScePspDateTime.fromDate(new Date()).getTotalMicroseconds());
        return 0;
    }

	@nativeFunction(0x57726BC1, 150, 'int', 'int/int/int')
	sceRtcGetDayOfWeek(year: number, month: number, day: number) {
		return this.context.rtc.getDayOfWeek(year, month, day);
	}

	@nativeFunction(0x05EF322C, 150, 'int', 'int/int')
	sceRtcGetDaysInMonth(year: number, month: number) {
		return this.context.rtc.getDaysInMonth(year, month);
	}

	@nativeFunction(0xC41C2853, 150, 'uint', 'void*')
	sceRtcGetTickResolution(tickPtr: Stream) {
		return 1000000;
	}
	
	@nativeFunction(0x7ED29E40, 150, 'int', 'void*/void*')
	sceRtcSetTick(datePtr: Stream, ticksPtr: Stream) {
        const ticks = ticksPtr.readInt64();
        datePtr.writeStruct(ScePspDateTime.struct, ScePspDateTime.fromTicks(ticks));
		return 0;
	}

	@nativeFunction(0x6FF40ACC, 150, 'int', 'void*/void*')
	sceRtcGetTick(datePtr: Stream, ticksPtr: Stream) {
		try {
            const date = ScePspDateTime.struct.read(datePtr);
            ticksPtr.writeUInt64(date.getTotalMicroseconds());
			return 0;
		} catch (e) {
			return SceKernelErrors.ERROR_INVALID_VALUE;
		}
	}

	@nativeFunction(0x4CFA57B0, 150, 'int', 'uint/int')
	sceRtcGetCurrentClock(dateAddress: number, timezone: number) {
		//let currentDate = this.context.rtc.getCurrentUnixMicroseconds();
		//currentDate += timezone * 60 * 1000000;
		const date = new Date()
        const pointer = this.context.memory.getPointerPointer<ScePspDateTime>(ScePspDateTime.struct, dateAddress)!
		pointer.write(ScePspDateTime.fromDate(new Date()));

		return 0;
	}
}
