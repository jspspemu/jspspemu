///<reference path="../util/utils.ts" />

module core {
	export class PspAudioBuffer {
		offset: number = 0;

		constructor(public readedCallback: Function, public data: Float32Array) {
		}

		get hasMore() { return this.offset < this.length; }

		read() { return this.data[this.offset++] }

		get available() { return this.length - this.offset; }
		get length() { return this.data.length; }
	}

	export class PspAudioChannel {
		private buffers: PspAudioBuffer[] = [];
		node: ScriptProcessorNode;

		currentBuffer: PspAudioBuffer;

		constructor(private audio: PspAudio, private context: AudioContext) {
			if (this.context) {
				this.node = this.context.createScriptProcessor(1024, 2, 2);
				this.node.onaudioprocess = (e) => { this.process(e) };
			}
		}

		start() {
			if (this.node) this.node.connect(this.context.destination);
			this.audio.playingChannels.add(this);
		}

		stop() {
			if (this.node) this.node.disconnect();
			this.audio.playingChannels.delete(this);
		}

		process(e: AudioProcessingEvent) {
			var left = e.outputBuffer.getChannelData(0);
			var right = e.outputBuffer.getChannelData(1);
			var sampleCount = left.length;

			for (var n = 0; n < sampleCount; n++) {
				if (!this.currentBuffer) {
					if (this.buffers.length == 0) break;

					this.currentBuffer = this.buffers.shift();
					this.currentBuffer.readedCallback();
				}

				if (this.currentBuffer.available >= 2) {
					left[n] = this.currentBuffer.read();
					right[n] = this.currentBuffer.read();
				} else {
					this.currentBuffer = null;
				}
			}
		}

		playAsync(data: Float32Array) {
			return new Promise<number>((resolved, rejected) => {
				if (this.node) {
					this.buffers.push(new PspAudioBuffer(resolved, data));
				} else {
					resolved();
				}
				return 0;
			});
		}
	}

	export class PspAudio {
		private context: AudioContext;
		playingChannels = new SortedSet<PspAudioChannel>();

		constructor() {
			try {
				this.context = new AudioContext();
			} catch (e) {
			}
		}

		createChannel() {
			return new PspAudioChannel(this, this.context);
		}

		static convertS16ToF32(input: Int16Array) {
			var output = new Float32Array(input.length);
			for (var n = 0; n < output.length; n++) output[n] = input[n] / 32767.0;
			return output;
		}

		startAsync() {
			return Promise.resolve();
		}

		stopAsync() {
			this.playingChannels.forEach((channel) => {
				channel.stop();
			});
			return Promise.resolve();
		}
	}
}
