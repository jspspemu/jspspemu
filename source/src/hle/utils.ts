import _cpu = require('../core/cpu');

export import NativeFunction = _cpu.NativeFunction;
import createNativeFunction = _cpu.createNativeFunction;
//export import CreateOptions = _cpu.CreateOptions;

interface CreateOptions {
	disableInsideInterrupt?: boolean;
}

export function nativeFunction(exportId:number, firmwareVersion:number, argTypesString:string, args:string, options?:CreateOptions) {
	return (target: any, key: string, descriptor: TypedPropertyDescriptor<any>) => {
		if (typeof target.natives == 'undefined') target.natives = [];
		target.natives.push((target:any) => {
			return createNativeFunction(exportId, firmwareVersion, argTypesString, args, target, descriptor.value, options, `${target.constructor.name}`, key)
		});
		return descriptor;
	};
}