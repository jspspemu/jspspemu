import _cpu = require('../core/cpu');
import _memory = require('../core/memory');

import Memory = _memory.Memory;
export import NativeFunction = _cpu.NativeFunction;

export function createNativeFunction(exportId: number, firmwareVersion: number, retval: string, argTypesString: string, _this: any, internalFunc: Function) {
    var code = '';

    var args = [];
    var argindex = 4;

    function _readGpr32() {
		return 'state.gpr[' + (argindex++) + ']';
	}

	function readGpr32_S() {
		return '(' + _readGpr32() + ' | 0)';
	}

	function readGpr32_U() {
		return '(' + _readGpr32() + ' >>> 0)';
	}

	function readGpr64() {
		argindex = MathUtils.nextAligned(argindex, 2);
		var gprLow = readGpr32_S();
		var gprHigh = readGpr32_S();
		return sprintf('Integer64.fromBits(%s, %s)', gprLow, gprHigh);
	}

	var argTypes = argTypesString.split('/').filter(item => item.length > 0);

	if (argTypes.length != internalFunc.length) throw(new Error("Function arity mismatch '" + argTypesString + "' != " + String(internalFunc)));

	argTypes.forEach(item => {
        switch (item) {
            case 'EmulatorContext': args.push('context'); break;
            case 'Thread': args.push('state.thread'); break;
            case 'CpuState': args.push('state'); break;
            case 'Memory': args.push('state.memory'); break;
			case 'string': args.push('state.memory.readStringz(' + readGpr32_S() + ')'); break;
			case 'uint': args.push(readGpr32_U() + ' >>> 0'); break;
			case 'int': args.push(readGpr32_S() + ' | 0'); break;
			case 'ulong': case 'long': args.push(readGpr64()); break;
			case 'void*': args.push('state.getPointerStream(' + readGpr32_S() + ')'); break;
			case 'byte[]': args.push('state.getPointerStream(' + readGpr32_S() + ', ' + readGpr32_S() + ')'); break;
            default: throw ('Invalid argument "' + item + '"');
        }
    });

	
	code += 'var args = [' + args.join(', ') + '];';
	code += 'try {';
	code += 'var result = internalFunc.apply(_this, args);';
	code += '} catch (e) {';
	code += 'if (e instanceof SceKernelException) { result = e.id; } else { throw(e); }';
	code += '}';

	//code += "var info = 'calling_' + state.thread.name + '_' + nativeFunction.name;";
	//code += "if (DebugOnce(info, 10)) console.warn('#######', info, 'args=', args, 'result=', " + ((retval == 'uint') ? "sprintf('0x%08X', result)" : "result") + ");";

	code += 'if (result instanceof Promise) { state.thread.suspendUntilPromiseDone(result, nativeFunction); throw (new CpuBreakException()); } ';
	code += 'if (result instanceof WaitingThreadInfo) { state.thread.suspendUntileDone(result); throw (new CpuBreakException()); } ';

    switch (retval) {
        case 'void': break;
		case 'uint': case 'int': code += 'state.V0 = result | 0;'; break;
		case 'float': code += 'state.fpr[0] = result;'; break;
		case 'long':
			code += 'if (!(result instanceof Integer64)) throw(new Error("Invalid long result. Expecting Integer64."));';
            code += 'state.V0 = result.low; state.V1 = result.high;'; break;
            break;
        default: throw ('Invalid return value "' + retval + '"');
    }

    var nativeFunction = new NativeFunction();
    nativeFunction.name = 'unknown';
    nativeFunction.nid = exportId;
    nativeFunction.firmwareVersion = firmwareVersion;
    //console.log(code);
    var func = <any>new Function('_this', 'internalFunc', 'context', 'state', 'nativeFunction', code);
	nativeFunction.call = (context, state) => {
        func(_this, internalFunc, context, state, nativeFunction);
	};
	nativeFunction.nativeCall = internalFunc;
    //console.log(out);
    return nativeFunction;
}
