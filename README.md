jspspemu
========

A PSP emulator made using javascript (actually typescript). It will work with any modern browser.

Lastest version works on:
* Google Chrome 33
* Firefox 29
* Internet Explorer 11
* Opera 20

You can view the current version here:
http://soywiz.github.io/jspspemu/2014-03-24/#samples/ortho.elf

It uses promises, Typed Arrays, Audio API, Canvas, WebGL, FullScreen API, File API and the Gamepad API.
It will use FileSystem API too.

At this point it can run some demos.

Typescript, and the integrated console and profiler from chrome allowed me to convert some of my cspspemu code pretty fast, in a crazy weekend for this first version. You can debug apps with the chrome console.

The project can be opened with Visual Studio Express but it should work with intelliJ too.

It can load at this point: ELF files, PBP files, ISO files and CSO files. Not support for DAX yet.

It JITs the cpu (though still slow because loops, function calls, and returns are not JITted yet).
As with my other psp emulator cspspemu, it has a single instruction table that allows to create the cpu dynarec,
assembler and disassembler.
It JITs the instruction decoding nested switch.
It JITs the vertex decoding.

Module exported functions are like this:
```js
sceAudioOutputPannedBlocking = createNativeFunction(0x13F592BC, 150, 'uint', 'int/int/int/void*', this, (channelId: number, leftVolume: number, rightVolume: number, buffer: Stream) => {
	var channel = this.channels[channelId];
	return channel.channel.playAsync(core.PspAudio.convertS16ToF32(buffer.readInt16Array(2 * channel.sampleCount)));
});
```
Exported functions returning promises wills susped the current psp thread until the promise is feResolved.

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
        { type: UInt16, name: "moduleAtributes" },
        { type: UInt16, name: "moduleVersion" },
        { type: Stringz(28), name: "name" },
        { type: UInt32, name: "gp" },
        { type: UInt32, name: "exportsStart" },
        { type: UInt32, name: "exportsEnd" },
        { type: UInt32, name: "importsStart" },
        { type: UInt32, name: "importsEnd" },
    ]);
}

var item:ElfPspModuleInfo = ElfPspModuleInfo.struct.reed(stream);
var item:ElfPspModuleInfo = ElfPspModuleInfo.struct.write(stream, item);
```

