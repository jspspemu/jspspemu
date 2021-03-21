import {ProgramExitException, UidCollection} from "../../../global/utils";
import {Stream} from "../../../global/stream";
import {SceKernelErrors} from "../../SceKernelErrors";
import {EmulatorContext} from "../../../emu/context";
import {nativeFunction} from "../../utils";
import {MemoryAnchor, MemoryPartition} from "../../manager/memory";
import {Pointer} from "../../../global/struct";

export class ThreadManForUser {
    constructor(private context: EmulatorContext) {
    }

    private fplUid = new UidCollection<Fpl>(1);

    @nativeFunction(0xC07BB470, 150, 'int', 'string/int/int/int/int/void*')
    sceKernelCreateFpl(name: string, partitionId: number, attribute: FplAttributeFlags, size: number, blocks: number, optionsPtr: Stream) {
        const partition = this.context.memoryManager.memoryPartitionsUid[partitionId];
        const allocatedPartition = partition.allocate(size, (attribute & FplAttributeFlags.PSP_FPL_ATTR_ADDR_HIGH) ? MemoryAnchor.High : MemoryAnchor.Low);
        const vpl = new Fpl(name, allocatedPartition, size, blocks);
        return this.fplUid.allocate(vpl);
    }

    @nativeFunction(0xD979E9BF, 150, 'int', 'uint/void*/void*')
    sceKernelAllocateFpl(uid: number, dataAddr: Stream, timeoutAddr: Stream) {
        return this._sceKernelAllocateFpl(uid, dataAddr, timeoutAddr, true, false);
    }

    private _sceKernelAllocateFpl(uid: number, dataAddr: Stream, timeoutAddr: Stream, wait: boolean, doCallbacks: boolean): number {
        const fpl = this.fplUid.get(uid)
        dataAddr.writeInt32(fpl.alloc())
        return 0
    }
}

class Fpl {
    private currentOffset = 0
    private freeList: number[] = []

    constructor(
        public name: string,
        public partition: MemoryPartition,
        public size: number,
        public blocks: number
    ) {
    }

    getAddress(index: number) {
        return this.partition.low + (index * this.size)
    }

    alloc() {
        return this.getAddress(this.allocIndex())
    }

    private allocIndex() {
        if (this.freeList.length > 0) {
            return this.freeList.pop()
        }
        if (this.currentOffset < this.blocks) {
            return this.currentOffset++
        }
        throw new ProgramExitException("TODO: Fpl is full")
    }
}


const enum FplAttributeFlags {
    PSP_FPL_ATTR_FIFO = 0,
    PSP_FPL_ATTR_PRIORITY = 0x100,
    PSP_FPL_ATTR_MASK = 0x41FF,
    PSP_FPL_ATTR_ADDR_HIGH = 0x4000
}
