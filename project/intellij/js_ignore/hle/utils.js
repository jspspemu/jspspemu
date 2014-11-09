var _cpu = require('../core/cpu');
var _memory = require('../core/memory');
exports.NativeFunction = _cpu.NativeFunction;
var console = logger.named('createNativeFunction');
function createNativeFunction(exportId, firmwareVersion, retval, argTypesString, _this, internalFunc, options) {
    var tryCatch = true;
    if (options) {
        if (options.tryCatch !== undefined)
            tryCatch = options.tryCatch;
    }
    var code = '';
    var args = [];
    var maxGprIndex = 12;
    var gprindex = 4;
    var fprindex = 0;
    //var fprindex = 2;
    function _readGpr32() {
        if (gprindex >= maxGprIndex) {
            //return ast.MemoryGetValue(Type, PspMemory, ast.GPR_u(29) + ((MaxGprIndex - Index) * 4));
            return 'state.lw(state.gpr[29] + ' + ((maxGprIndex - gprindex++) * 4) + ')';
        }
        else {
            return 'state.gpr[' + (gprindex++) + ']';
        }
    }
    function readFpr32() {
        return 'state.fpr[' + (fprindex++) + ']';
    }
    function readGpr32_S() {
        return '(' + _readGpr32() + ' | 0)';
    }
    function readGpr32_U() {
        return '(' + _readGpr32() + ' >>> 0)';
    }
    function readGpr64() {
        gprindex = MathUtils.nextAligned(gprindex, 2);
        var gprLow = readGpr32_S();
        var gprHigh = readGpr32_S();
        return sprintf('Integer64.fromBits(%s, %s)', gprLow, gprHigh);
    }
    var argTypes = argTypesString.split('/').filter(function (item) { return item.length > 0; });
    if (argTypes.length != internalFunc.length)
        throw (new Error("Function arity mismatch '" + argTypesString + "' != " + String(internalFunc)));
    argTypes.forEach(function (item) {
        switch (item) {
            case 'EmulatorContext':
                args.push('context');
                break;
            case 'Thread':
                args.push('state.thread');
                break;
            case 'CpuState':
                args.push('state');
                break;
            case 'Memory':
                args.push('state.memory');
                break;
            case 'string':
                args.push('state.memory.readStringz(' + readGpr32_S() + ')');
                break;
            case 'uint':
                args.push(readGpr32_U() + ' >>> 0');
                break;
            case 'int':
                args.push(readGpr32_S() + ' | 0');
                break;
            case 'bool':
                args.push(readGpr32_S() + ' != 0');
                break;
            case 'float':
                args.push(readFpr32());
                break;
            case 'ulong':
            case 'long':
                args.push(readGpr64());
                break;
            case 'void*':
                args.push('state.getPointerStream(' + readGpr32_S() + ')');
                break;
            case 'byte[]':
                args.push('state.getPointerStream(' + readGpr32_S() + ', ' + readGpr32_S() + ')');
                break;
            default:
                var matches = [];
                if (matches = item.match(/^byte\[(\d+)\]$/)) {
                    args.push('state.getPointerU8Array(' + readGpr32_S() + ', ' + matches[1] + ')');
                }
                else {
                    throw ('Invalid argument "' + item + '"');
                }
        }
    });
    code += 'var error = false;\n';
    if (tryCatch) {
        code += 'try {\n';
    }
    code += 'var args = [' + args.join(', ') + '];\n';
    code += 'var result = internalFunc.apply(_this, args);\n';
    if (tryCatch) {
        code += '} catch (e) {\n';
        code += 'if (e instanceof SceKernelException) { error = true; result = e.id; } else { console.info(nativeFunction.name, nativeFunction); throw(e); }\n';
        code += '}\n';
    }
    var debugSyscalls = false;
    //var debugSyscalls = true;
    if (debugSyscalls) {
        code += "var info = 'calling:' + state.thread.name + ':RA=' + state.RA.toString(16) + ':' + nativeFunction.name;\n";
        code += "if (DebugOnce(info, 10)) {\n";
        code += "console.warn('#######', info, 'args=', args, 'result=', " + ((retval == 'uint') ? "sprintf('0x%08X', result) " : "result") + ");\n";
        code += "if (result instanceof Promise) { result.then(function(value) { console.warn('------> PROMISE: ',info,'args=', args, 'result-->', " + ((retval == 'uint') ? "sprintf('0x%08X', value) " : "value") + "); }); }\n";
        code += "}\n";
    }
    code += 'if (result instanceof Promise) { state.thread.suspendUntilPromiseDone(result, nativeFunction); throw (new CpuBreakException()); }\n';
    code += 'if (result instanceof WaitingThreadInfo) { if (result.promise instanceof Promise) { state.thread.suspendUntilDone(result); throw (new CpuBreakException()); } else { result = result.promise; } }\n';
    switch (retval) {
        case 'void':
            break;
        case 'uint':
        case 'int':
            code += 'state.V0 = result | 0;\n';
            break;
        case 'bool':
            code += 'state.V0 = result ? 1 : 0;\n';
            break;
        case 'float':
            code += 'state.fpr[0] = result;\n';
            break;
        case 'long':
            code += 'if (!error) {\n';
            code += 'if (!(result instanceof Integer64)) { console.info("FUNC:", nativeFunction); throw(new Error("Invalid long result. Expecting Integer64 but found \'" + result + "\'.")); }\n';
            code += 'state.V0 = result.low; state.V1 = result.high;\n';
            code += '} else {\n';
            code += 'state.V0 = result; state.V1 = 0;\n';
            code += '}\n';
            break;
        default:
            throw ('Invalid return value "' + retval + '"');
    }
    var nativeFunction = new exports.NativeFunction();
    nativeFunction.name = 'unknown';
    nativeFunction.nid = exportId;
    nativeFunction.firmwareVersion = firmwareVersion;
    //console.log(code);
    var func = new Function('_this', 'console', 'internalFunc', 'context', 'state', 'nativeFunction', '"use strict";' + sprintf("/* 0x%08X */", nativeFunction.nid) + "\n" + code);
    nativeFunction.call = function (context, state) {
        func(_this, console, internalFunc, context, state, nativeFunction);
    };
    nativeFunction.nativeCall = internalFunc;
    //console.log(out);
    return nativeFunction;
}
exports.createNativeFunction = createNativeFunction;
//# sourceMappingURL=utils.js.map