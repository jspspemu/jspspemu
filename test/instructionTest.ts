describe('instruction lookup', () => {
	var instructions = core.cpu.Instructions.instance;

    it('should accept locate instruction by name', () => {
        assert.equal(instructions.findByName('addi').name, 'addi');
        assert.equal(instructions.findByName('lui').name, 'lui');
        assert.equal(instructions.findByName('syscall').name, 'syscall');
        assert.equal(instructions.findByName('mflo').name, 'mflo');
        assert.equal(instructions.findByName('sb').name, 'sb');
    });

    it('should accept locate instruction by data', () => {
        assert.equal(instructions.findByData(0x0C000000).name, 'jal');
        assert.equal(instructions.findByData(0x3C100890).name, 'lui');
        assert.equal(instructions.findByData(0x00081C4C).name, 'syscall');
        assert.equal(instructions.findByData(0x00001012).name, 'mflo');
        assert.equal(instructions.findByData(0xA0410004).name, 'sb');
    });
});