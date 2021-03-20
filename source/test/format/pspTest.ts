import {Stream} from "../../src/global/stream";

export function ref() { } // Workaround to allow typescript to include this module

import {downloadFileAsync} from "../../src/global/async";
import {decrypt} from "../../src/hle/elf_crypted_prx";

describe('psp', () => {
	var testInputStream: Stream;
	var testExpectedStream: Stream;

	before(() => {
		return downloadFileAsync('data/samples/TEST_EBOOT.BIN').then((data) => {
			testInputStream = Stream.fromArrayBuffer(data);
			return downloadFileAsync('data/samples/TEST_BOOT.BIN').then((data) => {
				testExpectedStream = Stream.fromArrayBuffer(data);
			});
		});
	});

	it('should load fine', () => {
		var resultByteArray = decrypt(testInputStream).slice().readAllBytes();
		var expectedByteArray = testExpectedStream.slice().readAllBytes();
		assert.equal(resultByteArray.length, expectedByteArray.length);
		for (var n = 0; n < resultByteArray.length; n++) {
			if (resultByteArray[n] != expectedByteArray[n]) {
				assert.equal(resultByteArray[n], expectedByteArray[n], "failed at " + n + ' with total length ' + resultByteArray.length);
			}
		}
	});
});
