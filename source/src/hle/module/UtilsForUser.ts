///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import _memory = require('../../core/memory');
import Memory = _memory.Memory;
import nativeFunction = _utils.nativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class UtilsForUser {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0x91E4F6A7, 150, 'uint', '')
	sceKernelLibcClock() {
		return this.context.rtc.getClockMicroseconds();
	}

    @nativeFunction(0x27CC57F0, 150, 'uint', 'void*')
	sceKernelLibcTime(pointer: Stream) {
		//console.warn('Not implemented UtilsForUser.sceKernelLibcTime');
		if (pointer == Stream.INVALID) return 0;

		var result = (this.context.rtc.getCurrentUnixSeconds()) | 0;
		if (pointer) pointer.writeInt32(result);
		return result;
	}

	@nativeFunction(0x37FB5C42, 150, 'uint', '')
	sceKernelGetGPI() {
		return 0;
	}

	@nativeFunction(0xE860E75E, 150, 'uint', 'Memory/uint/uint')
	sceKernelUtilsMt19937Init(memory: Memory, contextPtr: number, seed: number) {
        console.warn('Not implemented UtilsForUser.sceKernelUtilsMt19937Init');
        return 0;
    }

	@nativeFunction(0x06FB8A63, 150, 'uint', 'Memory/uint')
	sceKernelUtilsMt19937UInt(memory: Memory, contextPtr: number) {
        return Math.round(Math.random() * 0xFFFFFFFF);
    }

    @nativeFunction(0x71EC4271, 150, 'uint', 'void*/void*')
	sceKernelLibcGettimeofday(timevalPtr: Stream, timezonePtr: Stream) {
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
	}

	@nativeFunction(0x34B9FA9E, 150, 'uint', 'uint/uint')
	sceKernelDcacheWritebackInvalidateRange(pointer: number, size: number) {
		//console.log('sceKernelDcacheWritebackInvalidateRange');
		if (size > 0x7FFFFFFF) return SceKernelErrors.ERROR_INVALID_SIZE;
		if (pointer >= 0x80000000) return SceKernelErrors.ERROR_INVALID_POINTER;
		this.context.memory.invalidateDataRange.dispatch({ start: pointer, end : pointer + size });
		return 0;
	}

	@nativeFunction(0x3EE30821, 150, 'uint', 'uint/uint')
	sceKernelDcacheWritebackRange(pointer: number, size: number) {
		//console.log('sceKernelDcacheWritebackRange');
		if (size > 0x7FFFFFFF) return SceKernelErrors.ERROR_INVALID_SIZE;
		if (pointer >= 0x80000000) return SceKernelErrors.ERROR_INVALID_POINTER;
		this.context.memory.invalidateDataRange.dispatch({ start: pointer, end: pointer + size });
		return 0;
	}

	@nativeFunction(0x79D1C3FA, 150, 'uint', '')
	sceKernelDcacheWritebackAll() {
		//console.log('sceKernelDcacheWritebackAll');
		this.context.memory.invalidateDataAll.dispatch();
		return 0;
	}

	@nativeFunction(0xBFA98062, 150, 'uint', 'uint/uint')
	sceKernelDcacheInvalidateRange(pointer: number, size: number) {
		//console.log('sceKernelDcacheInvalidateRange');
		if (!MathUtils.isAlignedTo(size, 4)) return SceKernelErrors.ERROR_KERNEL_NOT_CACHE_ALIGNED;
		//if (!this.context.memory.isValidAddress(pointer + size)) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ADDR;
		if (size > 0x7FFFFFFF) return SceKernelErrors.ERROR_INVALID_SIZE;
		if (pointer >= 0x80000000) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ADDR;
		if (!MathUtils.isAlignedTo(pointer, 4)) return SceKernelErrors.ERROR_KERNEL_NOT_CACHE_ALIGNED;
		this.context.memory.invalidateDataRange.dispatch({ start: pointer, end: pointer + size });
		return 0;
	}
		
	@nativeFunction(0xB435DEC5, 150, 'uint', '')
	sceKernelDcacheWritebackInvalidateAll() {
		//console.log('sceKernelDcacheWritebackInvalidateAll');
		this.context.memory.invalidateDataAll.dispatch();
		return 0;
	}

	@nativeFunction(0x6AD345D7, 150, 'uint', 'int')
	sceKernelSetGPO(value: number) {
		return 0;
	}
}
