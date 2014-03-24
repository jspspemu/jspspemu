describe('pbp', function () {
    it('should load fine', function () {
        var pbp = new format.pbp.Pbp();
        pbp.load(Stream.fromBase64(rtctestPbpBase64));
        var pspData = pbp.get('psp.data');
        assert.equal(pspData.length, 77550);
    });
});
//# sourceMappingURL=pbpTest.js.map
