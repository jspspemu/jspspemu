import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunctionEx} from "../utils";

export class StdioForUser {
    constructor(private context: EmulatorContext) { }

    @nativeFunctionEx(0x172D316E, 150)
    @I32 sceKernelStdin() { return 0; }
    @nativeFunctionEx(0xA6BAB2E9, 150)
    @I32 sceKernelStdout() { return 1; }
    @nativeFunctionEx(0xF78BA90A, 150)
    @I32 sceKernelStderr() { return 2; }
}
