import {PromiseFast} from "../global/utils";
import {waitAsync} from "../global/async";

export class PspAudioBuffer {
	offset: number = 0;

	constructor(private readedCallback: Function, public data: Float32Array) {
	}

	resolve() {
		if (this.readedCallback) this.readedCallback();
		this.readedCallback = null;
	}

	get hasMore() { return this.offset < this.length; }

	read() { return this.data[this.offset++] }

	get available() { return this.length - this.offset; }
	get length() { return this.data.length; }
}

class Audio2Channel {
	private buffers: PspAudioBuffer[] = [];
	private node: ScriptProcessorNode;
	currentBuffer: PspAudioBuffer;

	static convertS16ToF32(channels: number, input: Int16Array, leftVolume: number, rightVolume: number) {
		var output = new Float32Array(input.length * 2 / channels);
		var optimized = leftVolume == 1.0 && rightVolume == 1.0;
		switch (channels) {
			case 2:
				if (optimized) {
					for (var n = 0; n < output.length; n++) output[n] = input[n] / 32767.0;	
				} else {
					for (var n = 0; n < output.length; n += 2) {
						output[n + 0] = (input[n + 0] / 32767.0) * leftVolume;
						output[n + 1] = (input[n + 1] / 32767.0) * rightVolume;
					}
				}	
				break;
			case 1:
				if (optimized) {
					for (var n = 0, m = 0; n < input.length; n++) {
						output[m++] = output[m++] = (input[n] / 32767.0);
					}
				} else {
					for (var n = 0, m = 0; n < input.length; n++) {
						var sample = (input[n] / 32767.0);
						output[m++] = sample * leftVolume;
						output[m++] = sample * rightVolume;
					}
				}
				break;
		}
		return output;
	}
	
	constructor(public id: number, public context: AudioContext) {
		if (this.context) {
			this.node = this.context.createScriptProcessor(1024, 2, 2);
			this.node.onaudioprocess = (e) => { this.process(e) };
		}
	}
	
	start() {
		if (this.node) this.node.connect(this.context.destination);
	}
	
	stop() {
		if (this.node) this.node.disconnect();
	}

	process(e: AudioProcessingEvent) {
		var left = e.outputBuffer.getChannelData(0);
		var right = e.outputBuffer.getChannelData(1);
		var sampleCount = left.length;
		var hidden = document.hidden;

		for (var n = 0; n < sampleCount; n++) {
			if (!this.currentBuffer) {
				if (this.buffers.length == 0) break;

				for (var m = 0; m < Math.min(3, this.buffers.length); m++) {
					this.buffers[m].resolve();
				}

				this.currentBuffer = this.buffers.shift();
				this.currentBuffer.resolve();
			}

			if (this.currentBuffer.available >= 2) {
				left[n] = this.currentBuffer.read();
				right[n] = this.currentBuffer.read();
			} else {
				this.currentBuffer = null;
				n--;
			}

			if (hidden) left[n] = right[n] = 0;
		}
	}

	playAsync(data: Float32Array): PromiseFast<any> {
		if (!this.node) return waitAsync(10).then(() => 0);

		if (this.buffers.length < 8) {
		//if (this.buffers.length < 16) {
			//(data.length / 2)
			this.buffers.push(new PspAudioBuffer(null, data));
			//return 0;
			return PromiseFast.resolve(0);
		} else {
			return new PromiseFast<number>((resolved, rejected) => {
				this.buffers.push(new PspAudioBuffer(resolved, data));
				return 0;
			});
		}
	}

	playDataAsync(channels: number, data: Int16Array, leftVolume: number, rightVolume: number): PromiseFast<any> {
		//console.log(channels, data);
		return this.playAsync(Audio2Channel.convertS16ToF32(channels, data, leftVolume, rightVolume));
	}
}

export class Html5Audio2 {
	private channels = new Map<number, Audio2Channel>();
	private context: AudioContext;
	
	constructor() {
		this.context = new AudioContext();
	}
	
	getChannel(id: number):Audio2Channel {
		if (!this.channels.has(id)) this.channels.set(id, new Audio2Channel(id, this.context));
		return this.channels.get(id);
	}
	
	startChannel(id: number) {
		return this.getChannel(id).start();
	}
	
	stopChannel(id: number) {
		return this.getChannel(id).stop();
	}
	
	playDataAsync(id:number, channels:number, data:Int16Array, leftVolume: number, rightVolume: number) {
		return this.getChannel(id).playDataAsync(channels, data, leftVolume, rightVolume);
	}
}
