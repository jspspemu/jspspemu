///<reference path="../global.d.ts" />
var Riff = (function () {
    function Riff() {
        this.handlers = {};
    }
    Riff.prototype.addHandler = function (name, handler) {
        this.handlers[name] = handler;
    };
    Riff.prototype.load = function (stream) {
        if (stream.readString(4) != 'RIFF')
            throw (new Error("Not a riff file"));
        var chunkSize = stream.readInt32();
        var chunkStream = stream.readStream(chunkSize);
        var chunkType = chunkStream.readString(4);
        switch (chunkType) {
            case 'WAVE':
                this.loadWave(chunkStream);
                break;
            default:
                throw (new Error("Don't know how to handle chunk '" + chunkType + "'"));
        }
    };
    Riff.prototype.loadWave = function (stream) {
        while (stream.available > 0) {
            var type = stream.readString(4);
            var length = stream.readInt32();
            var data = stream.readStream(length);
            console.info('subchunk', type, length, data);
            if (this.handlers[type] === undefined)
                throw (new Error("Don't know how to handle subchunk '" + type + "'"));
            (this.handlers[type])(data);
        }
    };
    Riff.fromStreamWithHandlers = function (stream, handlers) {
        var riff = new Riff();
        for (var handlerName in handlers)
            riff.addHandler(handlerName, handlers[handlerName]);
        riff.load(stream);
        return riff;
    };
    return Riff;
})();
exports.Riff = Riff;
//# sourceMappingURL=riff.js.map