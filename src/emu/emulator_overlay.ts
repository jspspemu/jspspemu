///<reference path="./global.ts" />

import { WebGlPspDrawDriver } from '../core/gpu/webgl/webgl_driver';
import { GpuStats } from '../core/gpu/gpu_stats';
import { Emulator } from './emulator';
import {numberToFileSize, numberToSeparator, Signal0, Signal1, WatchValue} from "../global/utils";

interface OverlaySection {
    element: HTMLElement;
    update(): void;
    reset(): void;
}

let canDOMCreateElements = (typeof document != 'undefined');

class OverlayCounter<T> implements OverlaySection {
    public value: T;
    public element: HTMLElement;
    constructor(public name: string, private resetValue: T, private representer?: (v: T) => any) {
        this.reset();
        if (canDOMCreateElements) {
            this.element = document.createElement('div');
        }
    }
    update() {
        if (this.element) this.element.innerText = `${this.name}: ${this.representedValue}`;
    }
    get representedValue() {
        return this.representer ? this.representer(this.value) : this.value;
    }
    reset() {
        this.value = this.resetValue;
    }
}

class OverlayIntent implements OverlaySection {
    public element: HTMLButtonElement;
    constructor(text: string, action: () => void) {
        if (canDOMCreateElements) {
            this.element = document.createElement('button');
            this.element.innerHTML = text;
            this.element.onclick = e => action();
        }
    }
    update() {
    }
    reset() {
    }
}

class OverlaySlider implements OverlaySection {
    public element: HTMLInputElement;
    constructor(text: string, initialRatio: number, action: (value: number) => void) {
        if (canDOMCreateElements) {
            this.element = document.createElement('input');
            this.element.type = 'range';
            this.element.min = `0`;
            this.element.max = `1000`;
            this.element.value = `${initialRatio * 1000}`;
            //this.element.innerHTML = text;
            var lastReportedValue = NaN;
            var report = (e: any) => {
                if (this.ratio == lastReportedValue) return;
                lastReportedValue = this.ratio;
                action(this.ratio);
            };
            this.element.onmousemove = report;
            this.element.onchange = report;
        }
    }
    set ratio(value: number) {
        this.value = value * 1000;
    }
    get ratio() {
        return (this.value / 1000);
    }
    set value(v: number) {
        this.element.value = `${v}`;
    }
    get value() {
        return +this.element.value;
    }
    update() {
    }
    reset() {
    }
}

class Overlay {
    private element: HTMLDivElement | null;
    private sections: OverlaySection[] = [];

    constructor() {
        const element = this.element = canDOMCreateElements ? document.createElement('div') : null;
        if (element) {
            element.style.position = 'absolute';
            element.style.zIndex = '10000';
            element.style.top = '0';
            element.style.right = '0';
            element.style.background = 'rgba(0, 0, 0, 0.3)';
            element.style.font = '12px Arial';
            element.style.width = '200px';
            element.style.height = 'auto';
            element.style.padding = '4px';
            element.style.color = 'white';
            document.body.appendChild(element);
        }
    }

    private addElement<T extends OverlaySection>(element: T): T {
        this.sections.push(element);
        if (this.element) {
            this.element.appendChild(element.element);
        }
        return element;
    }

    createCounter<T>(name: string, resetValue: T, representer?: (v: T) => any): OverlayCounter<T> {
        return this.addElement(new OverlayCounter(name, resetValue, representer));
    }

    createIntent(text: string, action: () => void) {
        return this.addElement(new OverlayIntent(text, action));
    }

    createSlider(text: string, initialRatio: number, action: (value: number) => void) {
        return this.addElement(new OverlaySlider(text, initialRatio, action));
    }

    update() {
        for (let section of this.sections) section.update();
    }

    private reset() {
        for (let s of this.sections) s.reset();
    }

    updateAndReset() {
        this.update();
        this.reset();
    }
}

