///<reference path="../global.d.ts" />
var PspAudioBuffer = (function () {
    function PspAudioBuffer(readedCallback, data) {
        this.readedCallback = readedCallback;
        this.data = data;
        this.offset = 0;
    }
    PspAudioBuffer.prototype.resolve = function () {
        if (this.readedCallback)
            this.readedCallback();
        this.readedCallback = null;
    };
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
exports.PspAudioBuffer = PspAudioBuffer;
var Sample = (function () {
    function Sample(left, right) {
        this.left = left;
        this.right = right;
    }
    Sample.prototype.set = function (left, right) {
        this.left = left;
        this.right = right;
        return this;
    };
    Sample.prototype.scale = function (leftScale, rightScale) {
        this.left *= leftScale;
        this.right *= rightScale;
    };
    Sample.prototype.addScaled = function (sample, leftScale, rightScale) {
        this.left += sample.left * leftScale;
        this.right += sample.right * rightScale;
    };
    Sample.prototype.GetNextSample = function () {
    };
    return Sample;
})();
exports.Sample = Sample;
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
        //document.addEventListener("visibilitychange", this.onVisibilityChanged);
    };
    /*
    private onVisibilityChanged() {
        document.hidden;
    }
    */
    PspAudioChannel.prototype.stop = function () {
        if (this.node)
            this.node.disconnect();
        this.audio.playingChannels.delete(this);
        //document.removeEventListener("visibilitychange", this.onVisibilityChanged);
    };
    PspAudioChannel.prototype.process = function (e) {
        var left = e.outputBuffer.getChannelData(0);
        var right = e.outputBuffer.getChannelData(1);
        var sampleCount = left.length;
        var hidden = document.hidden;
        for (var n = 0; n < sampleCount; n++) {
            if (!this.currentBuffer) {
                if (this.buffers.length == 0)
                    break;
                for (var m = 0; m < Math.min(3, this.buffers.length); m++) {
                    this.buffers[m].resolve();
                }
                //this.buffers.slice(0, 3).forEach(buffer => buffer.resolve());
                this.currentBuffer = this.buffers.shift();
                this.currentBuffer.resolve();
            }
            if (this.currentBuffer.available >= 2) {
                left[n] = this.currentBuffer.read();
                right[n] = this.currentBuffer.read();
            }
            else {
                this.currentBuffer = null;
                n--;
            }
            if (hidden)
                left[n] = right[n] = 0;
        }
    };
    PspAudioChannel.prototype.playAsync = function (data) {
        var _this = this;
        if (!this.node)
            return waitAsync(10).then(function () { return 0; });
        if (this.buffers.length < 8) {
            //(data.length / 2)
            this.buffers.push(new PspAudioBuffer(null, data));
            //return 0;
            return 0;
        }
        else {
            return new Promise(function (resolved, rejected) {
                _this.buffers.push(new PspAudioBuffer(resolved, data));
                return 0;
            });
        }
    };
    return PspAudioChannel;
})();
exports.PspAudioChannel = PspAudioChannel;
var PspAudio = (function () {
    function PspAudio() {
        this.context = null;
        this.playingChannels = new SortedSet();
        try {
            this.context = new AudioContext();
        }
        catch (e) {
        }
    }
    PspAudio.prototype.createChannel = function () {
        return new PspAudioChannel(this, this.context);
    };
    PspAudio.convertS16ToF32 = function (channels, input) {
        var output = new Float32Array(input.length * 2 / channels);
        switch (channels) {
            case 2:
                for (var n = 0; n < output.length; n++)
                    output[n] = input[n] / 32767.0;
                break;
            case 1:
                for (var n = 0, m = 0; n < input.length; n++) {
                    output[m++] = output[m++] = (input[n] / 32767.0);
                }
                break;
        }
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
exports.PspAudio = PspAudio;
//# sourceMappingURL=audio.js.map