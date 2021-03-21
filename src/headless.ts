import "./emu/global"
import {UrlAsyncStream} from "./global/stream";
import {Emulator} from "./emu/emulator";
import {loggerPolicies} from "./global/utils";
import {AnsiEscapeCodes} from "./util/AnsiEscapeCodes";

declare var process: any

(async () => {
    const emu = new Emulator();

    loggerPolicies.disableAll = true

    const output = (typeof document !== 'undefined') ? document.getElementById('output') : null;
    const errors = (typeof document !== 'undefined') ? document.getElementById('errors') : null;

    window.onerror = function (errorMsg, url, lineNumber) {
        errors.innerText += 'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber + "\n";
    };

    emu.cpuConfig.interpreted = false

    let fileName = ""
    const argv: string[] = process.argv
    const params: string[] = argv.slice(2)
    while (params.length > 0) {
        const param = params.shift()
        if (param.startsWith("-")) {
            switch (param) {
                case "-i": case "-interpreted": case "--interpreted":
                    emu.cpuConfig.interpreted = true
                    break;
                case "-d": case "-dynarec": case "--dynarec":
                    emu.cpuConfig.interpreted = false
                    break;
                default:
                    throw new Error(`Unknown switch ${param}`)
            }
        } else {
            fileName = param
        }
    }

    if (fileName.length == 0) {
        console.error(`${AnsiEscapeCodes.RED}Must pass an extra argument with the file to execute${AnsiEscapeCodes.RESET}`)
        return
    }
    //console.warn("process.argv", process.argv)
    //console.warn("fileName", fileName)

    const result = await emu.downloadAndExecuteAndWaitAsync(fileName, function() {
        emu.context.onStdout.add(function(data) {
            if (output) {
                output.textContent = output.textContent + data;
            }
            if (typeof process !== 'undefined') {
                process.stdout.write(data);
            }
        });
    })
    //console.log(result);
})()
