var SyscallHandler = (function () {
    function SyscallHandler(context) {
        this.context = context;
        this.calls = {};
        this.lastId = 1;
    }
    SyscallHandler.prototype.registerModules = function (moduleManager) {
        this.registerModule(moduleManager, 0x206D, "ThreadManForUser", "sceKernelCreateThread");
        this.registerModule(moduleManager, 0x206F, "ThreadManForUser", "sceKernelStartThread");
        this.registerModule(moduleManager, 0x2071, "ThreadManForUser", "sceKernelExitDeleteThread");

        this.registerModule(moduleManager, 0x20BF, "UtilsForUser", "sceKernelUtilsMt19937Init");
        this.registerModule(moduleManager, 0x20C0, "UtilsForUser", "sceKernelUtilsMt19937UInt");

        this.registerModule(moduleManager, 0x213A, "sceDisplay", "sceDisplaySetMode");
        this.registerModule(moduleManager, 0x2147, "sceDisplay", "sceDisplayWaitVblankStart");
        this.registerModule(moduleManager, 0x213F, "sceDisplay", "sceDisplaySetFrameBuf");

        this.registerModule(moduleManager, 0x20EB, "LoadExecForUser", "sceKernelExitGame");

        this.registerModule(moduleManager, 0x2150, "sceCtrl", "sceCtrlPeekBufferPositive");
    };

    SyscallHandler.prototype.registerModule = function (moduleManager, id, moduleName, functionName) {
        this.registerModuleInternal(id, moduleManager.getByName(moduleName).getByName(functionName));
    };

    SyscallHandler.prototype.register = function (nativeFunction) {
        var id = this.lastId;
        this.registerModuleInternal(id, nativeFunction);
        this.lastId++;
        return id;
    };

    SyscallHandler.prototype.registerModuleInternal = function (id, nativeFunction) {
        this.calls[id] = nativeFunction;
    };

    SyscallHandler.prototype.call = function (state, id) {
        var nativeFunction = this.calls[id];
        if (!nativeFunction)
            throw (sprintf("Can't call syscall %s: 0x%06X", id));

        //printf('calling syscall 0x%04X : %s', id, info.name);
        nativeFunction.call(this.context, state);
    };
    return SyscallHandler;
})();

var ModuleWrapper = (function () {
    function ModuleWrapper(moduleName, _module) {
        this.moduleName = moduleName;
        this._module = _module;
        this.names = {};
        this.nids = {};
        for (var key in _module) {
            var item = _module[key];
            if (item instanceof NativeFunction) {
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

var ModuleManager = (function () {
    function ModuleManager(context) {
        this.context = context;
        this.names = {};
        this.moduleWrappers = {};
        this.add('ThreadManForUser', ThreadManForUser);
        this.add('UtilsForUser', UtilsForUser);
        this.add('sceDisplay', sceDisplay);
        this.add('LoadExecForUser', LoadExecForUser);
        this.add('sceCtrl', sceCtrl);
        this.add('sceGe_user', sceGe_user);
        this.add('IoFileMgrForUser', IoFileMgrForUser);
        this.add('ModuleMgrForUser', ModuleMgrForUser);
        this.add('StdioForUser', StdioForUser);
        this.add('SysMemUserForUser', SysMemUserForUser);
        this.add('sceAudio', sceAudio);
        this.add('sceRtc', sceRtc);
        this.add('scePower', scePower);
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
        this.names[name] = _class;
    };
    return ModuleManager;
})();
//# sourceMappingURL=modules.js.map
