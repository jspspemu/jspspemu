///<reference path="../util/utils.ts" />
var core;
(function (core) {
    var PspAudioBuffer = (function () {
        function PspAudioBuffer(readedCallback, data) {
            this.readedCallback = readedCallback;
            this.data = data;
            this.offset = 0;
        }
        Object.defineProperty(PspAudioBuffer.prototype, "hasMore", {
            get: function () {
                return this.offset < this.length;
            },
            enumerable: true,
            configurable: true
        });

        PspAudioBuffer.prototype.read = function () {
            return this.data[this.offset++];
        };

        Object.defineProperty(PspAudioBuffer.prototype, "available", {
            get: function () {
                return this.length - this.offset;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PspAudioBuffer.prototype, "length", {
            get: function () {
                return this.data.length;
            },
            enumerable: true,
            configurable: true
        });
        return PspAudioBuffer;
    })();
    core.PspAudioBuffer = PspAudioBuffer;

    var PspAudioChannel = (function () {
        function PspAudioChannel(audio, context) {
            var _this = this;
            this.audio = audio;
            this.context = context;
            this.buffers = [];
            if (this.context) {
                this.node = this.context.createScriptProcessor(1024, 2, 2);
                this.node.onaudioprocess = function (e) {
                    _this.process(e);
                };
            }
        }
        PspAudioChannel.prototype.start = function () {
            if (this.node)
                this.node.connect(this.context.destination);
            this.audio.playingChannels.add(this);
        };

        PspAudioChannel.prototype.stop = function () {
            if (this.node)
                this.node.disconnect();
            this.audio.playingChannels.delete(this);
        };

        PspAudioChannel.prototype.process = function (e) {
            var left = e.outputBuffer.getChannelData(0);
            var right = e.outputBuffer.getChannelData(1);
            var sampleCount = left.length;

            for (var n = 0; n < sampleCount; n++) {
                if (!this.currentBuffer) {
                    if (this.buffers.length == 0)
                        break;

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
        };

        PspAudioChannel.prototype.playAsync = function (data) {
            var _this = this;
            return new Promise(function (resolved, rejected) {
                if (_this.node) {
                    _this.buffers.push(new PspAudioBuffer(resolved, data));
                } else {
                    resolved();
                }
                return 0;
            });
        };
        return PspAudioChannel;
    })();
    core.PspAudioChannel = PspAudioChannel;

    var PspAudio = (function () {
        function PspAudio() {
            this.playingChannels = new SortedSet();
            try  {
                this.context = new AudioContext();
            } catch (e) {
            }
        }
        PspAudio.prototype.createChannel = function () {
            return new PspAudioChannel(this, this.context);
        };

        PspAudio.convertS16ToF32 = function (input) {
            var output = new Float32Array(input.length);
            for (var n = 0; n < output.length; n++)
                output[n] = input[n] / 32767.0;
            return output;
        };

        PspAudio.prototype.startAsync = function () {
            return Promise.resolve();
        };

        PspAudio.prototype.stopAsync = function () {
            this.playingChannels.forEach(function (channel) {
                channel.stop();
            });
            return Promise.resolve();
        };
        return PspAudio;
    })();
    core.PspAudio = PspAudio;
})(core || (core = {}));
//# sourceMappingURL=audio.js.map
