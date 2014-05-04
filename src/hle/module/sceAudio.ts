import _utils = require('../utils');
import _context = require('../../context');
import _audio = require('../../core/audio');
import createNativeFunction = _utils.createNativeFunction;

export class sceAudio {
	private channels: Channel[] = [];

	constructor(private context: _context.EmulatorContext) {
		for (var n = 0; n < 8; n++) this.channels.push(new Channel(n));
	}

	sceAudioOutput2Reserve = createNativeFunction(0x01562BA3, 150, 'uint', 'int', this, (sampleCount: number) => {
		console.warn('sceAudioOutput2Reserve not implemented!');
		return 0;
	});

	sceAudioOutput2OutputBlocking = createNativeFunction(0x2D53F36E, 150, 'uint', 'int/void*', this, (volume: number, buffer: Stream) => {
		return waitAsync(10).then(() => 0);
	});

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
		return 0;
	});

	sceAudioChangeChannelConfig = createNativeFunction(0x95FD0C2D, 150, 'uint', 'int/int', this, (channelId: number, format: AudioFormat) => {
		var channel = this.channels[channelId];
		channel.format = format;
		return 0;
	});

	sceAudioSetChannelDataLen = createNativeFunction(0xCB2E439E, 150, 'uint', 'int/int', this, (channelId: number, sampleCount: number) => {
		var channel = this.channels[channelId];
		channel.sampleCount = sampleCount;
		return 0;
	});

	sceAudioOutputPannedBlocking = createNativeFunction(0x13F592BC, 150, 'uint', 'int/int/int/void*', this, (channelId: number, leftVolume: number, rightVolume: number, buffer: Stream): any => {
		var channel = this.channels[channelId];
		return new WaitingThreadInfo('sceAudioOutputPannedBlocking', channel, channel.channel.playAsync(_audio.PspAudio.convertS16ToF32(buffer.readInt16Array(2 * channel.sampleCount))));
	});

	sceAudioOutputBlocking = createNativeFunction(0x136CAF51, 150, 'uint', 'int/int/void*', this, (channelId: number, volume: number, buffer: Stream) => {
		var channel = this.channels[channelId];
		return new WaitingThreadInfo('sceAudioOutputBlocking', channel, channel.channel.playAsync(_audio.PspAudio.convertS16ToF32(buffer.readInt16Array(2 * channel.sampleCount))));
	});

	sceAudioOutputPanned = createNativeFunction(0xE2D56B2D, 150, 'uint', 'int/int/int/void*', this, (channelId: number, leftVolume: number, rightVolume: number, buffer: Stream) => {
		var channel = this.channels[channelId];
		return new WaitingThreadInfo('sceAudioOutputPanned', channel, channel.channel.playAsync(_audio.PspAudio.convertS16ToF32(buffer.readInt16Array(2 * channel.sampleCount))));
	});

	sceAudioChangeChannelVolume = createNativeFunction(0xB7E1D8E7, 150, 'uint', 'int/int/int', this, (channelId: number, volumeLeft: number, volumeRight: number) => {
		console.warn("Not implemented sceAudioChangeChannelVolume");
		return 0;
	});

	sceAudioGetChannelRestLen = createNativeFunction(0xB7E1D8E7, 150, 'uint', 'int', this, (channelId: number) => {
		console.warn("Not implemented sceAudioGetChannelRestLen");
		return 0;
	});
}

enum AudioFormat {
	Stereo = 0x00,
	Mono = 0x10,
}

class Channel {
	allocated: boolean = false;
	sampleCount: number = 44100;
	format: AudioFormat = AudioFormat.Stereo;
	channel: _audio.PspAudioChannel;

	constructor(public id: number) {
	}
}
