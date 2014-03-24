module hle.modules {
	enum AudioFormat {
		Stereo = 0x00,
		Mono = 0x10,
	}

	class Channel {
		allocated: boolean = false;
		sampleCount: number = 44100;
		format: AudioFormat = AudioFormat.Stereo;
		channel: core.PspAudioChannel;

		constructor(public id: number) {
		}
	}

    export class sceAudio {
		private channels: Channel[] = [];

		constructor(private context: EmulatorContext) {
			for (var n = 0; n < 8; n++) this.channels.push(new Channel(n));
		}

		sceAudioChReserve = createNativeFunction(0x5EC81C55, 150, 'uint', 'int/int/int', this, (channelId: number, sampleCount: number, format: AudioFormat) => {
			if (channelId >= this.channels.length) return -1;
			if (channelId < 0) {
				channelId = this.channels.first(channel => !channel.allocated).id;
				if (channelId === undefined) {
					console.warn('Not implemented sceAudio.sceAudioChReserve');
					return -2;
				}
			}
			var channel = this.channels[channelId];
			channel.allocated = true;
			channel.sampleCount = sampleCount;
			channel.format = format;
			//console.log(this.context);
			channel.channel = this.context.audio.createChannel();
			channel.channel.start();
            return channelId;
		});

		sceAudioChRelease = createNativeFunction(0x6FC46853, 150, 'uint', 'int', this, (channelId: number) => {
			var channel = this.channels[channelId];
			channel.allocated = false;
			channel.channel.stop();
			channel.channel = null;
		});

		sceAudioOutputPannedBlocking = createNativeFunction(0x13F592BC, 150, 'uint', 'int/int/int/void*', this, (channelId: number, leftVolume: number, rightVolume: number, buffer: Stream) => {
			var channel = this.channels[channelId];
			return channel.channel.playAsync(core.PspAudio.convertS16ToF32(buffer.readInt16Array(2 * channel.sampleCount)));
		});

		sceAudioOutputBlocking = createNativeFunction(0x136CAF51, 150, 'uint', 'int/int/void*', this, (channelId: number, volume: number, buffer: Stream) => {
			var channel = this.channels[channelId];
			return channel.channel.playAsync(core.PspAudio.convertS16ToF32(buffer.readInt16Array(2 * channel.sampleCount)));
		});

		sceAudioChangeChannelVolume = createNativeFunction(0xB7E1D8E7, 150, 'uint', 'int/int/int', this, (channelId: number, volumeLeft: number, volumeRight: number) => {
			console.warn("Not implemented sceAudioChangeChannelVolume");
			return 0;
		});
    }
}
