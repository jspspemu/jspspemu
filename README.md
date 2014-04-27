jspspemu
========

A PSP emulator made using javascript (actually typescript). It works with modern browsers.

Lastest version have been tested on:
* Google Chrome 33
* Firefox 29
* Internet Explorer 11 (no sound)
* Opera 20

Opera and Chrome performs the best because they use V8 that is lightning fast.

You can view the lastest version here (updated from git every push):
* http://jspspemu.com/

You can reference some samples like this:
* http://jspspemu.com/#samples/reflection.pbp
* http://jspspemu.com/#samples/TrigWars.zip
* http://jspspemu.com/#samples/Doom.zip

It uses promises, Typed Arrays, Audio API, Canvas, WebGL, FullScreen API, File API and the Gamepad API.
It will use FileSystem API / IndexedDB too.

At this point it can run some demos and homebrew games.

Typescript, and the integrated console and profiler from chrome allowed me to convert some of my cspspemu code pretty fast, in a crazy weekend for this first version. You can debug apps with the chrome console.

The project can be opened with Visual Studio Express but it should work with intelliJ/webstorm or any typescript IDE too.

It can load at this point: ELF, PBP, ISO, CSO and ZIP files. Not support for DAX yet.

It JITs the cpu (though still slow because loops, function calls, and returns are not JITted yet) (just compiles basic blocks without any kind of control flow).
As with my other psp emulator cspspemu, it has a single instruction table that allows to create the cpu dynarec, assembler and disassembler.
It JITs the instruction decoding nested switch.
It JITs the vertex decoding.

Module exported functions are like this:
```js
sceAudioOutputPannedBlocking = createNativeFunction(0x13F592BC, 150, 'uint', 'int/int/int/void*', this, (channelId: number, leftVolume: number, rightVolume: number, buffer: Stream) => {
	var channel = this.channels[channelId];
	return channel.channel.playAsync(core.PspAudio.convertS16ToF32(buffer.readInt16Array(2 * channel.sampleCount)));
});
```
Exported functions returning promises suspend the current psp thread until the promise is resolved.

And binary structs are defined like this so it is pretty agile to work with binary stuff:
```js
export class ElfPspModuleInfo {
    moduleAtributes: number;
    moduleVersion: number;
    name: string;
    gp: number;
    pc: number;
    exportsStart: number;
    exportsEnd: number;
    importsStart: number;
    importsEnd: number;

    // http://hitmen.c02.at/files/yapspd/psp_doc/chap26.html
    // 26.2.2.8
    static struct = StructClass.create<ElfPspModuleInfo>(ElfPspModuleInfo, [
		{ moduleAtributes: UInt16 },
		{ moduleVersion: UInt16 },
		{ name: Stringz(28) },
		{ gp: UInt32 },
		{ exportsStart: UInt32 },
		{ exportsEnd: UInt32 },
		{ importsStart: UInt32 },
		{ importsEnd: UInt32 },
    ]);
}

var item:ElfPspModuleInfo = ElfPspModuleInfo.struct.reed(stream);
var item:ElfPspModuleInfo = ElfPspModuleInfo.struct.write(stream, item);
```

The performance is mainly determined by function lookup and performing arithmetic ops with Int32Array:
http://jsperf.com/loop-with-array-as-variables/3
Maybe in the future javascript implementations will be able to convert typed arrays access into local variables/registers
and store them when exiting functions, analyzing the origin ArrayBuffer of all the typed arrays used.

You can test real psp performance with your favourite browser/platform with this demo:
* http://jspspemu.com/#samples/compilerPerf.elf
