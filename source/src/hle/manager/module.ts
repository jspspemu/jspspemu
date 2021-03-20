import {NumberDictionary, StringDictionary} from "../../global/utils";
import {NativeFunction} from "../../core/cpu/cpu_core";

export class ModuleWrapper {
    private names: StringDictionary<NativeFunction> = {};
	private nids: NumberDictionary<NativeFunction> = {};

	constructor(public moduleName: string, private _modules: any[]) {
		_modules.forEach((_module) => {
			if (typeof _module.natives != 'undefined') {
				var natives:any[] = _module.natives;
				for (let nativeGenerator of natives) {
					//console.error('Registered native', native.name);
					this.registerNative(nativeGenerator(_module));
				}
			}
			for (var key in _module) {
				if (key == 'natives') continue;
				var item: any = _module[key];
				if (item && item instanceof NativeFunction) {
					var nativeFunction: NativeFunction = item;
					nativeFunction.name = key;
					this.registerNative(nativeFunction);
				}
			}
		});
    }
	
	private registerNative(nf:NativeFunction) {
		this.nids[nf.nid] = nf;
		this.names[nf.name] = nf;
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

	constructor(public context:any) {
	}

	registerClass(clazz: any) {
        this.add(clazz.name, clazz);
    }
	
	registerModule(_module: any) {
		for (var key in _module) {
			if (key == 'createNativeFunction') continue;
			if (key == 'natives') continue;
			var _class = _module[key];
			this.add(key, _class);
		}
	}
	
	/*
	getByClass<T>(clazz: Class<T>):T {
		return null;
	}
	*/

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
