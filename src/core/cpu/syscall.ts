import state = require('./state');
import CpuState = state.CpuState;

export interface ISyscallManager {
	call(state: CpuState, id: number);
}

export interface IEmulatorContext {
}

export class NativeFunction {
	name: string;
	nid: number;
	firmwareVersion: number;
	call: (context: IEmulatorContext, state: CpuState) => void;
	nativeCall: Function;
}
	
export class SyscallManager implements ISyscallManager {
    private calls: any = {};
    private lastId: number = 1;

	constructor(public context: IEmulatorContext) {
    }

    register(nativeFunction: NativeFunction) {
        return this.registerWithId(this.lastId++, nativeFunction);
    }

    registerWithId(id: number, nativeFunction: NativeFunction) {
        this.calls[id] = nativeFunction;
        return id;
    }

	call(state: CpuState, id: number) {
        var nativeFunction: NativeFunction = this.calls[id];
        if (!nativeFunction) throw (sprintf("Can't call syscall %s: 0x%06X", id));
		//printf('calling syscall 0x%04X : %s', id, nativeFunction.name);

        nativeFunction.call(this.context, state);
    }
}
