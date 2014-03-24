describe('utils', () => {
    
    describe('string repeat', () => {
        it('simple', () => {
            assert.equal('', String_repeat('a', 0));
            assert.equal('a', String_repeat('a', 1));
            assert.equal('aaaa', String_repeat('a', 4));
        });
    });

    describe('Binary layouts', () => {
        it('should read int32', () => {
            var stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            assert.equal(Int32.read(stream), 0x04030201);
        });

        it('should read int16', () => {
            var stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            assert.equal(Int16.read(stream), 0x0201);
            assert.equal(Int16.read(stream), 0x0403);
        });

        it('should read simple struct', () => {
            var stream = Stream.fromArray([0x01, 0x02, 0x03, 0x04]);
            var MyStruct = Struct.create([
                { name: 'item1', type: Int16 },
                { name: 'item2', type: Int16 }
            ]);
            assert.equal(JSON.stringify(MyStruct.read(stream)), JSON.stringify({ item1: 0x0201, item2: 0x0403 }));
        });
    }); 
}); 
