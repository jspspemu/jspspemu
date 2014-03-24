///<reference path="../util/utils.ts" />
///<reference path="./cpu/state.ts" />
///<reference path="../cpu.ts" />

module core {
	export interface ISyscallManager {
		call(state: core.cpu.CpuState, id: number);
	}

	export class NativeFunction {
		name: string;
		nid: number;
		firmwareVersion: number;
		call: (context: EmulatorContext, state: core.cpu.CpuState) => void;
	}
	
    export class SyscallManager implements ISyscallManager {
        private calls: any = {};
        private lastId: number = 1;

        constructor(public context: EmulatorContext) {
        }

        register(nativeFunction: NativeFunction) {
            return this.registerWithId(this.lastId++, nativeFunction);
        }

        registerWithId(id: number, nativeFunction: NativeFunction) {
            this.calls[id] = nativeFunction;
            return id;
        }

		call(state: core.cpu.CpuState, id: number) {
            var nativeFunction: NativeFunction = this.calls[id];
            if (!nativeFunction) throw (sprintf("Can't call syscall %s: 0x%06X", id));
			//printf('calling syscall 0x%04X : %s', id, nativeFunction.name);

            nativeFunction.call(this.context, state);
        }
    }
}
