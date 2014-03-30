describe('pspautotests', function() {
	this.timeout(5000);

	var tests = ['cpu_alu', 'cpu_branch', 'dmactest', 'fcr', 'fpu', 'string', 'icache'];

	function compareOutput(output: string, expected: string) {
		// @TODO: diff!
		assert.equal(output, expected);
	}

	tests.forEach((testName) => {
		it(testName, (done) => {
			var emulator = new Emulator();
			var file_prx = 'samples/tests/' + testName + '.prx';
			var file_expected = 'samples/tests/' + testName + '.expected';
			return downloadFileAsync(file_prx).then((data_prx) => {
				return downloadFileAsync(file_expected).then((data_expected) => {
					var string_expected = String.fromCharCode.apply(null, new Uint8Array(data_expected));

					return emulator.loadExecuteAndWaitAsync(MemoryAsyncStream.fromArrayBuffer(data_prx), file_prx).then(() => {
						compareOutput(emulator.context.output, string_expected);
						done();
					});
				});
			}).catch(done);

			//emulator.executeFileAsync
		});
	});
});
