var hle;
(function (hle) {
    (function (modules) {
        var NativeFunction = (function () {
            function NativeFunction() {
            }
            return NativeFunction;
        })();
        modules.NativeFunction = NativeFunction;

        function createNativeFunction(exportId, firmwareVersion, retval, arguments, _this, internalFunc) {
            var code = '';

            var args = [];
            var argindex = 4;

            function readGpr() {
                return 'state.' + CpuState.getGprAccessName(argindex++);
            }

            arguments.split('/').forEach(function (item) {
                switch (item) {
                    case 'EmulatorContext':
                        args.push('context');
                        break;
                    case 'HleThread':
                        args.push('state.thread');
                        break;
                    case 'CpuState':
                        args.push('state');
                        break;
                    case 'Memory':
                        args.push('state.memory');
                        break;
                    case 'string':
                        args.push('state.memory.readStringz(' + readGpr() + ')');
                        break;
                    case 'uint':
                    case 'int':
                        args.push(readGpr());
                        break;
                    case 'void*':
                        args.push('state.getPointerStream(' + readGpr() + ')');
                        break;
                    case '':
                        break;
                    default:
                        throw ('Invalid argument "' + item + '"');
                }
            });

            code += 'var result = internalFunc.apply(_this, [' + args.join(', ') + ']);';

            code += 'if (typeof result == "object") { state.thread.suspendUntilPromiseDone(result); throw (new CpuBreakException()); } ';

            switch (retval) {
                case 'void':
                    break;

                case 'uint':
                case 'int':
                    code += 'state.V0 = result | 0;';
                    break;
                case 'long':
                    code += 'state.V0 = (result >>> 0) & 0xFFFFFFFF; state.V1 = (result >>> 32) & 0xFFFFFFFF;';
                    break;
                    break;
                default:
                    throw ('Invalid return value "' + retval + '"');
            }

            var out = new NativeFunction();
            out.name = 'unknown';
            out.nid = exportId;
            out.firmwareVersion = firmwareVersion;

            //console.log(code);
            var func = new Function('_this', 'internalFunc', 'context', 'state', code);
            out.call = function (context, state) {
                func(_this, internalFunc, context, state);
            };

            //console.log(out);
            return out;
        }
        modules.createNativeFunction = createNativeFunction;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=_utils.js.map
