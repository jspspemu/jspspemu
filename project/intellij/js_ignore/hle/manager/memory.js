///<reference path="../../global.d.ts" />
var MemoryPartitions;
(function (MemoryPartitions) {
    MemoryPartitions[MemoryPartitions["Kernel0"] = 0] = "Kernel0";
    MemoryPartitions[MemoryPartitions["User"] = 2] = "User";
    MemoryPartitions[MemoryPartitions["VolatilePartition"] = 5] = "VolatilePartition";
    MemoryPartitions[MemoryPartitions["UserStacks"] = 6] = "UserStacks";
})(MemoryPartitions || (MemoryPartitions = {}));
(function (MemoryAnchor) {
    MemoryAnchor[MemoryAnchor["Low"] = 0] = "Low";
    MemoryAnchor[MemoryAnchor["High"] = 1] = "High";
    MemoryAnchor[MemoryAnchor["Address"] = 2] = "Address";
    MemoryAnchor[MemoryAnchor["LowAligned"] = 3] = "LowAligned";
    MemoryAnchor[MemoryAnchor["HighAligned"] = 4] = "HighAligned";
})(exports.MemoryAnchor || (exports.MemoryAnchor = {}));
var MemoryAnchor = exports.MemoryAnchor;
var OutOfMemoryError = (function () {
    function OutOfMemoryError(message, name) {
        if (name === void 0) { name = 'OutOfMemoryError'; }
        this.message = message;
        this.name = name;
    }
    return OutOfMemoryError;
})();
exports.OutOfMemoryError = OutOfMemoryError;
var MemoryPartition = (function () {
    function MemoryPartition(name, low, high, allocated, parent) {
        this.name = name;
        this.low = low;
        this.high = high;
        this.allocated = allocated;
        this.parent = parent;
        this._childPartitions = [];
    }
    Object.defineProperty(MemoryPartition.prototype, "size", {
        get: function () {
            return this.high - this.low;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MemoryPartition.prototype, "root", {
        get: function () {
            return (this.parent) ? this.parent.root : this;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MemoryPartition.prototype, "childPartitions", {
        get: function () {
            if (this._childPartitions.length == 0)
                this._childPartitions.push(new MemoryPartition("", this.low, this.high, false));
            return this._childPartitions;
        },
        enumerable: true,
        configurable: true
    });
    MemoryPartition.prototype.contains = function (address) {
        return address >= this.low && address < this.high;
    };
    MemoryPartition.prototype.deallocate = function () {
        this.allocated = false;
        if (this.parent) {
            this.parent.cleanup();
        }
    };
    MemoryPartition.prototype.allocate = function (size, anchor, address, name) {
        if (address === void 0) { address = 0; }
        if (name === void 0) { name = ''; }
        switch (anchor) {
            case 3 /* LowAligned */:
            case 0 /* Low */:
                return this.allocateLow(size, name);
            case 1 /* High */:
                return this.allocateHigh(size, name);
            case 2 /* Address */:
                return this.allocateSet(size, address, name);
            default:
                throw (new Error(sprintf("Not implemented anchor %d:%s", anchor, MemoryAnchor[anchor])));
        }
    };
    MemoryPartition.prototype.allocateSet = function (size, addressLow, name) {
        if (name === void 0) { name = ''; }
        var childs = this.childPartitions;
        var addressHigh = addressLow + size;
        if (!this.contains(addressLow) || !this.contains(addressHigh)) {
            throw (new OutOfMemoryError(sprintf("Can't allocate [%08X-%08X] in [%08X-%08X]", addressLow, addressHigh, this.low, this.high)));
        }
        for (var n = 0; n < childs.length; n++) {
            var child = childs[n];
            if (!child.contains(addressLow))
                continue;
            if (child.allocated)
                throw (new Error("Memory already allocated"));
            if (!child.contains(addressHigh - 1))
                throw (new Error("Can't fit memory"));
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
    };
    MemoryPartition.prototype.allocateLow = function (size, name) {
        if (name === void 0) { name = ''; }
        return this.allocateLowHigh(size, true, name);
    };
    MemoryPartition.prototype.allocateHigh = function (size, name, alignment) {
        if (name === void 0) { name = ''; }
        if (alignment === void 0) { alignment = 1; }
        return this.allocateLowHigh(size, false, name);
    };
    MemoryPartition.prototype._validateChilds = function () {
        var childs = this._childPartitions;
        if (childs[0].low != this.low)
            throw (new Error("Invalid state [1]"));
        if (childs[childs.length - 1].high != this.high)
            throw (new Error("Invalid state [2]"));
        for (var n = 0; n < childs.length - 1; n++) {
            if (childs[n + 0].high != childs[n + 1].low)
                throw (new Error("Invalid state [3] -> " + n));
        }
    };
    MemoryPartition.prototype.allocateLowHigh = function (size, low, name) {
        if (name === void 0) { name = ''; }
        var childs = this.childPartitions;
        for (var n = 0; n < childs.length; n++) {
            var child = childs[n];
            if (child.allocated)
                continue;
            if (child.size < size)
                continue;
            if (low) {
                var p1 = child.low;
                var p2 = child.low + size;
                var p3 = child.high;
                var allocatedChild = new MemoryPartition(name, p1, p2, true, this);
                var unallocatedChild = new MemoryPartition("", p2, p3, false, this);
                childs.splice(n, 1, allocatedChild, unallocatedChild);
            }
            else {
                var p1 = child.low;
                var p2 = child.high - size;
                var p3 = child.high;
                var unallocatedChild = new MemoryPartition("", p1, p2, false, this);
                var allocatedChild = new MemoryPartition(name, p2, p3, true, this);
                childs.splice(n, 1, unallocatedChild, allocatedChild);
            }
            this.cleanup();
            return allocatedChild;
        }
        throw (new OutOfMemoryError("Can't find a partition with " + size + " available"));
    };
    MemoryPartition.prototype.unallocate = function () {
        this.name = '';
        this.allocated = false;
        if (this.parent)
            this.parent.cleanup();
    };
    MemoryPartition.prototype.cleanup = function () {
        var startTotalFreeMemory = this.getTotalFreeMemory();
        //this._validateChilds();
        // join contiguous free memory
        var childs = this.childPartitions;
        if (childs.length >= 2) {
            for (var n = 0; n < childs.length - 1; n++) {
                var child = childs[n + 0];
                var c1 = childs[n + 1];
                if (!child.allocated && !c1.allocated) {
                    //console.log('joining', child, c1, child.low, c1.high);
                    childs.splice(n, 2, new MemoryPartition("", child.low, c1.high, false, this));
                    n--;
                }
            }
        }
        for (var n = 0; n < childs.length; n++) {
            var child = childs[n];
            if (!child.allocated && child.size == 0)
                childs.splice(n, 1);
        }
        //this._validateChilds();
        var endTotalFreeMemory = this.getTotalFreeMemory();
        if (endTotalFreeMemory != startTotalFreeMemory) {
            console.log('assertion failed! : ' + startTotalFreeMemory + ',' + endTotalFreeMemory);
        }
    };
    Object.defineProperty(MemoryPartition.prototype, "nonAllocatedPartitions", {
        get: function () {
            return this.childPartitions.filter(function (item) { return !item.allocated; });
        },
        enumerable: true,
        configurable: true
    });
    MemoryPartition.prototype.getTotalFreeMemory = function () {
        return this.nonAllocatedPartitions.reduce(function (prev, item) { return item.size + prev; }, 0);
    };
    MemoryPartition.prototype.getMaxContiguousFreeMemory = function () {
        return this.nonAllocatedPartitions.max(function (item) { return item.size; }).size;
    };
    MemoryPartition.prototype.findFreeChildWithSize = function (size) {
    };
    return MemoryPartition;
})();
exports.MemoryPartition = MemoryPartition;
var MemoryManager = (function () {
    function MemoryManager() {
        this.memoryPartitionsUid = {};
        this.init();
    }
    MemoryManager.prototype.init = function () {
        this.memoryPartitionsUid[0 /* Kernel0 */] = new MemoryPartition("Kernel Partition 1", 0x88000000, 0x88300000, false);
        //this.memoryPartitionsUid[MemoryPartitions.User] = new MemoryPartition("User Partition", 0x08800000, 0x08800000 + 0x100000 * 32, false);
        //this.memoryPartitionsUid[MemoryPartitions.UserStacks] = new MemoryPartition("User Stacks Partition", 0x08800000, 0x08800000 + 0x100000 * 32, false);
        this.memoryPartitionsUid[2 /* User */] = new MemoryPartition("User Partition", 0x08800000, 0x08800000 + 0x100000 * 24, false);
        this.memoryPartitionsUid[6 /* UserStacks */] = new MemoryPartition("User Stacks Partition", 0x08800000, 0x08800000 + 0x100000 * 24, false);
        this.memoryPartitionsUid[5 /* VolatilePartition */] = new MemoryPartition("Volatile Partition", 0x08400000, 0x08800000, false);
    };
    Object.defineProperty(MemoryManager.prototype, "kernelPartition", {
        get: function () {
            return this.memoryPartitionsUid[0 /* Kernel0 */];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MemoryManager.prototype, "userPartition", {
        get: function () {
            return this.memoryPartitionsUid[2 /* User */];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MemoryManager.prototype, "stackPartition", {
        get: function () {
            return this.memoryPartitionsUid[6 /* UserStacks */];
        },
        enumerable: true,
        configurable: true
    });
    return MemoryManager;
})();
exports.MemoryManager = MemoryManager;
//# sourceMappingURL=memory.js.map