jspspemu
========

[![CI](https://github.com/jspspemu/jspspemu/actions/workflows/test.yml/badge.svg)](https://github.com/jspspemu/jspspemu/actions/workflows/test.yml)
<a href="https://discord.jspspemu.soywiz.com/"><img alt="Discord" src="https://img.shields.io/discord/822982598992723978?logo=discord" /></a>

A PSP emulator made using javascript (actually typescript). It works with modern browsers.

![Valhalla Knights screenshot](/data/docs/screenshot_vallhalla_knights.jpg?raw=true "Valhalla Knights screenshot")

### Editing:

You can use WebStorm or Visual Studio Code, that is available for Windows, Linux and Mac.
<https://code.visualstudio.com/> or <https://www.jetbrains.com/webstorm/> 
Then you have to open the root folder, it will detect `tsconfig.json` and you will be able to edit.
In order to compile as you edit, please read next section `Building from source`.

### Building from source:

First install node.js >= 14: <https://nodejs.org/>

You can use yarn to execute tasks.

#### To build a bundle js:

```bash
yarn build
```

#### To watch and serve:

```bash
yarn serve
```

Open <http://127.0.0.1:9000/> in a browser to start using it

#### To launch tests:

```bash
yarn test
```

### Compatibility:

Lastest version have been tested on:
* Google Chrome 36 (fastest)
* Opera 23
* Firefox 31
* Internet Explorer 11 (no sound)
* Safari 8 (it won't work with prior versions because of the lack of webgl support)

Opera and Chrome performs the best because they use V8 that is lightning fast.

### More information:

You can view the lastest version here (updated from git every push):
* <https://jspspemu.soywiz.com/>

You can reference some samples like this:
* <https://jspspemu.soywiz.com/#samples/reflection.pbp>
* <https://jspspemu.soywiz.com/#samples/TrigWars.zip>
* <https://jspspemu.soywiz.com/#samples/Doom.zip>

It uses promises, Typed Arrays, Audio API, Canvas, WebGL, FullScreen API, File API, Web Workers, WebSockets and the Gamepad API.
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
```typescript
@nativeFunction(0x13F592BC, 150, 'uint', 'int/int/int/void*')
function sceAudioOutputPannedBlocking(channelId: number, leftVolume: number, rightVolume: number, buffer: Stream): any {
    const channel = this.channels[channelId];
    return channel.channel.playAsync(core.PspAudio.convertS16ToF32(buffer.readInt16Array(2 * channel.sampleCount)));
}
```
Exported functions returning promises suspend the current psp thread until the promise is resolved.

And binary structs are defined like this so it is pretty agile to work with binary stuff:
```typescript
// http://hitmen.c02.at/files/yapspd/psp_doc/chap26.html
// 26.2.2.8
export class ElfPspModuleInfo extends Struct {
    @StructUInt16 moduleAtributes: number;
    @StructUInt16 moduleVersion: number;
    @StructStringz(28) name: string;
    @StructUInt32 gp: number;
    @StructUInt32 pc: number;
    @StructUInt32 exportsStart: number;
    @StructUInt32 exportsEnd: number;
    @StructUInt32 importsStart: number;
    @StructUInt32 importsEnd: number;
}

var item:ElfPspModuleInfo = ElfPspModuleInfo.struct.reed(stream);
var item:ElfPspModuleInfo = ElfPspModuleInfo.struct.write(stream, item);
```

The performance is mainly determined by function lookup and performing arithmetic ops with Int32Array:
http://jsperf.com/loop-with-array-as-variables/3
Maybe in the future javascript implementations will be able to convert typed arrays access into local variables/registers
and store them when exiting functions, analyzing the origin ArrayBuffer of all the typed arrays used.

You can test real psp performance with your favourite browser/platform with this demo:
* <https://jspspemu.soywiz.com/#samples/compilerPerf.elf>
