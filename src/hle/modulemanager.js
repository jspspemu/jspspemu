var hle;
(function (hle) {
    var ModuleWrapper = (function () {
        function ModuleWrapper(moduleName, _module) {
            this.moduleName = moduleName;
            this._module = _module;
            this.names = {};
            this.nids = {};
            for (var key in _module) {
                var item = _module[key];
                if (item && item instanceof core.NativeFunction) {
                    var nativeFunction = item;
                    nativeFunction.name = key;
                    this.nids[nativeFunction.nid] = nativeFunction;
                    this.names[nativeFunction.name] = nativeFunction;
                }
            }
        }
        ModuleWrapper.prototype.getByName = function (name) {
            return this._module[name];
        };

        ModuleWrapper.prototype.getByNid = function (nid) {
            var result = this.nids[nid];
            if (!result)
                throw (sprintf("Can't find function '%s':0x%08X", this.moduleName, nid));
            return result;
        };
        return ModuleWrapper;
    })();
    hle.ModuleWrapper = ModuleWrapper;

    var ModuleManager = (function () {
        function ModuleManager(context) {
            this.context = context;
            this.names = {};
            this.moduleWrappers = {};
            for (var key in hle.modules) {
                if (key == 'createNativeFunction')
                    continue;
                this.add(key, hle.modules[key]);
            }
        }
        ModuleManager.prototype.getByName = function (name) {
            var _moduleWrapper = this.moduleWrappers[name];
            if (_moduleWrapper)
                return _moduleWrapper;

            var _class = this.names[name];
            if (!_class)
                throw ("Can't find module '" + name + "'");

            var _module = new _class(this.context);
            return this.moduleWrappers[name] = new ModuleWrapper(name, _module);
        };

        ModuleManager.prototype.add = function (name, _class) {
            if (!_class)
                throw ("Can't find module '" + name + "'");
            this.names[name] = _class;
        };
        return ModuleManager;
    })();
    hle.ModuleManager = ModuleManager;

    var ModuleManagerSyscalls = (function () {
        function ModuleManagerSyscalls() {
        }
        ModuleManagerSyscalls.registerSyscalls = function (syscallManager, moduleManager) {
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
        };

        ModuleManagerSyscalls.registerModule = function (syscallManager, moduleManager, id, moduleName, functionName) {
            syscallManager.registerWithId(id, moduleManager.getByName(moduleName).getByName(functionName));
        };
        return ModuleManagerSyscalls;
    })();
    hle.ModuleManagerSyscalls = ModuleManagerSyscalls;
})(hle || (hle = {}));
//# sourceMappingURL=modulemanager.js.map
