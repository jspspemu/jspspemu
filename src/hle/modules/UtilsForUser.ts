module hle.modules {
    export class UtilsForUser {
        constructor(private context: EmulatorContext) { }

        sceKernelLibcTime = createNativeFunction(0x27CC57F0, 150, 'uint', '', this, () => {
            //console.warn('Not implemented UtilsForUser.sceKernelLibcTime');
            return new Date().getTime() / 1000;
        });

		sceKernelUtilsMt19937Init = createNativeFunction(0xE860E75E, 150, 'uint', 'Memory/uint/uint', this, (memory: core.Memory, contextPtr: number, seed: number) => {
            console.warn('Not implemented UtilsForUser.sceKernelUtilsMt19937Init');
            return 0;
        });

		sceKernelUtilsMt19937UInt = createNativeFunction(0x06FB8A63, 150, 'uint', 'Memory/uint', this, (memory: core.Memory, contextPtr: number) => {
            return Math.round(Math.random() * 0xFFFFFFFF);
        });

        sceKernelLibcGettimeofday = createNativeFunction(0x71EC4271, 150, 'uint', 'void*/void*', this, (timevalPtr: Stream, timezonePtr: Stream) => {
            if (timevalPtr) {
                var seconds = new Date().getSeconds();
                var microseconds = new Date().getMilliseconds() * 1000;
                timevalPtr.writeInt32(seconds);
                timevalPtr.writeInt32(microseconds);
            }

            if (timezonePtr) {
                var minutesWest = 0;
                var dstTime = 0;
                timevalPtr.writeInt32(minutesWest);
                timevalPtr.writeInt32(dstTime);
            }

            return 0;
		});

		sceKernelDcacheWritebackInvalidateRange = createNativeFunction(0x34B9FA9E, 150, 'uint', 'uint/int', this, (pointer: number, size: number) => {
			return 0;
		});

		sceKernelDcacheWritebackAll = createNativeFunction(0x79D1C3FA, 150, 'uint', '', this, () => {
			return 0;
		});
    }
}