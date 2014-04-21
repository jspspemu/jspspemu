module hle.modules {
    export function createNativeFunction(exportId: number, firmwareVersion: number, retval: string, arguments: string, _this: any, internalFunc: Function) {
        var code = '';

        var args = [];
        var argindex = 4;

        function readGpr32() {
			return 'state.' + core.cpu.CpuState.getGprAccessName(argindex++);
        }

		function readGpr64() {
			argindex = MathUtils.nextAligned(argindex, 2);
			var gprLow = readGpr32();
			var gprHigh = readGpr32();
			return sprintf('Integer64.fromBits(%s, %s)', gprLow, gprHigh);
		}

        arguments.split('/').forEach(item => {
            switch (item) {
                case 'EmulatorContext': args.push('context'); break;
                case 'HleThread': args.push('state.thread'); break;
                case 'CpuState': args.push('state'); break;
                case 'Memory': args.push('state.memory'); break;
                case 'string': args.push('state.memory.readStringz(' + readGpr32() + ')'); break;
				case 'uint': case 'int': args.push(readGpr32()); break;
				case 'ulong': case 'long': args.push(readGpr64()); break;
                case 'void*': args.push('state.getPointerStream(' + readGpr32() + ')'); break;
                case '': break;
                default: throw ('Invalid argument "' + item + '"');
            }
        });

        code += 'var result = internalFunc.apply(_this, [' + args.join(', ') + ']);';

		code += 'if (result instanceof Promise) { state.thread.suspendUntilPromiseDone(result); throw (new CpuBreakException()); } ';
		code += 'if (result instanceof WaitingThreadInfo) { state.thread.suspendUntileDone(result); throw (new CpuBreakException()); } ';

        switch (retval) {
            case 'void': break;
            case 'uint': case 'int': code += 'state.V0 = result | 0;'; break;
			case 'long':
				code += 'if (!(result instanceof Integer64)) throw(new Error("Invalid long result. Expecting Integer64."));';
                code += 'state.V0 = result.low; state.V1 = result.high;'; break;
                break;
            default: throw ('Invalid return value "' + retval + '"');
        }

        var out = new core.NativeFunction();
        out.name = 'unknown';
        out.nid = exportId;
        out.firmwareVersion = firmwareVersion;
        //console.log(code);
        var func = <any>new Function('_this', 'internalFunc', 'context', 'state', code);
		out.call = (context: EmulatorContext, state: core.cpu.CpuState) => {
            func(_this, internalFunc, context, state);
        };
        //console.log(out);
        return out;
    }
}

function waitAsycn(timems: number) {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, timems);
	});
}

function downloadFileAsync(url: string) {
	return new Promise<ArrayBuffer>((resolve, reject) => {
		var request = new XMLHttpRequest();

		request.open("GET", url, true);
		request.overrideMimeType("text/plain; charset=x-user-defined");
		request.responseType = "arraybuffer";
		request.onload = function (e) {
			var arraybuffer: ArrayBuffer = request.response; // not responseText
			//var data = new Uint8Array(arraybuffer);
			resolve(arraybuffer);
			//console.log(data);
			//console.log(data.length);
		};
		request.onerror = function (e) {
			reject(e['error']);
		};
		request.send();
	});
}

interface StatInfo {
	size: number;
	date: Date;
}

function statFileAsync(url: string) {
	return new Promise<StatInfo>((resolve, reject) => {
		var request = new XMLHttpRequest();

		console.info('HEAD:', url);
		console.info(request);
		request.open("HEAD", url, true);
		request.overrideMimeType("text/plain; charset=x-user-defined");
		request.responseType = "arraybuffer";
		request.onload = function (e) {
			var headers = request.getAllResponseHeaders();
			var date = new Date();
			var size = 0;

			console.info(headers);

			var sizeMatch = headers.match(/content-length:\s*(\d+)/i);
			if (sizeMatch) size = parseInt(sizeMatch[1]);

			var dateMatch = headers.match(/date:(.*)/i);
			if (dateMatch) {
				//console.log(dateMatch);
				date = new Date(Date.parse(dateMatch[1].trim()));
			}

			console.log('date', date);
			console.log('size', size);

			resolve({
				size: size,
				date: date
			});
			//console.log(data);
			//console.log(data.length);
		};
		request.onerror = function (e) {
			reject(e['error']);
		};
		request.send();
	});
}
