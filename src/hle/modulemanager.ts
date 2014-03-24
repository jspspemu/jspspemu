module hle {
    export class ModuleWrapper {
        private names: StringDictionary<core.NativeFunction> = {};
		private nids: NumberDictionary<core.NativeFunction> = {};

        constructor(private moduleName: string, private _module: any) {
            for (var key in _module) {
                var item: any = _module[key];
				if (item && item instanceof core.NativeFunction) {
					var nativeFunction: core.NativeFunction = item;
                    nativeFunction.name = key;
                    this.nids[nativeFunction.nid] = nativeFunction;
                    this.names[nativeFunction.name] = nativeFunction;
                }
            }
        }

		getByName(name: string): core.NativeFunction {
            return this._module[name];
        }

		getByNid(nid: number): core.NativeFunction {
            var result = this.nids[nid];
            if (!result) throw (sprintf("Can't find function '%s':0x%08X", this.moduleName, nid));
            return result;
        }
    }

    export class ModuleManager {
        private names: StringDictionary<any> = {};
        private moduleWrappers: StringDictionary<any> = {};

		constructor(public context: EmulatorContext) {
			for (var key in hle.modules) {
				if (key == 'createNativeFunction') continue;
				this.add(key, hle.modules[key]);
			}
        }

        getByName(name: string): ModuleWrapper {
            var _moduleWrapper = this.moduleWrappers[name];
            if (_moduleWrapper) return _moduleWrapper;

            var _class = this.names[name];
            if (!_class) throw ("Can't find module '" + name + "'");

            var _module = new _class(this.context);
            return this.moduleWrappers[name] = new ModuleWrapper(name, _module);
        }

        private add(name: string, _class: any) {
            if (!_class) throw("Can't find module '" + name + "'");
            this.names[name] = _class;
        }
    }

    export class ModuleManagerSyscalls {
        static registerSyscalls(syscallManager: core.SyscallManager, moduleManager: hle.ModuleManager) {
            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x206D, "ThreadManForUser", "sceKernelCreateThread");
            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x206F, "ThreadManForUser", "sceKernelStartThread");
            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x2071, "ThreadManForUser", "sceKernelExitDeleteThread");

            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x20BF, "UtilsForUser", "sceKernelUtilsMt19937Init");
            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x20C0, "UtilsForUser", "sceKernelUtilsMt19937UInt");

            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x213A, "sceDisplay", "sceDisplaySetMode");
            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x2147, "sceDisplay", "sceDisplayWaitVblankStart");
            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x213F, "sceDisplay", "sceDisplaySetFrameBuf");

            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x20EB, "LoadExecForUser", "sceKernelExitGame");

            ModuleManagerSyscalls.registerModule(syscallManager, moduleManager, 0x2150, "sceCtrl", "sceCtrlPeekBufferPositive");
        }

		private static registerModule(syscallManager: core.SyscallManager, moduleManager: hle.ModuleManager, id: number, moduleName: string, functionName: string) {
            syscallManager.registerWithId(id, moduleManager.getByName(moduleName).getByName(functionName));
        }
    }
}
