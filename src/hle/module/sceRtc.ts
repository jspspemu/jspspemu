﻿import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');
import _structs = require('../structs');

export class sceRtc {
    constructor(private context: _context.EmulatorContext) { }

	sceRtcGetCurrentTick = createNativeFunction(0x3F7AD767, 150, 'int', 'void*', this, (tickPtr: Stream) => {
		tickPtr.writeUInt64(_structs.ScePspDateTime.fromDate(new Date()).getTotalMicroseconds());
        return 0;
    });

	sceRtcGetDayOfWeek = createNativeFunction(0x57726BC1, 150, 'int', 'int/int/int', this, (year: number, month: number, day: number) => {
		return new Date(year, month - 1, day).getDay();
	});


	sceRtcGetDaysInMonth = createNativeFunction(0x05EF322C, 150, 'int', 'int/int', this, (year: number, month: number) => {
		return new Date(year, month, 0).getDate();
	});

	sceRtcGetTickResolution = createNativeFunction(0xC41C2853, 150, 'uint', '', this, (tickPtr: Stream) => 1000000);

	sceRtcSetTick = createNativeFunction(0x7ED29E40, 150, 'int', 'void*/void*', this, (datePtr: Stream, ticksPtr: Stream) => {
		var ticks = ticksPtr.readInt64();
		datePtr.writeStruct(_structs.ScePspDateTime.struct, _structs.ScePspDateTime.fromTicks(ticks));
		return 0;
	});

	sceRtcGetTick = createNativeFunction(0x6FF40ACC, 150, 'int', 'void*/void*', this, (datePtr: Stream, ticksPtr: Stream) => {
		try {
		var date = _structs.ScePspDateTime.struct.read(datePtr);
			ticksPtr.writeUInt64(date.getTotalMicroseconds());
			return 0;
		} catch (e) {
			return SceKernelErrors.ERROR_INVALID_VALUE;
		}
	});
}