describe('iso', () => {
	var isoData: Uint8Array;

	before((done) => {
		downloadFileAsync('samples/cube.iso').then((data) => {
			isoData = new Uint8Array(data);
			done();
		});
	});

	it('should load fine', (done) => {
		var asyncStream = new MemoryAsyncStream(ArrayBufferUtils.fromUInt8Array(isoData));

		format.iso.Iso.fromStreamAsync(asyncStream).then(iso => {
            assert.equal(
                JSON.stringify(iso.children.map(item => item.path)),
                JSON.stringify(["PSP_GAME", "PSP_GAME/PARAM.SFO", "PSP_GAME/SYSDIR", "PSP_GAME/SYSDIR/BOOT.BIN", "PSP_GAME/SYSDIR/EBOOT.BIN"])
            );

            done();
		}).catch(e => {
			throw(e);
		});
	});
});
