import {ProgramExitException, UidCollection} from "../../../global/utils";
import {Stream} from "../../../global/stream";
import {SceKernelErrors} from "../../SceKernelErrors";
import {EmulatorContext} from "../../../emu/context";
import {I32, nativeFunctionEx, PTR, STRING, U32} from "../../utils";
import {MemoryAnchor, MemoryPartition} from "../../manager/memory";

export class ThreadManForUser {
    constructor(private context: EmulatorContext) {
    }

    private fplUid = new UidCollection<Fpl>(1);

    @nativeFunctionEx(0xC07BB470, 150)
    @I32 sceKernelCreateFpl(@STRING name: string, @I32 partitionId: number, @I32 attribute: FplAttributeFlags, @I32 size: number, @I32 blocks: number, @PTR optionsPtr: Stream) {
        const partition = this.context.memoryManager.memoryPartitionsUid[partitionId];
        const allocatedPartition = partition.allocate(size, (attribute & FplAttributeFlags.PSP_FPL_ATTR_ADDR_HIGH) ? MemoryAnchor.High : MemoryAnchor.Low);
        const vpl = new Fpl(name, allocatedPartition, size, blocks);
        return this.fplUid.allocate(vpl);
    }

    @nativeFunctionEx(0xD979E9BF, 150)
    @I32 sceKernelAllocateFpl(@U32 uid: number, @PTR dataAddr: Stream, @PTR timeoutAddr: Stream) {
        return this._sceKernelAllocateFpl(uid, dataAddr, timeoutAddr, true, false);
    }

    @nativeFunctionEx(0xF6414A71, 150)
    @I32 sceKernelFreeFpl(@U32 uid: number, @PTR dataAddr: Stream) {
        const fpl = this.fplUid.get(uid)
        fpl.free(dataAddr.position)
    }

    private _sceKernelAllocateFpl(uid: number, dataAddr: Stream | null, timeoutAddr: Stream, wait: boolean, doCallbacks: boolean): number {
        const fpl = this.fplUid.get(uid)
        if (dataAddr == null || dataAddr.isNull) {
            return SceKernelErrors.ERROR_INVALID_POINTER
        }
        dataAddr.writeInt32(fpl.alloc())
        return 0
    }
}

class Fpl {
    private currentOffset = 0
    private allocList = new Set<number>()
    private freeList = new Set<number>()

    constructor(
        public name: string,
        public partition: MemoryPartition,
        public size: number,
        public blocks: number
    ) {
    }

    private getAddress(index: number) {
        return this.partition.low + (index * this.size)
    }

    private getIndexFromAddress(address: number) {
        return Math.floor((address - this.partition.low) / this.size)
    }

    alloc() {
        return this.getAddress(this.allocIndex())
    }

    free(address: number) {
        const index = this.getIndexFromAddress(address)
        if (this.allocList.has(index)) {
            this.allocList.delete(index)
            this.freeList.add(index)
        }
    }

    private allocIndex() {
        let index = -1
        if (this.freeList.size > 0) {
            index = this.freeList.keys().next().value
            this.freeList.delete(index)
        } else if (this.currentOffset < this.blocks) {
            index = this.currentOffset++
        } else {
            throw new ProgramExitException("TODO: Fpl is full")
        }
        this.allocList.add(index)
        return index
    }
}


const enum FplAttributeFlags {
    PSP_FPL_ATTR_FIFO = 0,
    PSP_FPL_ATTR_PRIORITY = 0x100,
    PSP_FPL_ATTR_MASK = 0x41FF,
    PSP_FPL_ATTR_ADDR_HIGH = 0x4000
}
