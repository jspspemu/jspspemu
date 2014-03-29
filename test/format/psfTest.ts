describe('psf', () => {
	var rtctestPsfArrayBuffer: ArrayBuffer;

	before((done) => {
		downloadFileAsync('samples/rtctest.psf').then((data) => {
			rtctestPsfArrayBuffer = data;
			done();
		});
	});


	it('should load fine', () => {
		var psf = new format.psf.Psf();
		psf.load(Stream.fromArrayBuffer(rtctestPsfArrayBuffer));
		assert.equal(psf.entriesByName['BOOTABLE'], 1);
		assert.equal(psf.entriesByName['CATEGORY'], 'MG');
		assert.equal(psf.entriesByName['DISC_ID'], 'UCJS10041');
		assert.equal(psf.entriesByName['DISC_VERSION'], '1.00');
		assert.equal(psf.entriesByName['PARENTAL_LEVEL'], 1);
		assert.equal(psf.entriesByName['PSP_SYSTEM_VER'], '1.00');
		assert.equal(psf.entriesByName['REGION'], 32768);
		assert.equal(psf.entriesByName['TITLE'], 'rtctest');
	});
});
