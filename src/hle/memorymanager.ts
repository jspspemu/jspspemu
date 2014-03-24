module hle {
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

    export class MemoryPartition {
        private _childPartitions: MemoryPartition[] = [];

        get size() { return this.high - this.low; }

        get root() { return (this.parent) ? this.parent.root : this; }

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
            var childs = this.childPartitions;
            var addressHigh = addressLow + size;

            if (!this.contains(addressLow) || !this.contains(addressHigh)) {
                throw (new Error(sprintf("Can't allocate [%08X-%08X] in [%08X-%08X]", addressLow, addressHigh, this.low, this.high)));
            }

            for (var n = 0; n < childs.length; n++) {
                var child = childs[n];
                if (!child.contains(addressLow)) continue;
                if (child.allocated) throw (new Error("Memory already allocated"));
                if (!child.contains(addressHigh - 1)) throw (new Error("Can't fit memory"));

                var p1 = new MemoryPartition('', child.low, addressLow, false, this);
                var p2 = new MemoryPartition(name, addressLow, addressHigh, true, this);
                var p3 = new MemoryPartition('', addressHigh, child.high, false, this);

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

		allocateHigh(size: number, name: string = '') {
            return this.allocateLowHigh(size, false, name);
        }

		private allocateLowHigh(size: number, low: boolean, name: string = '') {
            var childs = this.childPartitions;
            for (var n = 0; n < childs.length; n++) {
                var child = childs[n];
                if (child.allocated) continue;
                if (child.size < size) continue;

                if (low) {
                    var p1 = child.low;
                    var p2 = child.low + size;
                    var p3 = child.high;
                    var allocatedChild = new MemoryPartition(name, p1, p2, true, this);
                    var unallocatedChild = new MemoryPartition("", p2, p3, false, this);
                } else {
                    var p1 = child.low;
                    var p2 = child.high - size;
                    var p3 = child.high;
                    var unallocatedChild = new MemoryPartition("", p1, p2, false, this);
					var allocatedChild = new MemoryPartition(name, p2, p3, true, this);
                }
                childs.splice(n, 1, allocatedChild, unallocatedChild);
                this.cleanup();
                return allocatedChild;
            }

            console.info(this);
            throw ("Can't find a partition with " + size + " available");
        }

        unallocate() {
            this.name = '';
            this.allocated = false;
            if (this.parent) this.parent.cleanup();
        }

        private cleanup() {
            // join contiguous free memory
            var childs = this.childPartitions;
            if (childs.length >= 2) {
                for (var n = 0; n < childs.length - 1; n++) {
                    var child = childs[n + 0];
                    var c1 = childs[n + 1];
                    if (!child.allocated && !c1.allocated) {
                        childs.splice(n, 2, new MemoryPartition("", child.low, c1.high, false, this));
                        n--;
                    }
                }
            }
            // remove empty segments
            for (var n = 0; n < childs.length; n++) {
                var child = childs[n];
                if (!child.allocated && child.size == 0) childs.splice(n, 1);
            }
        }

        get nonAllocatedPartitions() {
            return this.childPartitions.filter(item => !item.allocated);
        }

        getTotalFreeMemory() {
            return this.nonAllocatedPartitions.reduce<number>((prev, item) => item.size + prev, 0);
        }

        getMaxContiguousFreeMemory() {
            var items = this.nonAllocatedPartitions.sort((a, b) => a.size - b.size);
            return (items.length) ? items[0].size : 0;
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
            this.memoryPartitionsUid[MemoryPartitions.User] = new MemoryPartition("User Partition", 0x08800000, 0x08800000 + 0x100000 * 32, false);
            this.memoryPartitionsUid[MemoryPartitions.UserStacks] = new MemoryPartition("User Stacks Partition", 0x08800000, 0x08800000 + 0x100000 * 32, false);
            this.memoryPartitionsUid[MemoryPartitions.VolatilePartition] = new MemoryPartition("Volatile Partition", 0x08400000, 0x08800000, false);
        }

        get userPartition() {
            return this.memoryPartitionsUid[MemoryPartitions.User];
        }

        get stackPartition() {
            return this.memoryPartitionsUid[MemoryPartitions.UserStacks];
        }
    }
}
