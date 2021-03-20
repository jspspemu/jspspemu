import "./global"
import {UrlAsyncStream} from "./global/stream";
import {Emulator} from "./emulator";
import {loggerPolicies} from "./global/utils";

declare var process: any

(async () => {
    const emu = new Emulator();

    loggerPolicies.disableAll = true

    const output = (typeof document !== 'undefined') ? document.getElementById('output') : null;
    const errors = (typeof document !== 'undefined') ? document.getElementById('errors') : null;

    window.onerror = function (errorMsg, url, lineNumber) {
        errors.innerText += 'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber + "\n";
    };

    if (process.argv < 3) {
        console.error("Must pass an extra argument with the file to execute")
        return
    }

    //console.warn("process.argv", process.argv)

    emu.config.buttonPreference

    const result = await emu.downloadAndExecuteAndWaitAsync(process.argv[2], function() {
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
