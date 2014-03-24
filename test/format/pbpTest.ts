describe('pbp', () => {
	it('should load fine', () => {
		var pbp = new format.pbp.Pbp();
		pbp.load(Stream.fromBase64(rtctestPbpBase64));
		var pspData = pbp.get('psp.data');
		assert.equal(pspData.length, 77550);
	});
});
