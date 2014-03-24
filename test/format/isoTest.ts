describe('iso', () => {
	it('should load fine', (done) => {
		var isoGzData = Stream.fromBase64(cubeGzIsoBase64).toUInt8Array();
		var isoData = new Zlib.RawInflate(isoGzData).decompress();
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
