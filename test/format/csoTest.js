describe('cso', function () {
    it('should load fine', function (done) {
        var csoData = Stream.fromBase64(testCsoBase64).toUInt8Array();

        format.cso.Cso.fromStreamAsync(new MemoryAsyncStream(csoData.buffer)).then(function (cso) {
            //cso.readChunkAsync(0x10 * 0x800 - 10, 0x800).then(data => {
            return cso.readChunkAsync(0x10 * 0x800 - 10, 0x800).then(function (data) {
                var stream = Stream.fromArrayBuffer(data);
                stream.skip(10);
                var CD0001 = stream.readStringz(6);
                assert.equal(CD0001, '\u0001CD001');
                done();
            });
            //console.log(cso);
        }).catch(function (e) {
            //console.error(e);
            setImmediate(function () {
                throw (e);
            });
        });
    });

    it('should work with iso', function (done) {
        var csoData = Stream.fromBase64(testCsoBase64).toUInt8Array();

        format.cso.Cso.fromStreamAsync(new MemoryAsyncStream(csoData.buffer)).then(function (cso) {
            return format.iso.Iso.fromStreamAsync(cso).then(function (iso) {
                assert.equal(JSON.stringify(iso.children.slice(0, 4).map(function (node) {
                    return node.path;
                })), JSON.stringify(["path", "path/0", "path/1", "path/2"]));
                done();
            });
        }).catch(function (e) {
            //console.error(e);
            setImmediate(function () {
                throw (e);
            });
        });
    });
});
//# sourceMappingURL=csoTest.js.map
