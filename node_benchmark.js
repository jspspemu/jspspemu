function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

var fs = require('fs');
var require2 = require('./jspspemu.js').require2;
var Emulator = require2('src/emulator').Emulator;
var MemoryAsyncStream = require2('src/core/stream').MemoryAsyncStream2;
var cubeIso = toArrayBuffer(fs.readFileSync('data/samples/cube.iso'));
console.log('a');
var emu = new Emulator();
emu.loadExecuteAndWaitAsync(new MemoryAsyncStream(cubeIso), 'cube.iso', function() {
	console.log('loaded!');
});
console.log('b');