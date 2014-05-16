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

export class Sample {
	constructor(public left: number, public right: number) {
	}

	set(left: number, right: number) {
		this.left = left;
		this.right = right;
	}

	scale(leftScale: number, rightScale: number) {
		this.left *= leftScale;
		this.right *= rightScale;
	}

	addScaled(sample: Sample, leftScale: number, rightScale: number) {
		this.left += sample.left * leftScale;
		this.right += sample.right * rightScale;
	}

	GetNextSample() {
	}
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
		//document.addEventListener("visibilitychange", this.onVisibilityChanged);
	}

	/*
	private onVisibilityChanged() {
		document.hidden;
	}
	*/

	stop() {
		if (this.node) this.node.disconnect();
		this.audio.playingChannels.delete(this);
		//document.removeEventListener("visibilitychange", this.onVisibilityChanged);
	}

	process(e: AudioProcessingEvent) {
		var left = e.outputBuffer.getChannelData(0);
		var right = e.outputBuffer.getChannelData(1);
		var sampleCount = left.length;
		var hidden = document.hidden;

		for (var n = 0; n < sampleCount; n++) {
			if (!this.currentBuffer) {
				if (this.buffers.length == 0) break;

				//for (var n = 0; n < Math.min(3, this.buffers.length); n++) if (this.buffers[n]) this.buffers[n].resolve();
				this.buffers.slice(0, 3).forEach(buffer => buffer.resolve());

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

	playAsync(data: Float32Array): any {
		if (!this.node) return waitAsync(16).then(() => 0);

		if (this.buffers.length < 4) {
			//(data.length / 2)
			this.buffers.push(new PspAudioBuffer(null, data));
			//return 0;
			return Promise.resolve(0);
		} else {
			return new Promise<number>((resolved, rejected) => {
				this.buffers.push(new PspAudioBuffer(resolved, data));
				return 0;
			});
		}
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

	static convertS16ToF32(channels: number, input: Int16Array) {
		var output = new Float32Array(input.length * 2 / channels);
		switch (channels) {
			case 2:
				for (var n = 0; n < output.length; n++) output[n] = input[n] / 32767.0;
				break;
			case 1:
				for (var n = 0, m = 0; n < input.length; n++) {
					output[m++] = output[m++] = (input[n] / 32767.0);
				}
				break;
		}
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
