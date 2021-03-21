import {PromiseFast} from "../global/utils";
import {waitAsync} from "../global/async";
import {convertS16ToF32} from "../core/audio";

export class PspAudioBuffer {
    offset: number = 0;

    constructor(private readedCallback: Function | null, public data: Float32Array) {
    }

    resolve() {
        if (this.readedCallback) this.readedCallback();
        this.readedCallback = null;
    }

    get hasMore() {
        return this.offset < this.length;
    }

    read() {
        return this.data[this.offset++]
    }

    get available() {
        return this.length - this.offset;
    }

    get length() {
        return this.data.length;
    }
}

class Audio2Channel {
    private buffers: PspAudioBuffer[] = [];
    private node: ScriptProcessorNode;
    currentBuffer: PspAudioBuffer | undefined | null;

    constructor(public id: number, public context: AudioContext | null) {
        if (this.context) {
            this.node = this.context.createScriptProcessor(1024, 2, 2)
            this.node.addEventListener("audioprocess", (e) => {
                this.process(e)
            })
        }
    }

    start() {
        if (this.node) this.node.connect(this.context!.destination);
    }

    stop() {
        if (this.node) this.node.disconnect();
    }

    process(e: AudioProcessingEvent) {
        const left = e.outputBuffer.getChannelData(0);
        const right = e.outputBuffer.getChannelData(1);
        const sampleCount = left.length;
        const hidden = document.hidden;

        for (let n = 0; n < sampleCount; n++) {
            if (!this.currentBuffer) {
                if (this.buffers.length == 0) {
                    //console.warn(`Incomplete audio sampleCount=${sampleCount}, n=${n}`)
                    break;
                }

                for (let m = 0; m < Math.min(3, this.buffers.length); m++) {
                    this.buffers[m].resolve()
                }

                this.currentBuffer = this.buffers.shift();
                this.currentBuffer?.resolve()
            }

            if (this.currentBuffer != null && this.currentBuffer.available >= 2) {
                left[n] = this.currentBuffer.read()
                right[n] = this.currentBuffer.read()
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
        return this.playAsync(convertS16ToF32(channels, data, leftVolume, rightVolume));
    }
}

export class Html5Audio2 {
    private channels = new Map<number, Audio2Channel>();
    private context: AudioContext | null = null;

    constructor() {
        try {
            this.context = new AudioContext();
        } catch (e) {
            console.error("Error creating AudioContext", e)
        }

        const unlock = () => {
            // Remove the touch start listener.
            document.removeEventListener("keydown", unlock, true)
            document.removeEventListener("touchstart", unlock, true)
            document.removeEventListener("mousedown", unlock, true)

            const ctx = this.context

            if (ctx != null) {
                // If already created the audio context, we try to resume it
                ctx.resume()

                const source = ctx.createBufferSource()

                source.buffer = ctx.createBuffer(1, 1, 22050)
                source.connect(ctx.destination)
                source.start(0.0)
                if (ctx.resume) ctx.resume()
                source.onended = () => {
                    source.disconnect(0)
                    console.warn("Web Audio was successfully unlocked")
                }
            }
        }

        document.addEventListener("keydown", unlock, true)
        document.addEventListener("touchstart", unlock, true)
        document.addEventListener("mousedown", unlock, true)
    }

    getChannel(id: number): Audio2Channel {
        if (!this.channels.has(id)) this.channels.set(id, new Audio2Channel(id, this.context));
        return this.channels.get(id)!;
    }

    startChannel(id: number) {
        return this.getChannel(id).start();
    }

    stopChannel(id: number) {
        return this.getChannel(id).stop();
    }

    playDataAsync(id: number, channels: number, data: Int16Array, leftVolume: number, rightVolume: number) {
        return this.getChannel(id).playDataAsync(channels, data, leftVolume, rightVolume);
    }
}
