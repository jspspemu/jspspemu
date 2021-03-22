import {NumberDictionary, sprintf} from "../../global/utils";

enum MemoryPartitions {
    Kernel0 = 0,
    User = 2,
    VolatilePartition = 5,
    UserStacks = 6,
}

export enum MemoryAnchor {
    Low = 0,
    High = 1,
    Address = 2,
    LowAligned = 3,
    HighAligned = 4,
}

export class OutOfMemoryError implements Error {
	constructor(public message: string, public name: string = 'OutOfMemoryError') { }
}

export class MemoryPartition {
    private _childPartitions: MemoryPartition[] = [];

    get size() { return this.high - this.low; }

    get root():MemoryPartition { return (this.parent) ? this.parent.root : this; }

    get childPartitions() {
        if (this._childPartitions.length == 0) this._childPartitions.push(new MemoryPartition("", this.low, this.high, false));
        return this._childPartitions;
    }

    contains(address: number) {
        return address >= this.low && address < this.high;
    }

    constructor(public name: string, public low: number, public high: number, public allocated: boolean, public parent?: MemoryPartition) {
	}

	deallocate() {
		this.allocated = false;
		if (this.parent) {
			this.parent.cleanup();
		}
	}

    allocate(size: number, anchor: MemoryAnchor, address: number = 0, name: string = '') {
		switch (anchor) {
			case MemoryAnchor.LowAligned: // @TODO: aligned!
			case MemoryAnchor.Low: return this.allocateLow(size, name);
			case MemoryAnchor.High: return this.allocateHigh(size, name);
			case MemoryAnchor.Address: return this.allocateSet(size, address, name);
            default: throw (new Error(sprintf("Not implemented anchor %d:%s", anchor, MemoryAnchor[anchor])));
        }
    }

	allocateSet(size: number, addressLow: number, name: string = '') {
        const childs = this.childPartitions;
        const addressHigh = addressLow + size;

        if (!this.contains(addressLow) || !this.contains(addressHigh)) {
			throw (new OutOfMemoryError(sprintf("Can't allocate [%08X-%08X] in [%08X-%08X]", addressLow, addressHigh, this.low, this.high)));
        }

        for (let n = 0; n < childs.length; n++) {
            const child = childs[n];
            if (!child.contains(addressLow)) continue;
            if (child.allocated) throw (new Error("Memory already allocated"));
            if (!child.contains(addressHigh - 1)) throw (new Error("Can't fit memory"));

            const p1 = new MemoryPartition('', child.low, addressLow, false, this);
            const p2 = new MemoryPartition(name, addressLow, addressHigh, true, this);
            const p3 = new MemoryPartition('', addressHigh, child.high, false, this);

            childs.splice(n, 1, p1, p2, p3);

            this.cleanup();
            return p2;
        }
        console.log(sprintf('address: %08X, size: %d', addressLow, size));
        console.log(this);
        throw (new Error("Can't find the segment"));
    }

	allocateLow(size: number, name: string = '') {
        return this.allocateLowHigh(size, true, name);
    }

	allocateHigh(size: number, name: string = '', alignment: number = 1) {
        return this.allocateLowHigh(size, false, name);
	}

	private _validateChilds() {
        const childs = this._childPartitions;

        if (childs[0].low != this.low) throw(new Error("Invalid state [1]"));
		if (childs[childs.length - 1].high != this.high) throw (new Error("Invalid state [2]"));

		for (let n = 0; n < childs.length - 1; n++) {
			if (childs[n + 0].high != childs[n + 1].low) throw (new Error("Invalid state [3] -> " + n));
		}
	}

