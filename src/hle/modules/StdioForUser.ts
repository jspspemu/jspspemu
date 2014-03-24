module hle.modules {
    export class StdioForUser {
        constructor(private context: EmulatorContext) { }

        sceKernelStdin = createNativeFunction(0x172D316E, 150, 'int', '', this, () => 10000001);
        sceKernelStdout = createNativeFunction(0xA6BAB2E9, 150, 'int', '', this, () => 10000002);
        sceKernelStderr = createNativeFunction(0xF78BA90A, 150, 'int', '', this, () => 10000003);
    }
}