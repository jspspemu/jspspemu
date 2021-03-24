

import {assert, before, after, it, describe} from "../@microtest";
import {MemoryAnchor, MemoryPartition} from "../../src/hle/manager/memory";

export function ref() { } // Workaround to allow typescript to include this module

describe("memorymanager", () => {
    it("low", () => {
        const partition = new MemoryPartition("test", 0, 100, false);
        assert.equal(partition.getMaxContiguousFreeMemory(), 100);
        assert.equal(partition.getTotalFreeMemory(), 100);

        // noinspection JSUnusedLocalSymbols
        const p1 = partition.allocate(25, MemoryAnchor.Low);
        const p2 = partition.allocate(25, MemoryAnchor.Low);
        const p3 = partition.allocate(25, MemoryAnchor.Low);

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
        const partition = new MemoryPartition("test", 0, 100, false);
        assert.equal(partition.getMaxContiguousFreeMemory(), 100);
		assert.equal(partition.getTotalFreeMemory(), 100);

        const p1 = partition.allocateLow(25);
        // noinspection JSUnusedLocalSymbols
        const p2 = partition.allocateLow(25);
        const p3 = partition.allocateLow(25);

        assert.equal(partition.getTotalFreeMemory(), 25);
		assert.equal(partition.getMaxContiguousFreeMemory(), 25);

		p3.deallocate();

		assert.equal(partition.getTotalFreeMemory(), 50);
		assert.equal(partition.getMaxContiguousFreeMemory(), 50);

		p1.unallocate();

		//console.info(partition);

		assert.equal(partition.getTotalFreeMemory(), 75);
		assert.equal(partition.getMaxContiguousFreeMemory(), 50);
	});

	it("high", () => {
        const partition = new MemoryPartition("test", 0, 100, false);
        assert.equal(partition.getMaxContiguousFreeMemory(), 100);
		assert.equal(partition.getTotalFreeMemory(), 100);

        const p1 = partition.allocateHigh(25);
        const p2 = partition.allocateHigh(25);
        const p3 = partition.allocateHigh(25);

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
