///<reference path="../../global.d.ts" />
var state = require('./state');
var icache = require('./icache');
var ProgramExecutor = (function () {
    function ProgramExecutor(state, instructionCache) {
        this.state = state;
        this.instructionCache = instructionCache;
        this.lastPC = 0;
        this.lastTime = 0;
        this.times = 0;
        this.state.executor = this;
    }
    ProgramExecutor.prototype._executeStep = function () {
        if (this.state.PC == 0)
            console.error(sprintf("Calling 0x%08X from 0x%08X", this.state.PC, this.lastPC));
        this.lastPC = this.state.PC;
        var func = this.instructionCache.getFunction(this.state.PC);
        func(this.state);
        //this.instructionCache.getFunction(this.state.PC)(this.state);
    };
    ProgramExecutor.prototype.executeUntilPCReachesWithoutCall = function (expectedPC) {
        while (this.state.PC != expectedPC) {
            this._executeStep();
            this.times++;
            if (this.times >= 100000) {
                this.times = 0;
                if ((performance.now() - this.lastTime) >= 50)
                    throw (new CpuBreakException());
                this.lastTime = performance.now();
            }
        }
    };
    ProgramExecutor.prototype.executeWithoutCatch = function (maxIterations) {
        if (maxIterations === void 0) { maxIterations = -1; }
        while (maxIterations != 0) {
            this._executeStep();
            if (maxIterations > 0)
                maxIterations--;
        }
    };
    ProgramExecutor.prototype.execute = function (maxIterations) {
        if (maxIterations === void 0) { maxIterations = -1; }
        try {
            this.executeWithoutCatch(maxIterations);
        }
        catch (e) {
            if (!(e instanceof CpuBreakException)) {
                console.log(this.state);
                this.state.printCallstack();
                throw (e);
            }
        }
    };
    return ProgramExecutor;
})();
exports.ProgramExecutor = ProgramExecutor;
//# sourceMappingURL=executor.js.map