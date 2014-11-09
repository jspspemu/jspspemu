var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');
_vfs.Vfs;
var EmulatorVfs = (function (_super) {
    __extends(EmulatorVfs, _super);
    function EmulatorVfs() {
        _super.apply(this, arguments);
        this.output = '';
        this.screenshot = null;
    }
    EmulatorVfs.prototype.devctlAsync = function (command, input, output) {
        switch (command) {
            case 1 /* GetHasDisplay */:
                if (output)
                    output.writeInt32(0);
                break;
            case 2 /* SendOutput */:
                var str = input.readString(input.length);
                this.output += str;
                $('#output').append(str);
                break;
            case 3 /* IsEmulator */:
                return 0;
            case 32 /* EmitScreenshot */:
                this.screenshot = 1;
                console.warn('emit screenshot!');
                return 0;
            default:
                throw (new Error("Can't handle EmulatorVfs devctlAsync. Command '" + command + "'"));
        }
        return 0;
    };
    return EmulatorVfs;
})(_vfs.Vfs);
exports.EmulatorVfs = EmulatorVfs;
(function (EmulatorDevclEnum) {
    EmulatorDevclEnum[EmulatorDevclEnum["GetHasDisplay"] = 0x00000001] = "GetHasDisplay";
    EmulatorDevclEnum[EmulatorDevclEnum["SendOutput"] = 0x00000002] = "SendOutput";
    EmulatorDevclEnum[EmulatorDevclEnum["IsEmulator"] = 0x00000003] = "IsEmulator";
    EmulatorDevclEnum[EmulatorDevclEnum["SendCtrlData"] = 0x00000010] = "SendCtrlData";
    EmulatorDevclEnum[EmulatorDevclEnum["EmitScreenshot"] = 0x00000020] = "EmitScreenshot";
})(exports.EmulatorDevclEnum || (exports.EmulatorDevclEnum = {}));
var EmulatorDevclEnum = exports.EmulatorDevclEnum;
//# sourceMappingURL=vfs_emulator.js.map