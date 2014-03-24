module hle.modules {
    export class sceGe_user {
        constructor(private context: EmulatorContext) {
        }

        sceGeEdramGetAddr = createNativeFunction(0xE47E40E4, 150, 'uint', '', this, () => 0x04000000);

        sceGeSetCallback = createNativeFunction(0xA4FC06A4, 150, 'uint', 'int', this, (callbackDataPtr: number) => {
            //console.warn('Not implemented sceGe_user.sceGeSetCallback');
            return 0;
        });

        sceGeListEnQueue = createNativeFunction(0xAB49E76A, 150, 'uint', 'uint/uint/int/void*', this, (start: number, stall: number, callbackId: number, argsPtr: Stream) => {
            return this.context.gpu.listEnqueue(start, stall, callbackId, argsPtr);
        });

		sceGeListSync = createNativeFunction(0x03444EB4, 150, 'uint', 'int/int', this, (displayListId: number, syncType: core.gpu.SyncType) => {
            //console.warn('Not implemented sceGe_user.sceGeListSync');
            return this.context.gpu.listSync(displayListId, syncType);
        });

        sceGeListUpdateStallAddr = createNativeFunction(0xE0D68148, 150, 'uint', 'int/int', this, (displayListId: number, stall: number) => {
            //console.warn('Not implemented sceGe_user.sceGeListUpdateStallAddr');
            return this.context.gpu.updateStallAddr(displayListId, stall);
        });

		sceGeDrawSync = createNativeFunction(0xB287BD61, 150, 'uint', 'int', this, (syncType: core.gpu.SyncType) => {
            //console.warn('Not implemented sceGe_user.sceGeDrawSync');
            return this.context.gpu.drawSync(syncType);
        });
    }
}
