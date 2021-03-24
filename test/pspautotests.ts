

import {MemoryAsyncStream, Stream} from "../src/global/stream";
import {assert, before, after, it, describe} from "./@microtest";

export function ref() { } // Workaround to allow typescript to include this module

import {downloadFileAsync} from "../src/global/async";
import {logger, LoggerLevel, loggerPolicies, sprintf} from "../src/global/utils";
import {ArrayUtils} from "../src/global/math";
import {difflib} from "../src/util/difflib";
import {Emulator} from "../src/emu/emulator";
import {MemoryVfs} from "../src/hle/vfs/vfs_memory";

const mlogger = logger.named('');

describe('pspautotests', function () {
	//this.timeout(5000);

    const tests = [
		//{ "audio/atrac": ["atractest", "decode", "ids", "resetting", "setdata"] },
		//{ "audio/mp3": ["mp3test"] },
		//{ "audio/sascore": ["adsrcurve", "getheight", "keyoff", "keyon", "noise", "outputmode", "pause", "pcm", "pitch", "sascore", "setadsr", "vag"] },
		//{ "audio/sceaudio": ["datalen", "output", "reserve"] },
        { "cpu/cpu_alu": ["cpu_alu"] },
		//{ "cpu/cpu_alu": ["cpu_alu", "cpu_branch"] },
		//{ "cpu/fpu": ["fpu"] },
		//{ "cpu/fpu": ["fcr", "fpu"] },
		{ "cpu/icache": ["icache"] },
		{ "cpu/lsu": ["lsu"] },
		{ "cpu/vfpu": ["colors", "gum", "matrix", "vavg"] },
		//{ "cpu/vfpu": ["colors", "convert", "gum", "matrix", "prefixes", "vector", "vregs", "vavg"] },
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
		{ "loader/bss": ["bss"] },
		{ "malloc": ["malloc"] },
		//{ "misc": ["dcache", "testgp"] },
		//{ "misc": ["libc", "testgp"] },
		{ "misc": ["testgp"] },
		//{ "misc": ["dcache", "deadbeef", "libc", "sdkver", "testgp", "timeconv"] },
		//{ "modules/loadexec": ["loader"] },
		//{ "mstick": ["mstick"] },
		//{ "net/http": ["http"] },
		//{ "net/primary": ["ether"] },
		//{ "power": ["cpu", "freq", "power"] },
		//{ "power/volatile": ["lock", "trylock", "unlock"] },
		//{ "rtc": ["arithmetic", "convert", "lookup", "rtc"] },
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
		{ "threads/k0": ["k0"] },
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
		//{ "threads/threads": ["create"] },
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

	// noinspection JSUnusedLocalSymbols
    function compareLines2(lines1:string[], lines2:string[]) {
		return new (<any>difflib.SequenceMatcher)(lines1, lines2).get_opcodes();
	}

	function compareText2(text1:string, text2:string) {
		return new (<any>difflib.SequenceMatcher)(difflib.stringAsLines(text1), difflib.stringAsLines(text2)).get_opcodes();
	}

	function compareOutput(name: string, output: string, expected: string) {
		output = normalizeString(output);
		expected = normalizeString(expected);

		if (output == expected) return;

        const outputLines = difflib.stringAsLines(output);
        const expectedLines = difflib.stringAsLines(expected);

        let equalLines = 0;
        const totalLines = expectedLines.length;
        mlogger.groupCollapsed(name + ' (TEST RESULT DIFF)');

        const opcodes = compareText2(output, expected);

        for (let n = 0; n < opcodes.length; n++) {
            const opcode = <string>(opcodes[n]);
            const start1 = <number><any>(opcode[1]), end1 = <number><any>(opcode[2]);
            const start2 = <number><any>(opcode[3]), end2 = <number><any>(opcode[4]);
            const length1 = end1 - start1;
            const length2 = end2 - start2;
            switch (opcode[0]) {
				case 'equal':
                    const showBegin = (n > 0);
                    const showEnd = (n < opcodes.length - 1);
                    let broke = false;
                    for (let m = start1; m < end1; m++) {
						equalLines++;
						if (!((showBegin && m < start1 + 2) || (showEnd && m > end1 - 2))) {
							if (!broke) mlogger.log(' ...');
							broke = true;
							continue;
						}
						mlogger.log(sprintf('\u2714%04d %s', m + 1, outputLines[m]));
					}
					break;
				case 'delete':
					for (let m = start1; m < end1; m++) mlogger.warn(sprintf('\u2716%04d %s', m + 1, outputLines[m]));
					break;
				case 'insert':
					for (let m = start2; m < end2; m++) mlogger.info(sprintf(' %04d %s', m + 1, expectedLines[m]));
					break;
				case 'replace':
					if (length1 == length2) {
						for (let m = 0; m < length1; m++) {
							mlogger.warn(sprintf('\u2716%04d %s', m + start1 + 1, outputLines[m + start1]));
							mlogger.info(sprintf(' %04d %s', m + start2 + 1, expectedLines[m + start2]));
						}
					} else {
						for (let m = start1; m < end1; m++) mlogger.warn(sprintf('\u2716%04d %s', m + 1, outputLines[m]));
						for (let m = start2; m < end2; m++) mlogger.info(sprintf(' %04d %s', m + 1, expectedLines[m]));
					}
					break;
			}
			//mlogger.log(opcode);
		}
        const distinctLines = totalLines - equalLines;

        const table: any[] = [];
        for (let n = 0; n < Math.max(outputLines.length, expectedLines.length); n++) {
			table[n + 1] = { output: outputLines[n], expected: expectedLines[n] };
		}

		mlogger.groupEnd();

		mlogger.groupCollapsed(name + ' (TEST RESULT TABLE)');
		if ((<any>mlogger)['table']) {
			(<any>mlogger)['table'](table);
		} else {
            let totalOut = 0
            let totalDiff = 0
			for (let n = 1; n < table.length; n++) {
				if (table[n].output != table[n].expected) {
                    totalDiff++
                    if (totalOut < 5) {
                        totalOut++
                        const out = table[n].output
                        const exp = table[n].expected
                        if (out === undefined || out == '') {
                            console.log('MISSING LINE:', exp);
                        } else {
                            console.log('NOT EQUAL:', out, exp);
                        }
                    }
				}
			}
		    if (totalDiff > totalOut) {
		        console.log(` AND ${totalDiff - totalOut} more...`)
            }
		}
		mlogger.groupEnd();


		assert.ok(output == expected, "Output not expected. " + distinctLines + "/" + totalLines + " lines didn't match. Please check mlogger for details.");
	}

    let groupCollapsed = false;

    tests.forEach((testGroup) => {
		ArrayUtils.keys(testGroup).forEach(testGroupName => {
			describe(testGroupName, function () {
                const testNameList: any[] = (<any>testGroup)[testGroupName];
                loggerPolicies.setNameMinLoggerLevel("elf.psp", LoggerLevel.ERROR)

                testNameList.forEach((testName:any) => {
					it(testName, async () => {
						// noinspection JSPotentiallyInvalidUsageOfThis
                        //this.timeout(15000);

                        const emulator = new Emulator();
                        //emulator.interpreted = true
                        emulator.interpreted = false
                        const file_base = `./data/pspautotests/tests/${testGroupName}/${testName}`;
                        const file_prx = file_base + '.prx';
                        //const file_prx = file_base + '.iso';
                        const file_expected = file_base + '.expected';

                        if (!groupCollapsed) mlogger.groupEnd();
						groupCollapsed = false;

						//mlogger.groupCollapsed('' + testName);

                        try {
                            const data_prx = await downloadFileAsync(file_prx)
                            const data_expected = await downloadFileAsync(file_expected)

                            const string_expected = Stream.fromArrayBuffer(data_expected).readString(data_expected.byteLength);

                            await emulator.loadExecuteAndWaitAsync(MemoryAsyncStream.fromArrayBuffer(data_prx), file_prx, () => {
                                const mount = new MemoryVfs();
                                emulator.fileManager.mount('disc0', mount);
                                emulator.fileManager.mount('umd0', mount);
                            })

                            groupCollapsed = true;
                            //mlogger.groupEnd();
                            compareOutput(testName, emulator.emulatorVfs.output, string_expected);
                        } catch (err) {
							console.log(file_prx);
							console.error(err);
							assert.fail(err);
							return err;
						}

                        if (emulator.emulatorVfs.screenshot != null) {
                            throw new Error("Not implemented screenshot comparison")
                        }
					});
				});
			});
		});
	});
});
