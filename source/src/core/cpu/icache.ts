///<reference path="../../global.d.ts" />

import memory = require('../memory');
import generator = require('./generator');
import state = require('./state');

import Memory = memory.Memory;
import FunctionGenerator = generator.FunctionGenerator;
import CpuSpecialAddresses = state.CpuSpecialAddresses;
import CpuState = state.CpuState;

export class InstructionCache {
	functionGenerator: FunctionGenerator;
	private cache: any = {};

	constructor(public memory: Memory) {
		this.functionGenerator = new FunctionGenerator(memory);
	}

	invalidateAll() {
		this.cache = {};
	}

	invalidateRange(from: number, to: number) {
		for (var n = from; n < to; n += 4) delete this.cache[n];
	}

	getFunction(address: number) {
		var item = this.cache[address];
		if (item) return item;

		if (address == CpuSpecialAddresses.EXIT_THREAD) {
			return this.cache[address] = (state: CpuState) => {
				//console.log(state);
				//console.log(state.thread);
				//console.warn('Thread: CpuSpecialAddresses.EXIT_THREAD: ' + state.thread.name);

				state.thread.stop('CpuSpecialAddresses.EXIT_THREAD');
				throw new CpuBreakException();
			};
		} else {
			return this.cache[address] = this.functionGenerator.create(address);
		}
	}
}

 