	private allocateLowHigh(size: number, low: boolean, name: string = '') {
        const childs = this.childPartitions
        for (let n = 0; n < childs.length; n++) {
            const child = childs[n]
            if (child.allocated) continue
            if (child.size < size) continue

            let allocatedChild: MemoryPartition
            if (low) {
                const p1 = child.low
                const p2 = child.low + size
                const p3 = child.high
                allocatedChild = new MemoryPartition(name, p1, p2, true, this)
                const unallocatedChild = new MemoryPartition("", p2, p3, false, this)
				childs.splice(n, 1, allocatedChild, unallocatedChild)
            } else {
                const p1 = child.low
                const p2 = child.high - size
                const p3 = child.high
                const unallocatedChild = new MemoryPartition("", p1, p2, false, this)
                allocatedChild = new MemoryPartition(name, p2, p3, true, this)
				childs.splice(n, 1, unallocatedChild, allocatedChild)
            }
            this.cleanup();
            return allocatedChild
        }

        //console.info(this);
        throw (new OutOfMemoryError("Can't find a partition with " + size + " available"));
    }

    unallocate() {
        this.name = '';
        this.allocated = false;
        if (this.parent) this.parent.cleanup();
    }

	private cleanup() {
        const startTotalFreeMemory = this.getTotalFreeMemory();

        //this._validateChilds();

        // join contiguous free memory
        const childs = this.childPartitions;
        if (childs.length >= 2) {
            for (let n = 0; n < childs.length - 1; n++) {
                const child = childs[n + 0];
                const c1 = childs[n + 1];
				if (!child.allocated && !c1.allocated) {
					//console.log('joining', child, c1, child.low, c1.high);
					childs.splice(n, 2, new MemoryPartition("", child.low, c1.high, false, this));
                    n--;
                }
            }
        }
        // remove empty segments
		for (let n = 0; n < childs.length; n++) {
            const child = childs[n];
            if (!child.allocated && child.size == 0) childs.splice(n, 1);
		}

		//this._validateChilds();

        const endTotalFreeMemory = this.getTotalFreeMemory();

        if (endTotalFreeMemory != startTotalFreeMemory) {
			console.log('assertion failed! : ' + startTotalFreeMemory + ',' + endTotalFreeMemory);
		}
    }

    get nonAllocatedPartitions() {
        return this.childPartitions.filter(item => !item.allocated);
    }

    getTotalFreeMemory() {
        return this.nonAllocatedPartitions.reduce<number>((prev, item) => item.size + prev, 0);
    }

	getMaxContiguousFreeMemory() {
		return this.nonAllocatedPartitions.max(item => item.size).size;
    }

    private findFreeChildWithSize(size: number) {
    }
}

export class MemoryManager {
    memoryPartitionsUid: NumberDictionary<MemoryPartition> = {};

	constructor() {
        this.init();
    }

    private init() {
        this.memoryPartitionsUid[MemoryPartitions.Kernel0] = new MemoryPartition("Kernel Partition 1", 0x88000000, 0x88300000, false);
        //this.memoryPartitionsUid[MemoryPartitions.User] = new MemoryPartition("User Partition", 0x08800000, 0x08800000 + 0x100000 * 32, false);
        //this.memoryPartitionsUid[MemoryPartitions.UserStacks] = new MemoryPartition("User Stacks Partition", 0x08800000, 0x08800000 + 0x100000 * 32, false);
        this.memoryPartitionsUid[MemoryPartitions.User] = new MemoryPartition("User Partition", 0x08800000, 0x08800000 + 0x100000 * 24, false);
        this.memoryPartitionsUid[MemoryPartitions.UserStacks] = new MemoryPartition("User Stacks Partition", 0x08800000, 0x08800000 + 0x100000 * 24, false);
        this.memoryPartitionsUid[MemoryPartitions.VolatilePartition] = new MemoryPartition("Volatile Partition", 0x08400000, 0x08800000, false);
	}

	get kernelPartition() {
		return this.memoryPartitionsUid[MemoryPartitions.Kernel0];
	}

    get userPartition() {
        return this.memoryPartitionsUid[MemoryPartitions.User];
    }

    get stackPartition() {
        return this.memoryPartitionsUid[MemoryPartitions.UserStacks];
    }
}
