import {createNativeFunction, CreateOptions, MemoryTypeType, ThreadTypeType, VoidTypeType} from "../core/cpu/cpu_core";
import {Float32, Int32, Int64, IType, Pointer, Ptr, StringzVariable, UInt32} from "../global/struct";
import {Stream} from "../global/stream";

export function nativeFunction(exportId: number, firmwareVersion: number, retval: string|undefined, args: string|undefined, options?: CreateOptions) {
    return (target: any, key: string, descriptor: TypedPropertyDescriptor<any>) => {
        //console.log(target, key, descriptor);
        if (typeof target.natives == 'undefined') target.natives = [];
        if (typeof target.nativesParams == 'undefined') target.nativesParams = {};
        if (typeof target.nativeRet == 'undefined') target.nativeRet = {};
        if (!descriptor) {
            console.error("descriptor == null");
            console.error(target);
            console.error(key);
            console.error(descriptor);
        }
        target.natives.push((target: any) => {
            return createNativeFunction(exportId, firmwareVersion, retval, target.nativeRet[key], args, target.nativesParams[key], target, descriptor.value, options, `${target.constructor.name}`, key)
        });
        return descriptor;
    };
}

export function nativeFunctionEx(exportId: number, firmwareVersion: number, options?: CreateOptions) {
    return nativeFunction(exportId, firmwareVersion, undefined, undefined, options)
}

//export function nativeFunction2(): any {
//    return (target: any, key: string, descriptor: TypedPropertyDescriptor<any>) => {
//        console.warn("nativeFunction2", target, key)
//        console.log(target.nativesParams[key])
//    }
//}

// https://www.typescriptlang.org/docs/handbook/decorators.html
export function param(type: IType<any>): any {
    return (target: any, key: string, info: number | TypedPropertyDescriptor<any>) => {
        if (typeof info == "number") {
            const parameterIndex = info as number
            if (typeof target.nativesParams == 'undefined') target.nativesParams = {};
            if (!target.nativesParams[key]) target.nativesParams[key] = []
            target.nativesParams[key][parameterIndex] = type
        } else {
            if (typeof target.nativeRet == 'undefined') target.nativeRet = {};
            target.nativeRet[key] = type
            //console.warn("target.nativeRet", key, type)
        }
        //console.warn("param", parameterIndex, type, target, key)
    }
}

export const VOID: any = param(VoidTypeType)
export const STRING: any = param(StringzVariable)
export const THREAD: any = param(ThreadTypeType)
export const MEMORY: any = param(MemoryTypeType)
export const I64: any = param(Int64)
export const F32: any = param(Float32)
export const U32: any = param(UInt32)
export const I32: any = param(Int32)
export const PTR: any = param(Ptr)
