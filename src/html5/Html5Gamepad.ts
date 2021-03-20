//import { Emulator } from '../emulator';
import { PspCtrlButtons, IPspControllerSet } from '../core/controller';

export class Html5Gamepad {
    register(controller: IPspControllerSet) {
        var navigator = (typeof window != 'undefined') ? window.navigator : null;
        var getGamepads = (navigator && navigator.getGamepads) ? navigator.getGamepads.bind(navigator) : null;

        var gamepadButtonMapping = [
            PspCtrlButtons.cross, // 0
            PspCtrlButtons.circle, // 1
            PspCtrlButtons.square, // 2
            PspCtrlButtons.triangle, // 3
            PspCtrlButtons.leftTrigger, // 4
            PspCtrlButtons.rightTrigger, // 5
            PspCtrlButtons.volumeUp, // 6
            PspCtrlButtons.volumeDown, // 7
            PspCtrlButtons.select, // 8
            PspCtrlButtons.start, // 9
            PspCtrlButtons.home, // 10 - L3
            PspCtrlButtons.note, // 11 - L3
            PspCtrlButtons.up, // 12
            PspCtrlButtons.down, // 13
            PspCtrlButtons.left, // 14
            PspCtrlButtons.right, // 15
        ];

        function gamepadsFrame() {
            if (!getGamepads) return;
            window.requestAnimationFrame(gamepadsFrame);
            //console.log('bbbbbbbbb');
            var gamepads = getGamepads();
            if (gamepads[0]) {
                //console.log('aaaaaaaa');
                var gamepad = gamepads[0];
                var buttons = gamepad['buttons'];
                var axes = gamepad['axes'];

                let checkButton = function (button: any) {
                    if (typeof button == 'number') {
                        return button != 0;
                    } else {
                        return button ? !!(button.pressed) : false;
                    }
                }

                var buttonsData = new Uint8Array(16);
                for (var n = 0; n < 16; n++) {
                    buttonsData[gamepadButtonMapping[n]] = checkButton(buttons[n]) ? 1 : 0;
                }
                let payload = { x: axes[0], y: axes[1], buttons: buttonsData };
                controller.setGamepadFrame(payload.x, payload.y, payload.buttons);
            }
        }
        gamepadsFrame();
    }
}
