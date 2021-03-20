import {Signal1} from "../../global/utils";

export class GpuStats {
    onStats = new Signal1<GpuStats>();
    totalStalls = 0;
    primCount = 0;
    totalCommands = 0;
    timePerFrame = 0;
    vertexCount = 0;
    batchCount = 0;
    indexCount = 0;
    nonIndexCount = 0;
    trianglePrimCount = 0;
    triangleStripPrimCountalue = 0;
    spritePrimCount = 0;
    otherPrimCount = 0;
    hashMemoryCount = 0;
    hashMemorySize = 0;

    constructor() {
    }

    private reset() {
        this.totalStalls = 0;
        this.primCount = 0;
        this.totalCommands = 0;
        this.timePerFrame = 0;
        this.vertexCount = 0;
        this.batchCount = 0;
        this.indexCount = 0;
        this.nonIndexCount = 0;
        this.trianglePrimCount = 0;
        this.triangleStripPrimCountalue = 0;
        this.spritePrimCount = 0;
        this.otherPrimCount = 0;
        this.hashMemoryCount = 0;
        this.hashMemorySize = 0;
    }
    updateAndReset() {
        this.onStats.dispatch(this);
        this.reset();
    }
}