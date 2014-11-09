///<reference path="../../global.d.ts" />
var memory = require('../memory');
var generator = require('./generator');
var state = require('./state');
var FunctionGenerator = generator.FunctionGenerator;
var CpuSpecialAddresses = state.CpuSpecialAddresses;
var InstructionCache = (function () {
    function InstructionCache(memory) {
        this.memory = memory;
        this.cache = {};
        this.functionGenerator = new FunctionGenerator(memory);
    }
    InstructionCache.prototype.invalidateAll = function () {
        this.cache = {};
    };
    InstructionCache.prototype.invalidateRange = function (from, to) {
        for (var n = from; n < to; n += 4)
            delete this.cache[n];
    };
    InstructionCache.prototype.getFunction = function (address) {
        var item = this.cache[address];
        if (item)
            return item;
        if (address == 268435455 /* EXIT_THREAD */) {
            return this.cache[address] = function (state) {
                //console.log(state);
                //console.log(state.thread);
                //console.warn('Thread: CpuSpecialAddresses.EXIT_THREAD: ' + state.thread.name);
                state.thread.stop('CpuSpecialAddresses.EXIT_THREAD');
                throw (new CpuBreakException());
            };
        }
        else {
            return this.cache[address] = this.functionGenerator.create(address);
        }
    };
    return InstructionCache;
})();
exports.InstructionCache = InstructionCache;
//# sourceMappingURL=icache.js.map