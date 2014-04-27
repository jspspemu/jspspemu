module hle.modules {
	import PspDisplay = core.PspDisplay;

    export class sceDisplay {
        constructor(private context: EmulatorContext) { }

        sceDisplaySetMode = createNativeFunction(0x0E20F177, 150, 'uint', 'uint/uint/uint', this, (mode: number, width: number, height: number) => {
            console.info(sprintf("sceDisplay.sceDisplaySetMode(mode: %d, width: %d, height: %d)", mode, width, height));
            return 0;
		});

		_waitVblankAsync() {
			return new WaitingThreadInfo('_waitVblankAsync', this.context.display, this.context.display.waitVblankAsync());
		}

		_waitVblankStartAsync() {
			return new WaitingThreadInfo('_waitVblankStartAsync', this.context.display, this.context.display.waitVblankStartAsync());
		}

        sceDisplayWaitVblank = createNativeFunction(0x36CDFADE, 150, 'uint', 'int', this, (cycleNum: number) => {
			return this._waitVblankAsync();
		});

		sceDisplayWaitVblankCB = createNativeFunction(0x8EB9EC49, 150, 'uint', 'int', this, (cycleNum: number) => {
			return this._waitVblankAsync();
		});

        sceDisplayWaitVblankStart = createNativeFunction(0x984C27E7, 150, 'uint', '', this, () => {
			return this._waitVblankStartAsync();
		});

		sceDisplayWaitVblankStartCB = createNativeFunction(0x46F186C3, 150, 'uint', '', this, () => {
			return this._waitVblankStartAsync()
		});

		sceDisplayGetVcount = createNativeFunction(0x9C6EAAD7, 150, 'uint', '', this, () => {
			this.context.display.updateTime();
			return this.context.display.vblankCount;
		});

		sceDisplayGetFramePerSec = createNativeFunction(0xDBA6C4C4, 150, 'float', '', this, () => {
			return PspDisplay.PROCESSED_PIXELS_PER_SECOND * PspDisplay.CYCLES_PER_PIXEL / (PspDisplay.PIXELS_IN_A_ROW * PspDisplay.NUMBER_OF_ROWS);
		});

		sceDisplayIsVblank = createNativeFunction(0x4D4E10EC, 150, 'int', '', this, () => {
			return (this.context.display.secondsLeftForVblank == 0);
		});

		sceDisplaySetFrameBuf = createNativeFunction(0x289D82FE, 150, 'uint', 'uint/int/uint/uint', this, (address: number, bufferWidth: number, pixelFormat: core.PixelFormat, sync: number) => {
            this.context.display.address = address;
            this.context.display.bufferWidth = bufferWidth;
            this.context.display.pixelFormat = pixelFormat;
            this.context.display.sync = sync;
            return 0;
		});

		sceDisplayGetCurrentHcount = createNativeFunction(0x773DD3A3, 150, 'uint', '', this, () => {
			this.context.display.updateTime();
			return this.context.display.hcountTotal;
		});
    }
}
