module hle.modules {
    export class sceDisplay {
        constructor(private context: EmulatorContext) { }

        sceDisplaySetMode = createNativeFunction(0x0E20F177, 150, 'uint', 'uint/uint/uint', this, (mode: number, width: number, height: number) => {
            console.info(sprintf("sceDisplay.sceDisplaySetMode(mode: %d, width: %d, height: %d)", mode, width, height));
            return 0;
        });

        sceDisplayWaitVblank = createNativeFunction(0x36CDFADE, 150, 'uint', 'int', this, (cycleNum: number) => {
            return this.context.display.waitVblankAsync();
		});

		sceDisplayWaitVblankCB = createNativeFunction(0x8EB9EC49, 150, 'uint', 'int', this, (cycleNum: number) => {
			return this.context.display.waitVblankAsync();
		});

        sceDisplayWaitVblankStart = createNativeFunction(0x984C27E7, 150, 'uint', '', this, () => {
            return this.context.display.waitVblankAsync();
		});

		sceDisplayGetVcount = createNativeFunction(0x9C6EAAD7, 150, 'uint', '', this, () => {
			return this.context.display.vblankCount;
		});

		sceDisplayWaitVblankStartCB = createNativeFunction(0x46F186C3, 150, 'uint', '', this, () => {
			return this.context.display.waitVblankAsync();
		});

        sceDisplaySetFrameBuf = createNativeFunction(0x289D82FE, 150, 'uint', 'uint/int/uint/uint', this, (address: number, bufferWidth: number, pixelFormat: core.PixelFormat, sync: number) => {
            this.context.display.address = address;
            this.context.display.bufferWidth = bufferWidth;
            this.context.display.pixelFormat = pixelFormat;
            this.context.display.sync = sync;
            return 0;
        });
    }
}