export class DebugOverlay {
    overlay = new Overlay()
    freezing = new WatchValue(false)
    overlayBatchSlider = this.overlay.createSlider('batch', 1.0, (ratio) => {
        this.webglDriver.drawRatio = ratio;
        this.webglDriver.redrawLastTransfer();
    });
    overlayIndexCount = this.overlay.createCounter('indexCount', 0, numberToSeparator);
    overlayNonIndexCount = this.overlay.createCounter('nonIndexCount', 0, numberToSeparator);
    overlayVertexCount = this.overlay.createCounter('vertexCount', 0, numberToSeparator);
    trianglePrimCount = this.overlay.createCounter('trianglePrimCount', 0, numberToSeparator);
    triangleStripPrimCount = this.overlay.createCounter('triangleStripPrimCount', 0, numberToSeparator);
    spritePrimCount = this.overlay.createCounter('spritePrimCount', 0, numberToSeparator);
    otherPrimCount = this.overlay.createCounter('otherPrimCount', 0, numberToSeparator);
    hashMemoryCount = this.overlay.createCounter('hashMemoryCount', 0, numberToSeparator);
    hashMemorySize = this.overlay.createCounter('hashMemorySize', 0, numberToFileSize);
    totalCommands = this.overlay.createCounter('totalCommands', 0, numberToSeparator);
    totalStalls = this.overlay.createCounter('totalStalls', 0, numberToSeparator);
    primCount = this.overlay.createCounter('primCount', 0, numberToSeparator);
    batchCount = this.overlay.createCounter('batchCount', 0, numberToSeparator);
    timePerFrame = this.overlay.createCounter('time', 0, (v) => `${v.toFixed(0)} ms`);

    gpuFreezing = new Signal1<boolean>();
    gpuDumpCommands = new Signal0();

    constructor(public webglDriver: WebGlPspDrawDriver) {
    }

    register() {
        let webglDriver = this.webglDriver;
        let overlay = this.overlay;
        overlay.createIntent('toggle colors', () => {
            webglDriver.enableColors = !webglDriver.enableColors;
            webglDriver.redrawLastTransfer();
        });

        overlay.createIntent('toggle antialiasing', () => {
            webglDriver.antialiasing = !webglDriver.antialiasing;
            webglDriver.redrawLastTransfer();
        });

        overlay.createIntent('toggle textures', () => {
            webglDriver.enableTextures = !webglDriver.enableTextures;
            webglDriver.redrawLastTransfer();
        });

        overlay.createIntent('skinning', () => {
            webglDriver.enableSkinning = !webglDriver.enableSkinning;
            webglDriver.redrawLastTransfer();
        });

        overlay.createIntent('bilinear', () => {
            webglDriver.enableBilinear = !webglDriver.enableBilinear;
            webglDriver.redrawLastTransfer();
        });

        overlay.createIntent('freeze', () => {
            this.freezing.value = !this.freezing.value;
            this.gpuFreezing.dispatch(this.freezing.value);
        });

        var dumpFrameCommandsList: string[] = [];
        overlay.createIntent('dump frame commands', () => {
            this.gpuDumpCommands.dispatch();
        });

        overlay.createIntent('x1', () => {
            webglDriver.setFramebufferSize(480 * 1, 272 * 1);
            webglDriver.redrawLastTransfer();
        });

        overlay.createIntent('x2', () => {
            webglDriver.setFramebufferSize(480 * 2, 272 * 2);
            webglDriver.redrawLastTransfer();
        });

        overlay.createIntent('x3', () => {
            webglDriver.setFramebufferSize(480 * 3, 272 * 3);
            webglDriver.redrawLastTransfer();
        });

        overlay.createIntent('x4', () => {
            webglDriver.setFramebufferSize(480 * 4, 272 * 4);
            webglDriver.redrawLastTransfer();
        });

        overlay.updateAndReset();
    }

    linkTo(emulator: Emulator) {
        let stats = emulator.gpuStats;
        stats.onStats.add((stats) => {
            this.totalStalls.value = stats.totalStalls;
            this.primCount.value = stats.primCount;
            this.totalCommands.value = stats.totalCommands;
            this.timePerFrame.value = stats.timePerFrame;
            this.overlayVertexCount.value = stats.vertexCount;
            this.batchCount.value = stats.batchCount;
            this.overlayIndexCount.value = stats.indexCount;
            this.overlayNonIndexCount.value = stats.nonIndexCount;
            this.trianglePrimCount.value = stats.trianglePrimCount;
            this.triangleStripPrimCount.value = stats.triangleStripPrimCountalue;
            this.spritePrimCount.value = stats.spritePrimCount;
            this.otherPrimCount.value = stats.otherPrimCount;
            this.hashMemoryCount.value = stats.hashMemoryCount;
            this.hashMemorySize.value = stats.hashMemorySize;
        });
    }
}
