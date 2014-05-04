import _emulator = require('../src/emulator');

import Emulator = _emulator.Emulator;

describe('pspautotests', function () {
	this.timeout(5000);

	var tests = [
		{ "audio/atrac": ["atractest", "decode", "ids", "resetting", "setdata"] },
		{ "audio/mp3": ["mp3test"] },
		{ "audio/sascore": ["adsrcurve", "getheight", "keyoff", "keyon", "noise", "outputmode", "pause", "pcm", "pitch", "sascore", "setadsr", "vag"] },
		{ "audio/sceaudio": ["datalen", "output", "reserve"] },
		{ "cpu/cpu_alu": ["cpu_alu", "cpu_branch"] },
		{ "cpu/fpu": ["fcr", "fpu"] },
		{ "cpu/icache": ["icache"] },
		{ "cpu/lsu": ["lsu"] },
		{ "cpu/vfpu": ["colors", "convert", "gum", "matrix", "prefixes", "vector"] },
		{ "ctrl": ["ctrl", "vblank"] },
		{ "ctrl/idle": ["idle"] },
		{ "ctrl/sampling": ["sampling"] },
		{ "ctrl/sampling2": ["sampling2"] },
		{ "display": ["display", "hcount", "vblankmulti"] },
		{ "dmac": ["dmactest"] },
		{ "font": ["altcharcode", "charglyphimage", "charglyphimageclip", "charimagerect", "charinfo", "find", "fontinfo", "fontinfobyindex", "fontlist", "fonttest", "newlib", "open", "openfile", "openmem", "optimum", "resolution", "shadowglyphimage", "shadowglyphimageclip", "shadowimagerect", "shadowinfo"] },
		{ "gpu/callbacks": ["ge_callbacks"] },
		{ "gpu/commands": ["basic", "blocktransfer", "material"] },
		{ "gpu/complex": ["complex"] },
		{ "gpu/displaylist": ["state"] },
		{ "gpu/ge": ["break", "context", "edram", "get", "queue"] },
		{ "gpu/reflection": ["reflection"] },
		{ "gpu/rendertarget": ["rendertarget"] },
		{ "gpu/signals": ["continue", "jumps", "pause", "simple", "suspend", "sync"] },
		{ "gpu/simple": ["simple"] },
		{ "gpu/triangle": ["triangle"] },
		{ "hash": ["hash"] },
		{ "hle": ["check_not_used_uids"] },
		{ "intr": ["intr", "suspended", "waits"] },
		{ "intr/vblank": ["vblank"] },
		{ "io/cwd": ["cwd"] },
		{ "io/directory": ["directory"] },
		{ "io/file": ["file", "rename"] },
		{ "io/io": ["io"] },
		{ "io/iodrv": ["iodrv"] },
		{ "kirk": ["kirk"] },
		{ "loader/bss": ["bss"] },
		{ "malloc": ["malloc"] },
		{ "misc": ["dcache", "deadbeef", "libc", "sdkver", "testgp", "timeconv"] },
		{ "modules/loadexec": ["loader"] },
		{ "mstick": ["mstick"] },
		{ "net/http": ["http"] },
		{ "net/primary": ["ether"] },
		{ "power": ["cpu", "freq", "power"] },
		{ "power/volatile": ["lock", "trylock", "unlock"] },
		{ "rtc": ["arithmetic", "convert", "lookup", "rtc"] },
		{ "string": ["string"] },
		{ "sysmem": ["freesize", "memblock", "partition", "sysmem"] },
		{ "threads/alarm": ["alarm"] },
		{ "threads/alarm/cancel": ["cancel"] },
		{ "threads/alarm/refer": ["refer"] },
		{ "threads/alarm/set": ["set"] },
		{ "threads/callbacks": ["callbacks", "cancel", "check", "count", "create", "delete", "exit", "notify", "refer"] },
		{ "threads/events/cancel": ["cancel"] },
		{ "threads/events/clear": ["clear"] },
		{ "threads/events/create": ["create"] },
		{ "threads/events/delete": ["delete"] },
		{ "threads/events": ["events"] },
		{ "threads/events/poll": ["poll"] },
		{ "threads/events/refer": ["refer"] },
		{ "threads/events/set": ["set"] },
		{ "threads/events/wait": ["wait"] },
		{ "threads/fpl": ["allocate", "cancel", "create", "delete", "fpl", "free", "priority", "refer", "tryallocate"] },
		{ "threads/k0": ["k0"] },
		{ "threads/lwmutex": ["create", "delete", "lock", "priority", "refer", "try", "try600", "unlock"] },
		{ "threads/mbx/cancel": ["cancel"] },
		{ "threads/mbx/create": ["create"] },
		{ "threads/mbx/delete": ["delete"] },
		{ "threads/mbx": ["mbx"] },
		{ "threads/mbx/poll": ["poll"] },
		{ "threads/mbx/priority": ["priority"] },
		{ "threads/mbx/receive": ["receive"] },
		{ "threads/mbx/refer": ["refer"] },
		{ "threads/mbx/send": ["send"] },
		{ "threads/msgpipe": ["cancel", "create", "data", "delete", "msgpipe", "receive", "refer", "send", "tryreceive", "trysend"] },
		{ "threads/mutex": ["cancel", "create", "delete", "lock", "mutex", "priority", "refer", "try", "unlock"] },
		{ "threads/scheduling": ["dispatch", "scheduling"] },
		{ "threads/semaphores": ["cancel", "create", "delete", "fifo", "poll", "priority", "refer", "semaphores", "signal", "wait"] },
		{ "threads/semaphores/semaphore_greater_than_zero": ["semaphore_greater_than_zero"] },
		{ "threads/threads": ["change", "create", "exitstatus", "extend", "refer", "release", "rotate", "stackfree", "start", "suspend", "terminate", "threadend", "threads"] },
		{ "threads/vpl": ["allocate", "cancel", "create", "delete", "fifo", "free", "order", "priority", "refer", "try", "vpl"] },
		{ "threads/vtimers": ["cancelhandler", "create", "delete", "getbase", "gettime", "interrupt", "refer", "sethandler", "settime", "start", "stop", "vtimer"] },
		{ "threads/wakeup": ["wakeup"] },
		{ "umd/callbacks": ["umd"] },
		{ "umd/io": ["umd_io"] },
		{ "umd/raw_access": ["raw_access", "raw_acess"] },
		{ "umd": ["register"] },
		{ "umd/wait": ["wait"] },
		{ "utility/msgdialog": ["abort", "dialog"] },
		{ "utility/savedata": ["autosave", "filelist", "getsize", "idlist", "makedata", "sizes"] },
		{ "utility/systemparam": ["systemparam"] },
		{ "video/mpeg": ["basic"] },
		{ "video/mpeg/ringbuffer": ["avail", "construct", "destruct", "memsize", "packnum"] },
		{ "video/pmf": ["pmf"] },
		{ "video/pmf_simple": ["pmf_simple"] },
		{ "video/psmfplayer": ["basic", "create", "getpsmfinfo", "setpsmf", "setpsmfoffset", "settempbuf"] },
	];

	function normalizeString(string: string) {
		return string.replace(/(\r\n|\r)/gm, '\n').replace(/[\r\n\s]+$/gm, '');
	}

	function compareOutput(name:string, output: string, expected: string) {
		output = normalizeString(output);
		expected = normalizeString(expected);

		var output_lines = output.split('\n');
		var expected_lines = expected.split('\n');

		var distinctLines = 0;
		var totalLines = Math.max(output_lines.length, expected_lines.length)
		console.groupCollapsed('TEST RESULT: ' + name);
		var linesToShow = {};
		for (var n = 0; n < totalLines; n++) {
			if (output_lines[n] != expected_lines[n]) {
				distinctLines++;
				for (var m = -2; m <= 2; m++) linesToShow[n + m] = true;
			}
		}

		for (var n = 0; n < totalLines; n++) {
			var lineNumber = n + 1;
			var output_line = output_lines[n];
			var expected_line = expected_lines[n];
			if (linesToShow[n]) {
				if (output_line != expected_line) {
					console.warn(sprintf('%04d: %s', lineNumber, output_line));
					console.info(sprintf('%04d: %s', lineNumber, expected_line));
				} else {
					console.log(sprintf('%04d: %s', lineNumber, output_line));
				}
			}
		}

		if (distinctLines == 0) console.log('great: output and expected are equal!');

		console.groupEnd();

		assert(output == expected, "Output not expected. " + distinctLines + "/" + totalLines + " lines didn't match. Please check console for details.");
	}

	var groupCollapsed = false;

	tests.forEach((testGroup) => {
		_.keys(testGroup).forEach(testGroupName => {
			describe(testGroupName, function () {
				var testNameList: string[] = testGroup[testGroupName];

				testNameList.forEach(testName => {
					it(testName, () => {
						var emulator = new Emulator();
						var file_base = '../pspautotests/tests/' + testGroupName + '/' + testName;
						var file_prx = file_base + '.prx';
						var file_expected = file_base + '.expected';

						if (!groupCollapsed) console.groupEnd();
						groupCollapsed = false;
						console.groupCollapsed('' + testName);
						return downloadFileAsync(file_prx).then((data_prx) => {
							return downloadFileAsync(file_expected).then((data_expected) => {
								var string_expected = String.fromCharCode.apply(null, new Uint8Array(data_expected));

								return emulator.loadExecuteAndWaitAsync(MemoryAsyncStream.fromArrayBuffer(data_prx), file_prx).then(() => {
									groupCollapsed = true;
									console.groupEnd();
									compareOutput(testName, emulator.emulatorVfs.output, string_expected);
								});
							});
						});

						//emulator.executeFileAsync
					});
				});
			});
		});
	});
});
