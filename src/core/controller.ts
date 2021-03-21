import "../emu/global"
import {Int8, StructArray, StructClass, UInt32} from "../global/struct";
import {MathUtils} from "../global/math";
import {Component} from "./component";

export class PspController implements IPspController {
    data = new SceCtrlData()
    latchSamplingCount: number = 0

    private contributors: PspControllerContributor[] = []

    addContributor(contributor: PspControllerContributor) {
        this.contributors.push(contributor)
        contributor.register()
    }

    register() {
    }

    unregister() {
        let contributor: PspControllerContributor | undefined
        while (contributor = this.contributors.pop()) {
            contributor.unregister()
        }
    }

    frame() {
        this.data.reset()
        for (const contributor of this.contributors) {
            contributor.computeFrame()
            this.data.setToMerge(this.data, contributor.data)
        }
    }
}

export class SceCtrlData {
	timeStamp: number = 0;
	buttons: PspCtrlButtons = PspCtrlButtons.none;
	lx: number = 0;
	ly: number = 0;
	_rsrv = new Int32Array(5)

    constructor() {
		this.x = 0;
		this.y = 0;
	}

	reset(timeStamp: number = 0) {
	    this.timeStamp = timeStamp
        this.buttons = PspCtrlButtons.none
	    this.x = 0
        this.y = 0
    }

    setToMerge(l: SceCtrlData, r: SceCtrlData) {
	    this.timeStamp = l.timeStamp
	    this.x = l.x + r.x
        this.y = l.y + r.y
        this.buttons = l.buttons | r.buttons
    }

    copyFrom(other: SceCtrlData) {
        this.timeStamp = other.timeStamp
        this.buttons = other.buttons
        this.lx = other.lx
        this.ly = other.ly
    }
		
	get x() { return MathUtils.clampM1_1(((this.lx / 255.0) - 0.5) * 2.0); }
	get y() { return MathUtils.clampM1_1(((this.ly / 255.0) - 0.5) * 2.0); }

	set x(value: number) { this.lx = MathUtils.clamp0_255(((value / 2.0) + 0.5) * 255.0); }
	set y(value: number) { this.ly = MathUtils.clamp0_255(((value / 2.0) + 0.5) * 255.0); }

	static struct = StructClass.create<SceCtrlData>(SceCtrlData, [
		{ timeStamp: UInt32 },
		{ buttons: UInt32 },
		{ lx: Int8 },
		{ ly: Int8 },
		{ _rsrv: StructArray(Int8, 6) },
	]);
}

export abstract class PspControllerContributor implements Component {
    public data: SceCtrlData = new SceCtrlData()
    computeFrame(): void { }
    register(): void { }
    unregister(): void { }
}

export interface IPspController extends Component {
    data: SceCtrlData;
    latchSamplingCount: number;
}

// noinspection JSUnusedGlobalSymbols
export const enum PspCtrlButtons {
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
