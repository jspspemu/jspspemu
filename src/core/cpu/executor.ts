import state = require('./state');
import icache = require('./icache');

import InstructionCache = icache.InstructionCache;
import CpuState = state.CpuState;

export class ProgramExecutor {
	private lastPC = 0;
	private lastTime = 0;
	private times = 0;

	constructor(public state: CpuState, public instructionCache: InstructionCache) {
		this.state.executor = this;
	}

	private _executeStep() {
		if (this.state.PC == 0) console.error(sprintf("Calling 0x%08X from 0x%08X", this.state.PC, this.lastPC));
		this.lastPC = this.state.PC;
		var func = this.instructionCache.getFunction(this.state.PC);
		func(this.state);
		//this.instructionCache.getFunction(this.state.PC)(this.state);
	}

	executeUntilPCReachesWithoutCall(expectedPC: number): void {
		while (this.state.PC != expectedPC) {
			this._executeStep();
			this.times++;
			if (this.times >= 100000) {
				this.times = 0;
				if ((performance.now() - this.lastTime) >= 100) throw (new CpuBreakException());
				this.lastTime = performance.now();
			}
		}
	}

	executeWithoutCatch(maxIterations: number = -1) {
		while (maxIterations != 0) {
			this._executeStep();
			if (maxIterations > 0) maxIterations--;
		}
	}

	execute(maxIterations: number = -1) {
		try {
			this.executeWithoutCatch(maxIterations);
		} catch (e) {
			if (!(e instanceof CpuBreakException)) {
				console.log(this.state);
				this.state.printCallstack();
				throw (e);
			}
		}
	}
}
