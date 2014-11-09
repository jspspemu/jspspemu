///<reference path="../global.d.ts" />

export interface IPspController {
	startAsync();
	stopAsync();
	data: SceCtrlData;
	latchSamplingCount: number;
}

export class SceCtrlData {
	timeStamp: number = 0;
	buttons: PspCtrlButtons = PspCtrlButtons.none;
	lx: number = 0;
	ly: number = 0;
	_rsrv: number[] = [0, 0, 0, 0, 0]

    constructor() {
		this.x = 0;
		this.y = 0;
	}
		
	get x() { return ((this.lx / 255.0) - 0.5) * 2.0; }
	get y() { return ((this.ly / 255.0) - 0.5) * 2.0; }

	set x(value: number) { this.lx = (((value / 2.0) + 0.5) * 255.0); }
	set y(value: number) { this.ly = (((value / 2.0) + 0.5) * 255.0); }

	static struct = StructClass.create<SceCtrlData>(SceCtrlData, [
		{ timeStamp: UInt32 },
		{ buttons: UInt32 },
		{ lx: Int8 },
		{ ly: Int8 },
		{ _rsrv: StructArray(Int8, 6) },
	]);
}

export class PspController {
	data: SceCtrlData = new SceCtrlData();
	buttonMapping: any = {};
	fieldMapping: any = {};

	analogUp: boolean = false;
	analogDown: boolean = false;
	analogLeft: boolean = false;
	analogRight: boolean = false;

	analogAddX: number = 0;
	analogAddY: number = 0;

	latchSamplingCount: number = 0;

	constructor() {
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

	private keyDown(e: KeyboardEvent) {
		//console.log(e.keyCode);
		var button = this.buttonMapping[e.keyCode];
		if (button !== undefined) this.data.buttons |= button;

		var field = this.fieldMapping[e.keyCode];
		if (field !== undefined) this[field] =true;
	}

	private keyUp(e: KeyboardEvent) {
		var button = this.buttonMapping[e.keyCode];
		if (button !== undefined) this.data.buttons &= ~button;

		var field = this.fieldMapping[e.keyCode];
		if (field !== undefined) this[field] = false;
	}

	simulateButtonDown(button: number) {
		this.data.buttons |= button;
	}

	simulateButtonUp(button: number) {
		this.data.buttons &= ~button;
	}

	simulateButtonPress(button: number) {
		this.simulateButtonDown(button);
		setTimeout(() => { this.simulateButtonUp(button); }, 60);
	}

	animationTimeId: number = 0;

	startAsync() {
		document.addEventListener('keydown', (e) => this.keyDown(e));
		document.addEventListener('keyup', (e) => this.keyUp(e));
		this.frame(0);
		return Promise.resolve();
	}

	private gamepadsButtons = [];

	private frame(timestamp: number) {
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

		//console.log('zzzzzzzzz');
		if (navigator['getGamepads']) {
			//console.log('bbbbbbbbb');
			var gamepads = (navigator['getGamepads'])();
			if (gamepads[0]) {
				//console.log('aaaaaaaa');
				var buttonMapping = [
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

				var gamepad = gamepads[0];
				var buttons = gamepad['buttons'];
				var axes = gamepad['axes'];
				this.data.x += axes[0];
				this.data.y += axes[1];

				function checkButton(button) {
					if (typeof button == 'number') {
						return button != 0;
					} else {
						return button ? !!(button.pressed) : false;
					}
				}

				for (var n = 0; n < 16; n++) {
					if (checkButton(buttons[n])) {
						this.simulateButtonDown(buttonMapping[n]);
					} else {
						this.simulateButtonUp(buttonMapping[n]);
					}
				}
			}
		}

		this.data.x = MathUtils.clamp(this.data.x, -1, +1);
		this.data.y = MathUtils.clamp(this.data.y, -1, +1);

		this.animationTimeId = requestAnimationFrame((timestamp: number) => this.frame(timestamp));
	}

	stopAsync() {
		document.removeEventListener('keydown', this.keyDown);
		document.removeEventListener('keyup', this.keyUp);
		cancelAnimationFrame(this.animationTimeId);
		return Promise.resolve();
	}
}

export enum PspCtrlButtons //: uint
{
	none = 0x0000000,
	select = 0x0000001,
	start = 0x0000008,
	up = 0x0000010,
	right = 0x0000020,
	down = 0x0000040,
	left = 0x0000080,
	leftTrigger = 0x0000100,
	rightTrigger = 0x0000200,
	triangle = 0x0001000,
	circle = 0x0002000,
	cross = 0x0004000,
	square = 0x0008000,
	home = 0x0010000,
	hold = 0x0020000,
	wirelessLanUp = 0x0040000,
	remote = 0x0080000,
	volumeUp = 0x0100000,
	volumeDown = 0x0200000,
	screen = 0x0400000,
	note = 0x0800000,
	discPresent = 0x1000000,
	memoryStickPresent = 0x2000000,
}

export enum HtmlKeyCodes {
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
