import {EmulatorContext} from "../../context";
import {nativeFunction} from "../utils";

export class StdioForUser {
    constructor(private context: EmulatorContext) { }

    @nativeFunction(0x172D316E, 150, 'int', '')
    sceKernelStdin() { return 0; }
    @nativeFunction(0xA6BAB2E9, 150, 'int', '')
    sceKernelStdout() { return 1; }
    @nativeFunction(0xF78BA90A, 150, 'int', '')
    sceKernelStderr() { return 2; }
}
