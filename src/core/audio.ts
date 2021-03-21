import "../emu/global"
import {PromiseFast, Signal1, SignalPromise, SortedSet} from "../global/utils";
import {Component} from "./component";

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

	playAsync(channels: number, data: Int16Array, leftVolume: number, rightVolume: number): PromiseFast<any> {
		return this.audio.onPlayDataAsync.dispatchAsync(this.id, channels, data, leftVolume, rightVolume);
	}
}

export class PspAudio implements Component {
    //private context: AudioContext = null;
    private lastId: number = 0;
    playingChannels = new SortedSet<PspAudioChannel>();

    constructor() {
    }

    createChannel() {
        return new PspAudioChannel(this.lastId++, this);
    }

    onPlayDataAsync = new SignalPromise<number, number, Int16Array, number, number>();
    onStart = new Signal1<number>();
    onStop = new Signal1<number>();

    register() {
        this.lastId = 0;
    }

    unregister() {
        this.playingChannels.forEach((channel:PspAudioChannel) => {
            channel.stop();
        });
        this.lastId = 0;
        //this.onPlayDataAsync.clear()
        //this.onStart.clear()
        //this.onStop.clear()
    }

    startAsync() {
        this.register()
        return PromiseFast.resolve();
    }

    stopAsync() {
        this.unregister()
        return PromiseFast.resolve();
    }

    frame() {
    }
}

export function convertS16ToF32(channels: number, input: Int16Array, leftVolume: number, rightVolume: number) {
    const output = new Float32Array(input.length * 2 / channels);
    const optimized = leftVolume == 1.0 && rightVolume == 1.0;
    switch (channels) {
        case 2: {
            if (optimized) {
                for (let n = 0; n < output.length; n++) output[n] = input[n] / 32767.0;
            } else {
                for (let n = 0; n < output.length; n += 2) {
                    output[n + 0] = (input[n + 0] / 32767.0) * leftVolume;
                    output[n + 1] = (input[n + 1] / 32767.0) * rightVolume;
                }
            }
            break;
        }
        case 1: {
            if (optimized) {
                for (let n = 0, m = 0; n < input.length; n++) {
                    output[m++] = output[m++] = (input[n] / 32767.0);
                }
            } else {
                for (let n = 0, m = 0; n < input.length; n++) {
                    let sample = (input[n] / 32767.0);
                    output[m++] = sample * leftVolume;
                    output[m++] = sample * rightVolume;
                }
            }
            break;
        }
    }
    return output;
}
