describe('vfs', function () {
    it('should work', function (done) {
        var isoGzData = Stream.fromBase64(cubeGzIsoBase64).toUInt8Array();
        var isoData = new Zlib.RawInflate(isoGzData).decompress();
        var asyncStream = new MemoryAsyncStream(ArrayBufferUtils.fromUInt8Array(isoData));

        format.iso.Iso.fromStreamAsync(asyncStream).then(function (iso) {
            var vfs = new hle.vfs.IsoVfs(iso);
            return vfs.open("PSP_GAME/PARAM.SFO").readAllAsync().then(function (content) {
                var psf = format.psf.Psf.fromStream(Stream.fromArrayBuffer(content));
                assert.equal(psf.entriesByName["DISC_ID"], "UCJS10041");
                done();
            });
        }).catch(function (e) {
            console.error(e);
            console.error(e['stack']);
        });
    });
});
//# sourceMappingURL=vfsTest.js.map
