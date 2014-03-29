describe('vfs', () => {
	var isoData: Uint8Array;

	before((done) => {
		downloadFileAsync('samples/cube.iso').then((data) => {
			isoData = new Uint8Array(data);
			done();
		});
	});

	it('should work', (done) => {
		var asyncStream = new MemoryAsyncStream(ArrayBufferUtils.fromUInt8Array(isoData));

		format.iso.Iso.fromStreamAsync(asyncStream).then(iso => {
			var vfs = new hle.vfs.IsoVfs(iso);
			return vfs.openAsync("PSP_GAME/PARAM.SFO", hle.vfs.FileOpenFlags.Read, parseInt('777', 8)).then(file => {
				return file.readAllAsync().then(content => {
					var psf = format.psf.Psf.fromStream(Stream.fromArrayBuffer(content));
					assert.equal(psf.entriesByName["DISC_ID"], "UCJS10041");
					done();
				});
			});
		}).then(<any>done, <any>done);
	});
}); 