import {ProgramExitException, UidCollection} from "../../../global/utils";
import {Stream} from "../../../global/stream";
import {SceKernelErrors} from "../../SceKernelErrors";
import {EmulatorContext} from "../../../emu/context";
import {nativeFunction} from "../../utils";
import {MemoryAnchor, MemoryPartition} from "../../manager/memory";

export class ThreadManForUser {
    constructor(private context: EmulatorContext) { }

    @nativeFunction(0xC07BB470, 150, 'int', 'string/int/int/int/int/void*')
    sceKernelCreateFpl(name: string, partitionId: number, attribute: FplAttributeFlags, size: number, blocks: number, optionsPtr: Stream) {
        throw new ProgramExitException("sceKernelCreateFpl not implemented")
    }
}

const enum FplAttributeFlags {
}
