///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var SceKernelErrors = require('../SceKernelErrors');
var _audio = require('../../core/audio');
var createNativeFunction = _utils.createNativeFunction;
var sceAudio = (function () {
    function sceAudio(context) {
        var _this = this;
        this.context = context;
        this.channels = [];
        this.sceAudioOutput2Reserve = createNativeFunction(0x01562BA3, 150, 'uint', 'int', this, function (sampleCount) {
            console.warn('sceAudioOutput2Reserve not implemented!');
            return 0;
        });
        this.sceAudioOutput2OutputBlocking = createNativeFunction(0x2D53F36E, 150, 'uint', 'int/void*', this, function (volume, buffer) {
            return waitAsync(10).then(function () { return 0; });
        });
        this.sceAudioChReserve = createNativeFunction(0x5EC81C55, 150, 'uint', 'int/int/int', this, function (channelId, sampleCount, format) {
            if (channelId >= _this.channels.length)
                return -1;
            if (channelId < 0) {
                channelId = _this.channels.first(function (channel) { return !channel.allocated; }).id;
                if (channelId === undefined) {
                    console.warn('Not implemented sceAudio.sceAudioChReserve');
                    return -2;
                }
            }
            var channel = _this.channels[channelId];
            channel.allocated = true;
            channel.sampleCount = sampleCount;
            channel.format = format;
            //console.log(this.context);
            channel.channel = _this.context.audio.createChannel();
            channel.channel.start();
            return channelId;
        });
        this.sceAudioChRelease = createNativeFunction(0x6FC46853, 150, 'uint', 'int', this, function (channelId) {
            var channel = _this.getChannelById(channelId);
            channel.allocated = false;
            channel.channel.stop();
            channel.channel = null;
            return 0;
        });
        this.sceAudioChangeChannelConfig = createNativeFunction(0x95FD0C2D, 150, 'uint', 'int/int', this, function (channelId, format) {
            var channel = _this.getChannelById(channelId);
            channel.format = format;
            return 0;
        });
        this.sceAudioSetChannelDataLen = createNativeFunction(0xCB2E439E, 150, 'uint', 'int/int', this, function (channelId, sampleCount) {
            var channel = _this.getChannelById(channelId);
            channel.sampleCount = sampleCount;
            return 0;
        });
        this.sceAudioOutputPannedBlocking = createNativeFunction(0x13F592BC, 150, 'uint', 'int/int/int/void*', this, function (channelId, leftVolume, rightVolume, buffer) {
            if (!buffer)
                return -1;
            var channel = _this.getChannelById(channelId);
            var result = channel.channel.playAsync(_audio.PspAudio.convertS16ToF32(channel.numberOfChannels, buffer.readInt16Array(channel.totalSampleCount)));
            if (!(result instanceof Promise))
                return result;
            return new WaitingThreadInfo('sceAudioOutputPannedBlocking', channel, result, 0 /* NO */);
        });
        this.sceAudioOutputBlocking = createNativeFunction(0x136CAF51, 150, 'uint', 'int/int/void*', this, function (channelId, volume, buffer) {
            if (!buffer)
                return -1;
            var channel = _this.getChannelById(channelId);
            var result = channel.channel.playAsync(_audio.PspAudio.convertS16ToF32(channel.numberOfChannels, buffer.readInt16Array(channel.totalSampleCount)));
            return result;
            //debugger;
            //return new WaitingThreadInfo('sceAudioOutputBlocking', channel, , AcceptCallbacks.NO);
        });
        this.sceAudioOutput = createNativeFunction(0x8C1009B2, 150, 'uint', 'int/int/void*', this, function (channelId, volume, buffer) {
            var channel = _this.getChannelById(channelId);
            channel.channel.playAsync(_audio.PspAudio.convertS16ToF32(channel.numberOfChannels, buffer.readInt16Array(channel.totalSampleCount)));
            return 0;
        });
        this.sceAudioOutputPanned = createNativeFunction(0xE2D56B2D, 150, 'uint', 'int/int/int/void*', this, function (channelId, leftVolume, rightVolume, buffer) {
            var channel = _this.getChannelById(channelId);
            channel.channel.playAsync(_audio.PspAudio.convertS16ToF32(channel.numberOfChannels, buffer.readInt16Array(channel.totalSampleCount)));
            return 0;
        });
        this.sceAudioChangeChannelVolume = createNativeFunction(0xB7E1D8E7, 150, 'uint', 'int/int/int', this, function (channelId, volumeLeft, volumeRight) {
            console.warn("Not implemented sceAudioChangeChannelVolume");
            return 0;
        });
        this.sceAudioGetChannelRestLen = createNativeFunction(0xB7E1D8E7, 150, 'uint', 'int', this, function (channelId) {
            console.warn("Not implemented sceAudioGetChannelRestLen");
            return 0;
        });
        for (var n = 0; n < 8; n++)
            this.channels.push(new Channel(n));
    }
    sceAudio.prototype.isValidChannel = function (channelId) {
        return (channelId >= 0 && channelId < this.channels.length);
    };
    sceAudio.prototype.getChannelById = function (id) {
        if (!this.isValidChannel(id))
            throw (new SceKernelException(2149974019 /* ERROR_AUDIO_INVALID_CHANNEL */));
        return this.channels[id];
    };
    return sceAudio;
})();
exports.sceAudio = sceAudio;
var AudioFormat;
(function (AudioFormat) {
    AudioFormat[AudioFormat["Stereo"] = 0x00] = "Stereo";
    AudioFormat[AudioFormat["Mono"] = 0x10] = "Mono";
})(AudioFormat || (AudioFormat = {}));
var Channel = (function () {
    function Channel(id) {
        this.id = id;
        this.allocated = false;
        this.sampleCount = 44100;
        this.format = 0 /* Stereo */;
    }
    Object.defineProperty(Channel.prototype, "totalSampleCount", {
        get: function () {
            return this.sampleCount * this.numberOfChannels;
            //return this.sampleCount;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Channel.prototype, "numberOfChannels", {
        get: function () {
            return (this.format == 0 /* Stereo */) ? 2 : 1;
        },
        enumerable: true,
        configurable: true
    });
    return Channel;
})();
//# sourceMappingURL=sceAudio.js.map