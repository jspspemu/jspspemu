import {PspControllerContributor, PspCtrlButtons, SceCtrlData} from "../core/controller";
import {MathUtils} from "../global/math";

export class Html5Keyboard extends PspControllerContributor {
    private keyDown = (e: KeyboardEvent) => { this.setKeyDown(e.keyCode) }
    private keyUp = (e: KeyboardEvent) => { this.setKeyUp(e.keyCode) }

    private buttonMapping: any = {};
    private fieldMapping: any = {};

    private analogUp: boolean = false;
    private analogDown: boolean = false;
    private analogLeft: boolean = false;
    private analogRight: boolean = false;

    private analogAddX: number = 0;
    private analogAddY: number = 0;

    private addX: number = 0;
    private addY: number = 0;

    constructor() {
        super()
        this.buttonMapping = {};
        this.buttonMapping[HtmlKeyCodes.up] = PspCtrlButtons.up;
        this.buttonMapping[HtmlKeyCodes.left] = PspCtrlButtons.left;
        this.buttonMapping[HtmlKeyCodes.right] = PspCtrlButtons.right;
        this.buttonMapping[HtmlKeyCodes.down] = PspCtrlButtons.down;
        this.buttonMapping[HtmlKeyCodes.enter] = PspCtrlButtons.start;
        this.buttonMapping[HtmlKeyCodes.space] = PspCtrlButtons.select;
        this.buttonMapping[HtmlKeyCodes.q] = PspCtrlButtons.leftTrigger;
        this.buttonMapping[HtmlKeyCodes.e] = PspCtrlButtons.rightTrigger;
        this.buttonMapping[HtmlKeyCodes.w] = PspCtrlButtons.triangle;
        this.buttonMapping[HtmlKeyCodes.s] = PspCtrlButtons.cross;
        this.buttonMapping[HtmlKeyCodes.a] = PspCtrlButtons.square;
        this.buttonMapping[HtmlKeyCodes.d] = PspCtrlButtons.circle;
        //this.buttonMapping[KeyCodes.Down] = PspCtrlButtons.Down;

        this.fieldMapping[HtmlKeyCodes.i] = 'analogUp';
        this.fieldMapping[HtmlKeyCodes.k] = 'analogDown';
        this.fieldMapping[HtmlKeyCodes.j] = 'analogLeft';
        this.fieldMapping[HtmlKeyCodes.l] = 'analogRight';
    }

    register() {
        window.document?.addEventListener('keydown', this.keyDown)
        window.document?.addEventListener('keyup', this.keyUp)
    }

    unregister() {
        window.document?.removeEventListener('keydown', this.keyDown)
        window.document?.removeEventListener('keyup', this.keyUp)
    }

    computeFrame() {
        if (this.analogUp) { this.analogAddY -= 0.25; }
        else if (this.analogDown) { this.analogAddY += 0.25; }
        else { this.analogAddY *= 0.3; }

        if (this.analogLeft) { this.analogAddX -= 0.25; }
        else if (this.analogRight) { this.analogAddX += 0.25; }
        else { this.analogAddX *= 0.3; }

        this.analogAddX = MathUtils.clamp(this.analogAddX, -1, +1);
        this.analogAddY = MathUtils.clamp(this.analogAddY, -1, +1);

        this.data.x = this.analogAddX;
        this.data.y = this.analogAddY;

        this.data.x = MathUtils.clamp(this.data.x + this.addX, -1, +1);
        this.data.y = MathUtils.clamp(this.data.y + this.addY, -1, +1);
    }

    private setKeyDown(keyCode: number) {
        const button = this.buttonMapping[keyCode];
        if (button !== undefined) this.data.buttons |= button;

        const field = this.fieldMapping[keyCode];
        if (field !== undefined) (<any>this)[field] = true;
    }

    private setKeyUp(keyCode: number) {
        const button = this.buttonMapping[keyCode];
        if (button !== undefined) this.data.buttons &= ~button;

        const field = this.fieldMapping[keyCode];
        if (field !== undefined) (<any>this)[field] = false;
    }
}

export const enum HtmlKeyCodes {
    backspace = 8, tab = 9, enter = 13, shift = 16,
    ctrl = 17, alt = 18, pause = 19, caps_lock = 20,
    escape = 27, space = 32, page_up = 33, page_down = 34,
    end = 35, home = 36, left = 37, up = 38,
    right = 39, down = 40, insert = 45, _delete = 46,
    k0 = 48, k1 = 49, k2 = 50, k3 = 51,
    k4 = 52, k5 = 53, k6 = 54, k7 = 55,
    k8 = 56, k9 = 57, a = 65, b = 66,
    c = 67, d = 68, e = 69, f = 70,
    g = 71, h = 72, i = 73, j = 74,
    k = 75, l = 76, m = 77, n = 78,
    o = 79, p = 80, q = 81, r = 82,
    s = 83, t = 84, u = 85, v = 86,
    w = 87, x = 88, y = 89, z = 90,
    left_window_key = 91, right_window_key = 92, select_key = 93, numpad_0 = 96,
    numpad_1 = 97, numpad_2 = 98, numpad_3 = 99, numpad_4 = 100,
    numpad_5 = 101, numpad_6 = 102, numpad_7 = 103, numpad_8 = 104,
    numpad_9 = 105, multiply = 106, add = 107, subtract = 109,
    decimal_point = 110, divide = 111, f1 = 112, f2 = 113,
    f3 = 114, f4 = 115, f5 = 116, f6 = 117,
    f7 = 118, f8 = 119, f9 = 120, f10 = 121,
    f11 = 122, f12 = 123, num_lock = 144, scroll_lock = 145,
    semi_colon = 186, equal_sign = 187, comma = 188, dash = 189,
    period = 190, forward_slash = 191, grave_accent = 192, open_bracket = 219,
    back_slash = 220, close_braket = 221, single_quote = 222
}
