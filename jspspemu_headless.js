function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

var file = process.argv[2];
if (!file) {
    process.stdout.write('node jspspemu_headless.js <file_to_run>\n');
    process.exit(-1);
} else {
    var require2 = require('./jspspemu.js').require2;
    var Emulator = require2('src/emulator').Emulator;
    var MemoryAsyncStream = require2('src/core/stream').MemoryAsyncStream2;
    Emulator.disableLog();
    var emu = new Emulator();

    emu.loadExecuteAndWaitAsync(new MemoryAsyncStream(toArrayBuffer(require('fs').readFileSync(file))), 'cube.iso', function() {
        emu.context.onStdout.add(function(data) {
            process.stdout.write(data);
        });
    }).then(function(output) {
        //console.log(output);
    });
}
