///<reference path="../global.d.ts" />

export class Sample {
	constructor(public left: number, public right: number) {
	}

	set(left: number, right: number) {
		this.left = left;
		this.right = right;
		return this;
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
	constructor(public id:number, public audio:PspAudio) {
	}

	start() {
		this.audio.onStart.dispatch(this.id);
	}

	stop() {
		this.audio.onStop.dispatch(this.id);
	}

	playAsync(channels: number, data: Int16Array, leftVolume: number, rightVolume: number): Promise2<any> {
		return this.audio.onPlayDataAsync.dispatchAsync(this.id, channels, data, leftVolume, rightVolume);
	}
}

export class PspAudio {
	//private context: AudioContext = null;
	private lastId: number = 0;
	playingChannels = new SortedSet<PspAudioChannel>();

	constructor() {
	}

	createChannel() {
		return new PspAudioChannel(this.lastId++, this);
	}

	/*	
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
	*/
	
	onPlayDataAsync = new SignalPromise<number, number, Int16Array, number, number>();
	onStart = new Signal1<number>();
	onStop = new Signal1<number>();
	
	startAsync() {
		this.lastId = 0;
		return Promise2.resolve();
	}

	stopAsync() {
		this.playingChannels.forEach((channel:PspAudioChannel) => {
			channel.stop();
		});
		this.lastId = 0;
		return Promise2.resolve();
	}
}
