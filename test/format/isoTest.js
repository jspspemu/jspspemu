describe('iso', function () {
    it('should load fine', function (done) {
        var isoGzData = Stream.fromBase64(cubeGzIsoBase64).toUInt8Array();
        var isoData = new Zlib.RawInflate(isoGzData).decompress();
        var asyncStream = new MemoryAsyncStream(ArrayBufferUtils.fromUInt8Array(isoData));

        format.iso.Iso.fromStreamAsync(asyncStream).then(function (iso) {
            assert.equal(JSON.stringify(iso.children.map(function (item) {
                return item.path;
            })), JSON.stringify(["PSP_GAME", "PSP_GAME/PARAM.SFO", "PSP_GAME/SYSDIR", "PSP_GAME/SYSDIR/BOOT.BIN", "PSP_GAME/SYSDIR/EBOOT.BIN"]));

            done();
        }).catch(function (e) {
            throw (e);
        });
    });
});
//# sourceMappingURL=isoTest.js.map
