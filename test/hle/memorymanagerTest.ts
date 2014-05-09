import _manager = require('../../src/hle/manager');

import MemoryAnchor = _manager.MemoryAnchor;
import MemoryPartition = _manager.MemoryPartition;

describe("memorymanager", () => {
    it("low", () => {
		var partition = new MemoryPartition("test", 0, 100, false);
        assert.equal(partition.getMaxContiguousFreeMemory(), 100);
        assert.equal(partition.getTotalFreeMemory(), 100);

		var p1 = partition.allocate(25, MemoryAnchor.Low);
		var p2 = partition.allocate(25, MemoryAnchor.Low);
		var p3 = partition.allocate(25, MemoryAnchor.Low);

        assert.equal(partition.getMaxContiguousFreeMemory(), 25);
        assert.equal(partition.getTotalFreeMemory(), 25);

        p2.unallocate();

        assert.equal(partition.getMaxContiguousFreeMemory(), 25);
        assert.equal(partition.getTotalFreeMemory(), 50);

        p3.unallocate();

        assert.equal(partition.getMaxContiguousFreeMemory(), 75);
        assert.equal(partition.getTotalFreeMemory(), 75);
	});

	it("low2", () => {
		var partition = new MemoryPartition("test", 0, 100, false);
		assert.equal(partition.getMaxContiguousFreeMemory(), 100);
		assert.equal(partition.getTotalFreeMemory(), 100);

		var p1 = partition.allocateLow(25);
		var p2 = partition.allocateLow(25);
		var p3 = partition.allocateLow(25);

		assert.equal(partition.getTotalFreeMemory(), 25);
		assert.equal(partition.getMaxContiguousFreeMemory(), 25);

		p3.deallocate();

		assert.equal(partition.getTotalFreeMemory(), 50);
		assert.equal(partition.getMaxContiguousFreeMemory(), 50);

		p1.unallocate();

		console.info(partition);

		assert.equal(partition.getTotalFreeMemory(), 75);
		assert.equal(partition.getMaxContiguousFreeMemory(), 50);
	});

	it("high", () => {
		var partition = new MemoryPartition("test", 0, 100, false);
		assert.equal(partition.getMaxContiguousFreeMemory(), 100);
		assert.equal(partition.getTotalFreeMemory(), 100);

		var p1 = partition.allocateHigh(25);
		var p2 = partition.allocateHigh(25);
		var p3 = partition.allocateHigh(25);

		assert.equal(partition.getTotalFreeMemory(), 25);
		assert.equal(partition.getMaxContiguousFreeMemory(), 25);

		p3.deallocate();

		assert.equal(partition.getTotalFreeMemory(), 50);
		assert.equal(partition.getMaxContiguousFreeMemory(), 50);

		p1.unallocate();

		assert.equal(partition.getTotalFreeMemory(), 75);
		assert.equal(partition.getMaxContiguousFreeMemory(), 50);
	});
});
