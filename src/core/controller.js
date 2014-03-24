///<reference path="../util/utils.ts" />
var core;
(function (core) {
    var SceCtrlData = (function () {
        function SceCtrlData() {
            this.timeStamp = 0;
            this.buttons = 0 /* none */;
            this.lx = 0;
            this.ly = 0;
            this._rsrv = [0, 0, 0, 0, 0];
            this.x = 0;
            this.y = 0;
        }
        Object.defineProperty(SceCtrlData.prototype, "x", {
            get: function () {
                return ((this.lx / 255.0) - 0.5) * 2.0;
            },
            set: function (value) {
                this.lx = (((value / 2.0) + 0.5) * 255.0);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SceCtrlData.prototype, "y", {
            get: function () {
                return ((this.ly / 255.0) - 0.5) * 2.0;
            },
            set: function (value) {
                this.ly = (((value / 2.0) + 0.5) * 255.0);
            },
            enumerable: true,
            configurable: true
        });


        SceCtrlData.struct = StructClass.create(SceCtrlData, [
            { type: UInt32, name: 'timeStamp' },
            { type: UInt32, name: 'buttons' },
            { type: Int8, name: 'lx' },
            { type: Int8, name: 'ly' },
            { type: StructArray.create(Int8, 6), name: '_rsrv' }
        ]);
        return SceCtrlData;
    })();
    core.SceCtrlData = SceCtrlData;

    var PspController = (function () {
        function PspController() {
            this.data = new SceCtrlData();
            this.buttonMapping = {};
            this.buttonMapping = {};
            this.buttonMapping[38 /* up */] = 16 /* up */;
            this.buttonMapping[37 /* left */] = 128 /* left */;
            this.buttonMapping[39 /* right */] = 32 /* right */;
            this.buttonMapping[40 /* down */] = 64 /* down */;
            this.buttonMapping[13 /* enter */] = 8 /* start */;
            this.buttonMapping[32 /* space */] = 1 /* select */;
            this.buttonMapping[81 /* q */] = 256 /* leftTrigger */;
            this.buttonMapping[69 /* e */] = 512 /* rightTrigger */;
            this.buttonMapping[87 /* w */] = 4096 /* triangle */;
            this.buttonMapping[83 /* s */] = 16384 /* cross */;
            this.buttonMapping[65 /* a */] = 32768 /* square */;
            this.buttonMapping[68 /* d */] = 8192 /* circle */;
            //this.buttonMapping[KeyCodes.Down] = PspCtrlButtons.Down;
        }
        PspController.prototype.keyDown = function (e) {
            //console.log(e.keyCode);
            var button = this.buttonMapping[e.keyCode];
            if (button !== undefined) {
                this.data.buttons |= button;
            }
        };

        PspController.prototype.keyUp = function (e) {
            var button = this.buttonMapping[e.keyCode];
            if (button !== undefined) {
                this.data.buttons &= ~button;
            }
        };

        PspController.prototype.simulateButtonDown = function (button) {
            this.data.buttons |= button;
        };

        PspController.prototype.simulateButtonUp = function (button) {
            this.data.buttons &= ~button;
        };

        PspController.prototype.simulateButtonPress = function (button) {
            var _this = this;
            this.simulateButtonDown(button);
            setTimeout(function () {
                _this.simulateButtonUp(button);
            }, 60);
        };

        PspController.prototype.startAsync = function () {
            var _this = this;
            document.addEventListener('keydown', function (e) {
                return _this.keyDown(e);
            });
            document.addEventListener('keyup', function (e) {
                return _this.keyUp(e);
            });
            return Promise.resolve();
        };

        PspController.prototype.stopAsync = function () {
            document.removeEventListener('keydown', this.keyDown);
            document.removeEventListener('keyup', this.keyUp);
            return Promise.resolve();
        };
        return PspController;
    })();
    core.PspController = PspController;

    (function (PspCtrlButtons) {
        PspCtrlButtons[PspCtrlButtons["none"] = 0x0000000] = "none";
        PspCtrlButtons[PspCtrlButtons["select"] = 0x0000001] = "select";
        PspCtrlButtons[PspCtrlButtons["start"] = 0x0000008] = "start";
        PspCtrlButtons[PspCtrlButtons["up"] = 0x0000010] = "up";
        PspCtrlButtons[PspCtrlButtons["right"] = 0x0000020] = "right";
        PspCtrlButtons[PspCtrlButtons["down"] = 0x0000040] = "down";
        PspCtrlButtons[PspCtrlButtons["left"] = 0x0000080] = "left";
        PspCtrlButtons[PspCtrlButtons["leftTrigger"] = 0x0000100] = "leftTrigger";
        PspCtrlButtons[PspCtrlButtons["rightTrigger"] = 0x0000200] = "rightTrigger";
        PspCtrlButtons[PspCtrlButtons["triangle"] = 0x0001000] = "triangle";
        PspCtrlButtons[PspCtrlButtons["circle"] = 0x0002000] = "circle";
        PspCtrlButtons[PspCtrlButtons["cross"] = 0x0004000] = "cross";
        PspCtrlButtons[PspCtrlButtons["square"] = 0x0008000] = "square";
        PspCtrlButtons[PspCtrlButtons["home"] = 0x0010000] = "home";
        PspCtrlButtons[PspCtrlButtons["hold"] = 0x0020000] = "hold";
        PspCtrlButtons[PspCtrlButtons["wirelessLanUp"] = 0x0040000] = "wirelessLanUp";
        PspCtrlButtons[PspCtrlButtons["remote"] = 0x0080000] = "remote";
        PspCtrlButtons[PspCtrlButtons["volumeUp"] = 0x0100000] = "volumeUp";
        PspCtrlButtons[PspCtrlButtons["volumeDown"] = 0x0200000] = "volumeDown";
        PspCtrlButtons[PspCtrlButtons["screen"] = 0x0400000] = "screen";
        PspCtrlButtons[PspCtrlButtons["note"] = 0x0800000] = "note";
        PspCtrlButtons[PspCtrlButtons["discPresent"] = 0x1000000] = "discPresent";
        PspCtrlButtons[PspCtrlButtons["memoryStickPresent"] = 0x2000000] = "memoryStickPresent";
    })(core.PspCtrlButtons || (core.PspCtrlButtons = {}));
    var PspCtrlButtons = core.PspCtrlButtons;

    (function (HtmlKeyCodes) {
        HtmlKeyCodes[HtmlKeyCodes["backspace"] = 8] = "backspace";
        HtmlKeyCodes[HtmlKeyCodes["tab"] = 9] = "tab";
        HtmlKeyCodes[HtmlKeyCodes["enter"] = 13] = "enter";
        HtmlKeyCodes[HtmlKeyCodes["shift"] = 16] = "shift";
        HtmlKeyCodes[HtmlKeyCodes["ctrl"] = 17] = "ctrl";
        HtmlKeyCodes[HtmlKeyCodes["alt"] = 18] = "alt";
        HtmlKeyCodes[HtmlKeyCodes["pause"] = 19] = "pause";
        HtmlKeyCodes[HtmlKeyCodes["caps_lock"] = 20] = "caps_lock";
        HtmlKeyCodes[HtmlKeyCodes["escape"] = 27] = "escape";
        HtmlKeyCodes[HtmlKeyCodes["space"] = 32] = "space";
        HtmlKeyCodes[HtmlKeyCodes["page_up"] = 33] = "page_up";
        HtmlKeyCodes[HtmlKeyCodes["page_down"] = 34] = "page_down";
        HtmlKeyCodes[HtmlKeyCodes["end"] = 35] = "end";
        HtmlKeyCodes[HtmlKeyCodes["home"] = 36] = "home";
        HtmlKeyCodes[HtmlKeyCodes["left"] = 37] = "left";
        HtmlKeyCodes[HtmlKeyCodes["up"] = 38] = "up";
        HtmlKeyCodes[HtmlKeyCodes["right"] = 39] = "right";
        HtmlKeyCodes[HtmlKeyCodes["down"] = 40] = "down";
        HtmlKeyCodes[HtmlKeyCodes["insert"] = 45] = "insert";
        HtmlKeyCodes[HtmlKeyCodes["delete"] = 46] = "delete";
        HtmlKeyCodes[HtmlKeyCodes["k0"] = 48] = "k0";
        HtmlKeyCodes[HtmlKeyCodes["k1"] = 49] = "k1";
        HtmlKeyCodes[HtmlKeyCodes["k2"] = 50] = "k2";
        HtmlKeyCodes[HtmlKeyCodes["k3"] = 51] = "k3";
        HtmlKeyCodes[HtmlKeyCodes["k4"] = 52] = "k4";
        HtmlKeyCodes[HtmlKeyCodes["k5"] = 53] = "k5";
        HtmlKeyCodes[HtmlKeyCodes["k6"] = 54] = "k6";
        HtmlKeyCodes[HtmlKeyCodes["k7"] = 55] = "k7";
        HtmlKeyCodes[HtmlKeyCodes["k8"] = 56] = "k8";
        HtmlKeyCodes[HtmlKeyCodes["k9"] = 57] = "k9";
        HtmlKeyCodes[HtmlKeyCodes["a"] = 65] = "a";
        HtmlKeyCodes[HtmlKeyCodes["b"] = 66] = "b";
        HtmlKeyCodes[HtmlKeyCodes["c"] = 67] = "c";
        HtmlKeyCodes[HtmlKeyCodes["d"] = 68] = "d";
        HtmlKeyCodes[HtmlKeyCodes["e"] = 69] = "e";
        HtmlKeyCodes[HtmlKeyCodes["f"] = 70] = "f";
        HtmlKeyCodes[HtmlKeyCodes["g"] = 71] = "g";
        HtmlKeyCodes[HtmlKeyCodes["h"] = 72] = "h";
        HtmlKeyCodes[HtmlKeyCodes["i"] = 73] = "i";
        HtmlKeyCodes[HtmlKeyCodes["j"] = 74] = "j";
        HtmlKeyCodes[HtmlKeyCodes["k"] = 75] = "k";
        HtmlKeyCodes[HtmlKeyCodes["l"] = 76] = "l";
        HtmlKeyCodes[HtmlKeyCodes["m"] = 77] = "m";
        HtmlKeyCodes[HtmlKeyCodes["n"] = 78] = "n";
        HtmlKeyCodes[HtmlKeyCodes["o"] = 79] = "o";
        HtmlKeyCodes[HtmlKeyCodes["p"] = 80] = "p";
        HtmlKeyCodes[HtmlKeyCodes["q"] = 81] = "q";
        HtmlKeyCodes[HtmlKeyCodes["r"] = 82] = "r";
        HtmlKeyCodes[HtmlKeyCodes["s"] = 83] = "s";
        HtmlKeyCodes[HtmlKeyCodes["t"] = 84] = "t";
        HtmlKeyCodes[HtmlKeyCodes["u"] = 85] = "u";
        HtmlKeyCodes[HtmlKeyCodes["v"] = 86] = "v";
        HtmlKeyCodes[HtmlKeyCodes["w"] = 87] = "w";
        HtmlKeyCodes[HtmlKeyCodes["x"] = 88] = "x";
        HtmlKeyCodes[HtmlKeyCodes["y"] = 89] = "y";
        HtmlKeyCodes[HtmlKeyCodes["z"] = 90] = "z";
        HtmlKeyCodes[HtmlKeyCodes["left_window_key"] = 91] = "left_window_key";
        HtmlKeyCodes[HtmlKeyCodes["right_window_key"] = 92] = "right_window_key";
        HtmlKeyCodes[HtmlKeyCodes["select_key"] = 93] = "select_key";
        HtmlKeyCodes[HtmlKeyCodes["numpad_0"] = 96] = "numpad_0";
        HtmlKeyCodes[HtmlKeyCodes["numpad_1"] = 97] = "numpad_1";
        HtmlKeyCodes[HtmlKeyCodes["numpad_2"] = 98] = "numpad_2";
        HtmlKeyCodes[HtmlKeyCodes["numpad_3"] = 99] = "numpad_3";
        HtmlKeyCodes[HtmlKeyCodes["numpad_4"] = 100] = "numpad_4";
        HtmlKeyCodes[HtmlKeyCodes["numpad_5"] = 101] = "numpad_5";
        HtmlKeyCodes[HtmlKeyCodes["numpad_6"] = 102] = "numpad_6";
        HtmlKeyCodes[HtmlKeyCodes["numpad_7"] = 103] = "numpad_7";
        HtmlKeyCodes[HtmlKeyCodes["numpad_8"] = 104] = "numpad_8";
        HtmlKeyCodes[HtmlKeyCodes["numpad_9"] = 105] = "numpad_9";
        HtmlKeyCodes[HtmlKeyCodes["multiply"] = 106] = "multiply";
        HtmlKeyCodes[HtmlKeyCodes["add"] = 107] = "add";
        HtmlKeyCodes[HtmlKeyCodes["subtract"] = 109] = "subtract";
        HtmlKeyCodes[HtmlKeyCodes["decimal_point"] = 110] = "decimal_point";
        HtmlKeyCodes[HtmlKeyCodes["divide"] = 111] = "divide";
        HtmlKeyCodes[HtmlKeyCodes["f1"] = 112] = "f1";
        HtmlKeyCodes[HtmlKeyCodes["f2"] = 113] = "f2";
        HtmlKeyCodes[HtmlKeyCodes["f3"] = 114] = "f3";
        HtmlKeyCodes[HtmlKeyCodes["f4"] = 115] = "f4";
        HtmlKeyCodes[HtmlKeyCodes["f5"] = 116] = "f5";
        HtmlKeyCodes[HtmlKeyCodes["f6"] = 117] = "f6";
        HtmlKeyCodes[HtmlKeyCodes["f7"] = 118] = "f7";
        HtmlKeyCodes[HtmlKeyCodes["f8"] = 119] = "f8";
        HtmlKeyCodes[HtmlKeyCodes["f9"] = 120] = "f9";
        HtmlKeyCodes[HtmlKeyCodes["f10"] = 121] = "f10";
        HtmlKeyCodes[HtmlKeyCodes["f11"] = 122] = "f11";
        HtmlKeyCodes[HtmlKeyCodes["f12"] = 123] = "f12";
        HtmlKeyCodes[HtmlKeyCodes["num_lock"] = 144] = "num_lock";
        HtmlKeyCodes[HtmlKeyCodes["scroll_lock"] = 145] = "scroll_lock";
        HtmlKeyCodes[HtmlKeyCodes["semi_colon"] = 186] = "semi_colon";
        HtmlKeyCodes[HtmlKeyCodes["equal_sign"] = 187] = "equal_sign";
        HtmlKeyCodes[HtmlKeyCodes["comma"] = 188] = "comma";
        HtmlKeyCodes[HtmlKeyCodes["dash"] = 189] = "dash";
        HtmlKeyCodes[HtmlKeyCodes["period"] = 190] = "period";
        HtmlKeyCodes[HtmlKeyCodes["forward_slash"] = 191] = "forward_slash";
        HtmlKeyCodes[HtmlKeyCodes["grave_accent"] = 192] = "grave_accent";
        HtmlKeyCodes[HtmlKeyCodes["open_bracket"] = 219] = "open_bracket";
        HtmlKeyCodes[HtmlKeyCodes["back_slash"] = 220] = "back_slash";
        HtmlKeyCodes[HtmlKeyCodes["close_braket"] = 221] = "close_braket";
        HtmlKeyCodes[HtmlKeyCodes["single_quote"] = 222] = "single_quote";
    })(core.HtmlKeyCodes || (core.HtmlKeyCodes = {}));
    var HtmlKeyCodes = core.HtmlKeyCodes;
})(core || (core = {}));
//# sourceMappingURL=controller.js.map
