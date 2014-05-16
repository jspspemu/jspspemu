import _vag = require('../../src/format/vag');

describe('vag', () => {
	var vagData: Uint8Array;
	var vagDataExpected: Uint8Array;

	before(() => {
		return downloadFileAsync('samples/sample.vag').then((data) => {
			vagData = new Uint8Array(data);
			return downloadFileAsync('samples/sample.vag.expected').then((data) => {
				vagDataExpected = new Uint8Array(data);
			});
		});
	});

	it('should load fine', () => {
		var vag = new _vag.VagSoundSource(Stream.fromUint8Array(vagData), 0);
		var expected = Stream.fromUint8Array(vagDataExpected)
		vag.reset();
		expected.position = 0;
		var resultArray = [];
		var expectedArray = [];
		while (vag.hasMore) {
			var sample = vag.getNextSample();
			var expectedLeft = expected.readInt16();
			var expectedRight = expected.readInt16();
			//console.log(n, sample.left, "=", expectedLeft);

			resultArray.push(sample.left, sample.right);
			expectedArray.push(expectedLeft, expectedRight);
		}
		assert.equal(resultArray.join(','), expectedArray.join(','));
	});
});
