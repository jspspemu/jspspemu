import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunction} from "../utils";

export class StdioForUser {
    constructor(private context: EmulatorContext) { }

    @nativeFunction(0x172D316E, 150)
    @I32 sceKernelStdin() { return 0; }
    @nativeFunction(0xA6BAB2E9, 150)
    @I32 sceKernelStdout() { return 1; }
    @nativeFunction(0xF78BA90A, 150)
    @I32 sceKernelStderr() { return 2; }
}
