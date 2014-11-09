///<reference path="../../global.d.ts" />
var _cpu = require('../../core/cpu');
var NativeFunction = _cpu.NativeFunction;
var ModuleWrapper = (function () {
    function ModuleWrapper(moduleName, _modules) {
        var _this = this;
        this.moduleName = moduleName;
        this._modules = _modules;
        this.names = {};
        this.nids = {};
        _modules.forEach(function (_module) {
            for (var key in _module) {
                var item = _module[key];
                if (item && item instanceof NativeFunction) {
                    var nativeFunction = item;
                    nativeFunction.name = key;
                    _this.nids[nativeFunction.nid] = nativeFunction;
                    _this.names[nativeFunction.name] = nativeFunction;
                }
            }
        });
    }
    ModuleWrapper.prototype.getByName = function (name) {
        return this.names[name];
    };
    ModuleWrapper.prototype.getByNid = function (nid) {
        var result = this.nids[nid];
        //if (!result) throw (new Error(sprintf("Can't find function '%s':0x%08X", this.moduleName, nid)));
        return result;
    };
    return ModuleWrapper;
})();
exports.ModuleWrapper = ModuleWrapper;
var ModuleManager = (function () {
    function ModuleManager(context) {
        this.context = context;
        this.names = {};
        this.moduleWrappers = {};
    }
    ModuleManager.prototype.registerModule = function (_module) {
        for (var key in _module) {
            if (key == 'createNativeFunction')
                continue;
            var _class = _module[key];
            this.add(key, _class);
        }
    };
    ModuleManager.prototype.getByName = function (name) {
        var _this = this;
        var _moduleWrapper = this.moduleWrappers[name];
        if (_moduleWrapper)
            return _moduleWrapper;
        var _classes = this.names[name];
        if (!_classes)
            throw (new Error("Can't find module '" + name + "'"));
        var _modules = _classes.map(function (_class) { return new _class(_this.context); });
        return this.moduleWrappers[name] = new ModuleWrapper(name, _modules);
    };
    ModuleManager.prototype.add = function (name, _class) {
        if (!_class)
            throw (new Error("Can't find module '" + name + "'"));
        if (!this.names[name])
            this.names[name] = [];
        this.names[name].push(_class);
    };
    return ModuleManager;
})();
exports.ModuleManager = ModuleManager;
//# sourceMappingURL=module.js.map