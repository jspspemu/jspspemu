module hle.modules {
    export class sceRtc {
        constructor(private context: EmulatorContext) { }

        sceRtcGetCurrentTick = createNativeFunction(0x3F7AD767, 150, 'int', 'void*', this, (tickPtr: Stream) => {
            tickPtr.writeInt32(new Date().getTime());
            tickPtr.writeInt32(0);
            return 0;
        });

		sceRtcGetDayOfWeek = createNativeFunction(0x57726BC1, 150, 'int', 'int/int/int', this, (year: number, month: number, day: number) => {
			return new Date(year, month, day).getDay();
		});


		sceRtcGetDaysInMonth = createNativeFunction(0x05EF322C, 150, 'int', 'int/int', this, (year: number, month: number) => {
			return new Date(year, month, 0).getDate();
		});

		sceRtcGetTickResolution = createNativeFunction(0xC41C2853, 150, 'uint', '', this, (tickPtr: Stream) => 1000000);

		sceRtcSetTick = createNativeFunction(0x7ED29E40, 150, 'int', 'void*/void*', this, (date:Stream, ticks:Stream) => {
			throw (new TypeError("Not implemented sceRtcSetTick"));
		});

		sceRtcGetTick = createNativeFunction(0x6FF40ACC, 150, 'int', 'void*/void*', this, (date: Stream, ticks: Stream) => {
			throw (new TypeError("Not implemented sceRtcGetTick"));
		});
    }
}
