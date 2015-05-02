///<reference path="../../global.d.ts" />

import _thread = require('./thread');
import _cpu = require('../../core/cpu'); _cpu.CpuState;

import CpuState = _cpu.CpuState;

export class Interop {
	execute(state: CpuState, address: number, gprArray: number[]) {
		state.preserveRegisters(() => {
			state.setRA(0x1234);
			for (var n = 0; n < gprArray.length; n++) {
				state.gpr[4 + n] = gprArray[n];
			}
			state.getFunction(address).execute(state);
		});
	}
} 