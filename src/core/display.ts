module core {
	export interface IPspDisplay {
		address: number;
		bufferWidth: number;
		pixelFormat: PixelFormat;
		sync: number;
		startAsync(): Promise<void>;
		stopAsync(): Promise<void>;
		waitVblankAsync(): Promise<number>;
		vblankCount: number;
	}

	export enum PixelFormat {
		NONE = -1,
		RGBA_5650 = 0,
		RGBA_5551 = 1,
		RGBA_4444 = 2,
		RGBA_8888 = 3,
		PALETTE_T4 = 4,
		PALETTE_T8 = 5,
		PALETTE_T16 = 6,
		PALETTE_T32 = 7,
		COMPRESSED_DXT1 = 8,
		COMPRESSED_DXT3 = 9,
		COMPRESSED_DXT5 = 10,
	}


	export class BasePspDisplay {
		address: number = Memory.DEFAULT_FRAME_ADDRESS;
		bufferWidth: number;
		pixelFormat: PixelFormat;
		sync: number;
	}

	export class DummyPspDisplay extends BasePspDisplay implements IPspDisplay {
		constructor() {
			super();
		}

		waitVblankAsync() {
			return new Promise((resolve) => { setTimeout(resolve, 20); });
		}

		startAsync() {
			return Promise.resolve();
		}

		stopAsync() {
			return Promise.resolve();
		}
	}

	export class PspDisplay extends BasePspDisplay implements IPspDisplay {
		private context: CanvasRenderingContext2D;
		private vblank = new Signal();
		private imageData: ImageData;
		private interval: number = -1;
		vblankCount: number = 0;

		constructor(public memory: Memory, public canvas: HTMLCanvasElement) {
			super();
			this.context = this.canvas.getContext('2d');
			this.imageData = this.context.createImageData(512, 272);
		}

		update() {
			if (!this.context || !this.imageData) return;

			var count = 0;

			var imageData = this.imageData;
			var w8 = imageData.data;


			var baseAddress = this.address & 0x0FFFFFFF;

			var from8 = this.memory.u8;
			var from16 = this.memory.u16;

			switch (this.pixelFormat) {
				default:
				case PixelFormat.RGBA_8888:
					this.update8888(w8, from8, baseAddress);
					break;
				case PixelFormat.RGBA_5551:
					this.update5551(w8, from16, baseAddress >> 1);
					break;
			}

			this.context.putImageData(imageData, 0, 0);
		}

		private update5551(w8: Uint8Array, from16: Uint16Array, inn: number) {
			for (var n = 0; n < 512 * 272 * 4; n += 4) {
				var it = from16[inn++];
				w8[n + 0] = BitUtils.extractScale(it, 0, 5, 0xFF);
				w8[n + 1] = BitUtils.extractScale(it, 5, 5, 0xFF);
				w8[n + 2] = BitUtils.extractScale(it, 10, 5, 0xFF);
				w8[n + 3] = 0xFF;
			}
		}

		private update8888(w8: Uint8Array, from8: Uint8Array, inn: number) {
			for (var n = 0; n < 512 * 272 * 4; n += 4) {
				w8[n + 0] = from8[inn + n + 0];
				w8[n + 1] = from8[inn + n + 1];
				w8[n + 2] = from8[inn + n + 2];
				w8[n + 3] = 0xFF;
			}
		}

		startAsync() {
			//$(this.canvas).focus();
			this.interval = setInterval(() => {
				this.vblankCount++;
				this.update();
				this.vblank.dispatch();
			}, 1000 / 59.999);
			return Promise.resolve();
		}

		stopAsync() {
			clearInterval(this.interval);
			this.interval = -1;
			return Promise.resolve();
		}

		waitVblankAsync() {
			return new Promise<number>((resolve) => {
				this.vblank.once(() => {
					resolve(0);
				});
			});
		}
	}
}
