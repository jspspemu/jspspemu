///<reference path="./global.d.ts" />
export function ref() { } // Workaround to allow typescript to include this module

import _emulator = require('../src/emulator');
import _vfs = require('../src/hle/vfs');

import Emulator = _emulator.Emulator;

declare var difflib: any;

var console = logger.named('');

describe('pspautotests', function () {
	this.timeout(5000);

	var tests = [
		//{ "audio/atrac": ["atractest", "decode", "ids", "resetting", "setdata"] },
		//{ "audio/mp3": ["mp3test"] },
		//{ "audio/sascore": ["adsrcurve", "getheight", "keyoff", "keyon", "noise", "outputmode", "pause", "pcm", "pitch", "sascore", "setadsr", "vag"] },
		//{ "audio/sceaudio": ["datalen", "output", "reserve"] },
		{ "cpu/cpu_alu": ["cpu_alu", "cpu_branch"] },
		//{ "cpu/fpu": ["fcr", "fpu"] },
		{ "cpu/icache": ["icache"] },
		{ "cpu/lsu": ["lsu"] },
		//{ "cpu/vfpu": ["colors", "convert", "gum", "matrix", "prefixes", "vector"] },
		//{ "ctrl": ["ctrl", "vblank"] },
		//{ "ctrl/idle": ["idle"] },
		//{ "ctrl/sampling": ["sampling"] },
		//{ "ctrl/sampling2": ["sampling2"] },
		//{ "display": ["display", "hcount", "vblankmulti"] },
		//{ "dmac": ["dmactest"] },
		//{ "font": ["altcharcode", "charglyphimage", "charglyphimageclip", "charimagerect", "charinfo", "find", "fontinfo", "fontinfobyindex", "fontlist", "fonttest", "newlib", "open", "openfile", "openmem", "optimum", "resolution", "shadowglyphimage", "shadowglyphimageclip", "shadowimagerect", "shadowinfo"] },
		//{ "gpu/callbacks": ["ge_callbacks"] },
		//{ "gpu/commands": ["basic", "blocktransfer", "material"] },
		//{ "gpu/complex": ["complex"] },
		//{ "gpu/displaylist": ["state"] },
		//{ "gpu/ge": ["break", "context", "edram", "get", "queue"] },
		//{ "gpu/reflection": ["reflection"] },
		//{ "gpu/rendertarget": ["rendertarget"] },
		//{ "gpu/signals": ["continue", "jumps", "pause", "simple", "suspend", "sync"] },
		//{ "gpu/simple": ["simple"] },
		//{ "gpu/triangle": ["triangle"] },
		//{ "hash": ["hash"] },
		//{ "hle": ["check_not_used_uids"] },
		//{ "intr": ["intr", "suspended", "waits"] },
		//{ "intr/vblank": ["vblank"] },
		//{ "io/cwd": ["cwd"] },
		//{ "io/directory": ["directory"] },
		//{ "io/file": ["file", "rename"] },
		//{ "io/io": ["io"] },
		//{ "io/iodrv": ["iodrv"] },
		//{ "kirk": ["kirk"] },
		//{ "loader/bss": ["bss"] },
		//{ "malloc": ["malloc"] },
		//{ "misc": ["dcache", "deadbeef", "libc", "sdkver", "testgp", "timeconv"] },
		//{ "modules/loadexec": ["loader"] },
		//{ "mstick": ["mstick"] },
		//{ "net/http": ["http"] },
		//{ "net/primary": ["ether"] },
		//{ "power": ["cpu", "freq", "power"] },
		//{ "power/volatile": ["lock", "trylock", "unlock"] },
		//{ "rtc": ["arithmetic", "convert", "lookup", "rtc"] },
		{ "string": ["string"] },
		//{ "sysmem": ["freesize", "memblock", "partition", "sysmem"] },
		//{ "threads/alarm": ["alarm"] },
		//{ "threads/alarm/cancel": ["cancel"] },
		//{ "threads/alarm/refer": ["refer"] },
		//{ "threads/alarm/set": ["set"] },
		//{ "threads/callbacks": ["callbacks", "cancel", "check", "count", "create", "delete", "exit", "notify", "refer"] },
		//{ "threads/events/cancel": ["cancel"] },
		//{ "threads/events/clear": ["clear"] },
		//{ "threads/events/create": ["create"] },
		//{ "threads/events/delete": ["delete"] },
		//{ "threads/events": ["events"] },
		//{ "threads/events/poll": ["poll"] },
		//{ "threads/events/refer": ["refer"] },
		//{ "threads/events/set": ["set"] },
		//{ "threads/events/wait": ["wait"] },
		//{ "threads/fpl": ["allocate", "cancel", "create", "delete", "fpl", "free", "priority", "refer", "tryallocate"] },
		//{ "threads/k0": ["k0"] },
		//{ "threads/lwmutex": ["create", "delete", "lock", "priority", "refer", "try", "try600", "unlock"] },
		//{ "threads/mbx/cancel": ["cancel"] },
		//{ "threads/mbx/create": ["create"] },
		//{ "threads/mbx/delete": ["delete"] },
		//{ "threads/mbx": ["mbx"] },
		//{ "threads/mbx/poll": ["poll"] },
		//{ "threads/mbx/priority": ["priority"] },
		//{ "threads/mbx/receive": ["receive"] },
		//{ "threads/mbx/refer": ["refer"] },
		//{ "threads/mbx/send": ["send"] },
		//{ "threads/msgpipe": ["cancel", "create", "data", "delete", "msgpipe", "receive", "refer", "send", "tryreceive", "trysend"] },
		//{ "threads/mutex": ["cancel", "create", "delete", "lock", "mutex", "priority", "refer", "try", "unlock"] },
		//{ "threads/scheduling": ["dispatch", "scheduling"] },
		//{ "threads/semaphores": ["cancel", "create", "delete", "fifo", "poll", "priority", "refer", "semaphores", "signal", "wait"] },
		//{ "threads/semaphores/semaphore_greater_than_zero": ["semaphore_greater_than_zero"] },
		//{ "threads/threads": ["change", "create", "exitstatus", "extend", "refer", "release", "rotate", "stackfree", "start", "suspend", "terminate", "threadend", "threads"] },
		//{ "threads/vpl": ["allocate", "cancel", "create", "delete", "fifo", "free", "order", "priority", "refer", "try", "vpl"] },
		//{ "threads/vtimers": ["cancelhandler", "create", "delete", "getbase", "gettime", "interrupt", "refer", "sethandler", "settime", "start", "stop", "vtimer"] },
		//{ "threads/wakeup": ["wakeup"] },
		//{ "umd/callbacks": ["umd"] },
		//{ "umd/io": ["umd_io"] },
		//{ "umd/raw_access": ["raw_access", "raw_acess"] },
		//{ "umd": ["register"] },
		//{ "umd/wait": ["wait"] },
		//{ "utility/msgdialog": ["abort", "dialog"] },
		//{ "utility/savedata": ["autosave", "filelist", "getsize", "idlist", "makedata", "sizes"] },
		//{ "utility/systemparam": ["systemparam"] },
		//{ "video/mpeg": ["basic"] },
		//{ "video/mpeg/ringbuffer": ["avail", "construct", "destruct", "memsize", "packnum"] },
		//{ "video/pmf": ["pmf"] },
		//{ "video/pmf_simple": ["pmf_simple"] },
		//{ "video/psmfplayer": ["basic", "create", "getpsmfinfo", "setpsmf", "setpsmfoffset", "settempbuf"] },
	];

	function normalizeString(string: string) {
		return string.replace(/(\r\n|\r)/gm, '\n').replace(/[\r\n\s]+$/gm, '');
	}

	function compareLines2(lines1, lines2) {
		return new difflib.SequenceMatcher(lines1, lines2).get_opcodes();
	}

	function compareText2(text1, text2) {
		return new difflib.SequenceMatcher(difflib.stringAsLines(text1), difflib.stringAsLines(text2)).get_opcodes();
	}

	function compareOutput(name: string, output: string, expected: string) {
		output = normalizeString(output);
		expected = normalizeString(expected);

		var outputLines = difflib.stringAsLines(output);
		var expectedLines = difflib.stringAsLines(expected);

		var equalLines = 0;
		var totalLines = expectedLines.length;
		console.groupCollapsed(name + ' (TEST RESULT DIFF)');

		var opcodes = compareText2(output, expected);

		for (var n = 0; n < opcodes.length; n++) {
			var opcode = <string>(opcodes[n]);
			var start1 = <number><any>(opcode[1]), end1 = <number><any>(opcode[2]);
			var start2 = <number><any>(opcode[3]), end2 = <number><any>(opcode[4]);
			var length1 = end1 - start1;
			var length2 = end2 - start2;
			switch (opcode[0]) {
				case 'equal':
					var showBegin = (n > 0);
					var showEnd = (n < opcodes.length - 1);
					var broke = false;
					for (var m = start1; m < end1; m++) {
						equalLines++;
						if (!((showBegin && m < start1 + 2) || (showEnd && m > end1 - 2))) {
							if (!broke) console.log(' ...');
							broke = true;
							continue;
						}
						console.log(sprintf('\u2714%04d %s', m + 1, outputLines[m]));
					}
					break;
				case 'delete':
					for (var m = start1; m < end1; m++) console.warn(sprintf('\u2716%04d %s', m + 1, outputLines[m]));
					break;
				case 'insert':
					for (var m = start2; m < end2; m++) console.info(sprintf(' %04d %s', m + 1, expectedLines[m]));
					break;
				case 'replace':
					if (length1 == length2) {
						for (var m = 0; m < length1; m++) {
							console.warn(sprintf('\u2716%04d %s', m + start1 + 1, outputLines[m + start1]));
							console.info(sprintf(' %04d %s', m + start2 + 1, expectedLines[m + start2]));
						}
					} else {
						for (var m = start1; m < end1; m++) console.warn(sprintf('\u2716%04d %s', m + 1, outputLines[m]));
						for (var m = start2; m < end2; m++) console.info(sprintf(' %04d %s', m + 1, expectedLines[m]));
					}
					break;
			}
			//console.log(opcode);
		}
		var distinctLines = totalLines - equalLines;

		var table = [];
		for (var n = 0; n < Math.max(outputLines.length, expectedLines.length); n++) {
			table[n + 1] = { output: outputLines[n], expected: expectedLines[n] };
		}

		console.groupEnd();

		console.groupCollapsed(name + ' (TEST RESULT TABLE)');
		if (console['table']) console['table'](table);
		console.groupEnd();


		assert(output == expected, "Output not expected. " + distinctLines + "/" + totalLines + " lines didn't match. Please check console for details.");
	}

	var groupCollapsed = false;

	tests.forEach((testGroup) => {
		_.keys(testGroup).forEach(testGroupName => {
			describe(testGroupName, function () {
				var testNameList: string[] = testGroup[testGroupName];

				testNameList.forEach(testName => {
					it(testName, function() {
						this.timeout(15000);

						var emulator = new Emulator();
						var file_base = './data/pspautotests_embed/tests/' + testGroupName + '/' + testName;
						var file_prx = file_base + '.prx';
						//var file_prx = file_base + '.iso';
						var file_expected = file_base + '.expected';

						if (!groupCollapsed) console.groupEnd();
						groupCollapsed = false;

						console.groupCollapsed('' + testName);

						return downloadFileAsync(file_prx).then((data_prx) => {
							return downloadFileAsync(file_expected).then((data_expected) => {

								var string_expected = Stream.fromArrayBuffer(data_expected).readString(data_expected.byteLength);

								return emulator.loadExecuteAndWaitAsync(MemoryAsyncStream.fromArrayBuffer(data_prx), file_prx, () => {
									var mount = new _vfs.MemoryVfs();
									emulator.fileManager.mount('disc0', mount);
									emulator.fileManager.mount('umd0', mount);
								}).then(() => {
									groupCollapsed = true;
									console.groupEnd();
									compareOutput(testName, emulator.emulatorVfs.output, string_expected);
									if (emulator.emulatorVfs.screenshot != null) {
										throw(new Error("Not implemented screenshot comparison"));
									}
								});
							});
						}, (err) => {
							console.error(err);
							assert.fail(err);
							return err;
						});
					});
				});
			});
		});
	});
});
