///<reference path="../../global.d.ts" />

import _cpu = require('../../core/cpu');

import NativeFunction = _cpu.NativeFunction;
import SyscallManager = _cpu.SyscallManager;

export class ModuleWrapper {
    private names: StringDictionary<NativeFunction> = {};
	private nids: NumberDictionary<NativeFunction> = {};

	constructor(public moduleName: string, private _modules: any[]) {
		_modules.forEach((_module) => {
			for (var key in _module) {
				var item: any = _module[key];
				if (item && item instanceof NativeFunction) {
					var nativeFunction: NativeFunction = item;
					nativeFunction.name = key;
					this.nids[nativeFunction.nid] = nativeFunction;
					this.names[nativeFunction.name] = nativeFunction;
				}
			}
		});
    }

	getByName(name: string): NativeFunction {
		return this.names[name];
    }

	getByNid(nid: number): NativeFunction {
        var result = this.nids[nid];
        //if (!result) throw (new Error(sprintf("Can't find function '%s':0x%08X", this.moduleName, nid)));
        return result;
    }
}

export class ModuleManager {
	private names: StringDictionary<any[]> = {};
    private moduleWrappers: StringDictionary<any> = {};

	constructor(public context) {
	}

	
	registerModule(_module: any) {
		for (var key in _module) {
			if (key == 'createNativeFunction') continue;
			var _class = _module[key];
			this.add(key, _class);
		}
	}

    getByName(name: string): ModuleWrapper {
        var _moduleWrapper = this.moduleWrappers[name];
        if (_moduleWrapper) return _moduleWrapper;

        var _classes = this.names[name];
		if (!_classes) throw (new Error("Can't find module '" + name + "'"));

		var _modules = _classes.map((_class) => new _class(this.context));

		return this.moduleWrappers[name] = new ModuleWrapper(name, _modules);
    }

    private add(name: string, _class: any) {
		if (!_class) throw (new Error("Can't find module '" + name + "'"));
		if (!this.names[name]) this.names[name] = [];
        this.names[name].push(_class);
    }
}
