var hle;
(function (hle) {
    (function (modules) {
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
            return Channel;
        })();

        var sceAudio = (function () {
            function sceAudio(context) {
                var _this = this;
                this.context = context;
                this.channels = [];
                this.sceAudioChReserve = hle.modules.createNativeFunction(0x5EC81C55, 150, 'uint', 'int/int/int', this, function (channelId, sampleCount, format) {
                    if (channelId >= _this.channels.length)
                        return -1;
                    if (channelId < 0) {
                        channelId = _this.channels.first(function (channel) {
                            return !channel.allocated;
                        }).id;
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
                this.sceAudioChRelease = hle.modules.createNativeFunction(0x6FC46853, 150, 'uint', 'int', this, function (channelId) {
                    var channel = _this.channels[channelId];
                    channel.allocated = false;
                    channel.channel.stop();
                    channel.channel = null;
                });
                this.sceAudioOutputPannedBlocking = hle.modules.createNativeFunction(0x13F592BC, 150, 'uint', 'int/int/int/void*', this, function (channelId, leftVolume, rightVolume, buffer) {
                    var channel = _this.channels[channelId];
                    return channel.channel.playAsync(core.PspAudio.convertS16ToF32(buffer.readInt16Array(2 * channel.sampleCount)));
                });
                this.sceAudioOutputBlocking = hle.modules.createNativeFunction(0x136CAF51, 150, 'uint', 'int/int/void*', this, function (channelId, volume, buffer) {
                    var channel = _this.channels[channelId];
                    return channel.channel.playAsync(core.PspAudio.convertS16ToF32(buffer.readInt16Array(2 * channel.sampleCount)));
                });
                this.sceAudioChangeChannelVolume = hle.modules.createNativeFunction(0xB7E1D8E7, 150, 'uint', 'int/int/int', this, function (channelId, volumeLeft, volumeRight) {
                    console.warn("Not implemented sceAudioChangeChannelVolume");
                    return 0;
                });
                for (var n = 0; n < 8; n++)
                    this.channels.push(new Channel(n));
            }
            return sceAudio;
        })();
        modules.sceAudio = sceAudio;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=sceAudio.js.map
