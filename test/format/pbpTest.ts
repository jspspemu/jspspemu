describe('pbp', () => {
	var rtctestPbpArrayBuffer: ArrayBuffer;

	before((done) => {
		downloadFileAsync('samples/rtctest.pbp').then((data) => {
			rtctestPbpArrayBuffer = data;
			done();
		});
	});

	it('should load fine', () => {
		var pbp = new format.pbp.Pbp();
		pbp.load(Stream.fromArrayBuffer(rtctestPbpArrayBuffer));
		var pspData = pbp.get('psp.data');
		assert.equal(pspData.length, 77550);
	});
});
