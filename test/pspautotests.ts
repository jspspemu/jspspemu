describe('pspautotests', function() {
	this.timeout(5000);

	var tests = ['cpu_alu', 'cpu_branch', 'dmactest', 'fcr', 'fpu', 'string', 'icache'];

	function normalizeString(string: string) {
		return string.replace(/\r\n/g, '\n').replace(/[\r\n]+$/m, '');
	}

	function compareOutput(name:string, output: string, expected: string) {
		output = normalizeString(output);
		expected = normalizeString(expected);

		var output_lines = output.split('\n');
		var expected_lines = expected.split('\n');

		console.groupCollapsed('TEST RESULT: ' + name);
		for (var n = 0; n < output_lines.length; n++) {
			var output_line = output_lines[n];
			var expected_line = expected_lines[n];
			if (output_line != expected_line) {
				console.warn(output_line);
				console.info(expected_line);
			} else {
				console.log(output_line);
			}
			//assert.equal(output_line, expect_line);
		}
		console.groupEnd();

		// @TODO: diff!
		assert.equal(output, expected);
	}

	tests.forEach((testName) => {
		var groupCollapsed = false;

		it(testName, () => {
			var emulator = new Emulator();
			var file_prx = 'samples/tests/' + testName + '.prx';
			var file_expected = 'samples/tests/' + testName + '.expected';

			if (!groupCollapsed) console.groupEnd();
			groupCollapsed = false;
			console.groupCollapsed('EXECUTING: ' + testName);
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
