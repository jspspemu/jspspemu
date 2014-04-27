describe('pspautotests', function() {
	this.timeout(5000);

	var tests = [
		{ cpu: ['cpu_alu', 'cpu_branch', 'fcr', 'fpu', 'fpu2', 'lsu'] },
		{ vfpu: ['colors', 'convert', 'gum', 'matrix', 'prefixes', 'vector'] },
		{ intr: ['intr', 'suspended', 'waits', 'vblank/vblank'] },
		{ display: ['display', 'hcount', 'vblankmulti'] },
		{ gpu: ['ge_callbacks', 'signals/jumps', 'signals/simple'] },
		{ dmac: ['dmactest'] },
		{ loader: ['bss'] },
		{ misc: ['dcache', 'deadbeef', 'libc', 'sdkver', 'testgp', 'timeconv', 'string', 'icache', 'malloc'] },
		{ mstick: ['mstick'] },
		{ power: ['cpu', 'freq', 'power', 'lock', 'trylock', 'unlock'] },
		{ rtc: ['arithmetic', 'convert', 'lookup', 'rtc'] },
		{ sysmem: ['freesize', 'memblock', 'partition', 'sysmem'] },
		{ thread: ['change', 'create', 'exitstatus', 'extend', 'refer', 'release', 'rotate', 'stackfree', 'start', 'suspend', 'terminate', 'threadend', 'threads', 'k0'] },
		{ thread_callbacks: ['callbacks', 'cancel', 'check', 'count', 'create', 'delete', 'exit', 'notify', 'refer'] },
		{ thread_events: ['cancel', 'clear', 'create', 'delete', 'events', 'poll', 'refer', 'set', 'wait'] },
		{ thread_semaphore: ['cancel', 'create', 'delete', 'fifo', 'poll', 'priority', 'refer', 'semaphores', 'signal', 'wait'] },
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
						var file_base = 'samples/tests/' + testGroupName + '/' + testName;
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
									compareOutput(testName, emulator.context.output, string_expected);
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
