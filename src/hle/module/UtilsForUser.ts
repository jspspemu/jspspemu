import _utils = require('../utils');
import _context = require('../../context');
import _memory = require('../../core/memory');
import Memory = _memory.Memory;
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class UtilsForUser {
	constructor(private context: _context.EmulatorContext) { }

	sceKernelLibcClock = createNativeFunction(0x91E4F6A7, 150, 'uint', '', this, () => {
		return this.context.rtc.getClockMicroseconds();
	});

    sceKernelLibcTime = createNativeFunction(0x27CC57F0, 150, 'uint', 'void*', this, (pointer: Stream) => {
		//console.warn('Not implemented UtilsForUser.sceKernelLibcTime');
		if (pointer == Stream.INVALID) return 0;

		var result = (this.context.rtc.getCurrentUnixSeconds()) | 0;
		if (pointer) pointer.writeInt32(result);
		return result;
	});

	sceKernelGetGPI = createNativeFunction(0x37FB5C42, 150, 'uint', '', this, () => {
		return 0;
	});

	sceKernelUtilsMt19937Init = createNativeFunction(0xE860E75E, 150, 'uint', 'Memory/uint/uint', this, (memory: Memory, contextPtr: number, seed: number) => {
        console.warn('Not implemented UtilsForUser.sceKernelUtilsMt19937Init');
        return 0;
    });

	sceKernelUtilsMt19937UInt = createNativeFunction(0x06FB8A63, 150, 'uint', 'Memory/uint', this, (memory: Memory, contextPtr: number) => {
        return Math.round(Math.random() * 0xFFFFFFFF);
    });

    sceKernelLibcGettimeofday = createNativeFunction(0x71EC4271, 150, 'uint', 'void*/void*', this, (timevalPtr: Stream, timezonePtr: Stream) => {
		if (timevalPtr) {
			var totalMilliseconds = Date.now();
			var totalSeconds = Math.floor(totalMilliseconds / 1000);
			var milliseconds = Math.floor(totalMilliseconds % 1000);
			var microseconds = milliseconds * 1000;
            timevalPtr.writeInt32(totalSeconds);
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

	sceKernelDcacheWritebackInvalidateRange = createNativeFunction(0x34B9FA9E, 150, 'uint', 'uint/uint', this, (pointer: number, size: number) => {
		if (size > 0x7FFFFFFF) return SceKernelErrors.ERROR_INVALID_SIZE;
		if (pointer >= 0x80000000) return SceKernelErrors.ERROR_INVALID_POINTER;
		this.context.memory.invalidateDataRange.dispatch({ start: pointer, end : pointer + size });
		return 0;
	});

	sceKernelDcacheInvalidateRange = createNativeFunction(0xBFA98062, 150, 'uint', 'uint/uint', this, (pointer: number, size: number) => {
		if (!MathUtils.isAlignedTo(size, 4)) return SceKernelErrors.ERROR_KERNEL_NOT_CACHE_ALIGNED;
		//if (!this.context.memory.isValidAddress(pointer + size)) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ADDR;
		if (size > 0x7FFFFFFF) return SceKernelErrors.ERROR_INVALID_SIZE;
		if (pointer >= 0x80000000) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ADDR;
		if (!MathUtils.isAlignedTo(pointer, 4)) return SceKernelErrors.ERROR_KERNEL_NOT_CACHE_ALIGNED;
		this.context.memory.invalidateDataRange.dispatch({ start: pointer, end: pointer + size });
		return 0;
	});
		
	sceKernelDcacheWritebackRange = createNativeFunction(0x3EE30821, 150, 'uint', 'uint/uint', this, (pointer: number, size: number) => {
		if (size > 0x7FFFFFFF) return SceKernelErrors.ERROR_INVALID_SIZE;
		if (pointer >= 0x80000000) return SceKernelErrors.ERROR_INVALID_POINTER;
		this.context.memory.invalidateDataRange.dispatch({ start: pointer, end: pointer + size });
		return 0;
	});

	sceKernelDcacheWritebackAll = createNativeFunction(0x79D1C3FA, 150, 'uint', '', this, () => {
		this.context.memory.invalidateDataRange.dispatch({ start: 0, end: 0xFFFFFFFF });
		return 0;
	});

	sceKernelDcacheWritebackInvalidateAll = createNativeFunction(0xB435DEC5, 150, 'uint', '', this, () => {
		this.context.memory.invalidateDataRange.dispatch({ start: 0, end: 0xFFFFFFFF });
		return 0;
	});
}
