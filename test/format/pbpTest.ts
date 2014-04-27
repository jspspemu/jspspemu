import _pbp = require('../../src/format/pbp');

import Pbp = _pbp.Pbp;

describe('pbp', () => {
	var rtctestPbpArrayBuffer: ArrayBuffer;

	before(() => {
		return downloadFileAsync('samples/rtctest.pbp').then((data) => {
			rtctestPbpArrayBuffer = data;
		});
	});

	it('should load fine', () => {
		var pbp = new Pbp();
		pbp.load(Stream.fromArrayBuffer(rtctestPbpArrayBuffer));
		var pspData = pbp.get('psp.data');
		assert.equal(pspData.length, 77550);
	});
});
