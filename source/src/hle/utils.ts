import _cpu = require('../core/cpu');

export import NativeFunction = _cpu.NativeFunction;
import createNativeFunction = _cpu.createNativeFunction;
//export import CreateOptions = _cpu.CreateOptions;

interface CreateOptions {
	originalName?: string;
	disableInsideInterrupt?: boolean;
}

export function nativeFunction(exportId:number, firmwareVersion:number, retval:string, args:string, options?:CreateOptions) {
	return (target: any, key: string, descriptor: TypedPropertyDescriptor<any>) => {
		//console.log(target, key, descriptor);
		if (typeof target.natives == 'undefined') target.natives = [];
		if (!descriptor) {
			console.error("descriptor == null");
			console.error(target);
			console.error(key);
			console.error(descriptor);
		}
		target.natives.push((target:any) => {
			return createNativeFunction(exportId, firmwareVersion, retval, args, target, descriptor.value, options, `${target.constructor.name}`, key)
		});
		return descriptor;
	};
}