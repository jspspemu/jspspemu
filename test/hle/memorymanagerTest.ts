describe("memory manager", () => {
    it("should work", () => {
		var partition = new hle.MemoryPartition("test", 0, 100, false);
        assert.equal(partition.getMaxContiguousFreeMemory(), 100);
        assert.equal(partition.getTotalFreeMemory(), 100);

        var p1 = partition.allocate(25, hle.MemoryAnchor.Low);
		var p2 = partition.allocate(25, hle.MemoryAnchor.Low);
		var p3 = partition.allocate(25, hle.MemoryAnchor.Low);

        assert.equal(partition.getMaxContiguousFreeMemory(), 25);
        assert.equal(partition.getTotalFreeMemory(), 25);

        p2.unallocate();

        assert.equal(partition.getMaxContiguousFreeMemory(), 25);
        assert.equal(partition.getTotalFreeMemory(), 50);

        p3.unallocate();

        assert.equal(partition.getMaxContiguousFreeMemory(), 75);
        assert.equal(partition.getTotalFreeMemory(), 75);
    });
});