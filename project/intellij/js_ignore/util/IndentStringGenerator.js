///<reference path="../global.d.ts" />
var IndentStringGenerator = (function () {
    function IndentStringGenerator() {
        this.indentation = 0;
        this.output = '';
        this.newLine = true;
    }
    IndentStringGenerator.prototype.indent = function (callback) {
        this.indentation++;
        try {
            callback();
        }
        finally {
            this.indentation--;
        }
    };
    IndentStringGenerator.prototype.write = function (text) {
        var chunks = text.split('\n');
        for (var n = 0; n < chunks.length; n++) {
            if (n != 0)
                this.writeBreakLine();
            this.writeInline(chunks[n]);
        }
    };
    IndentStringGenerator.prototype.writeInline = function (text) {
        if (text == null || text.length == 0)
            return;
        if (this.newLine) {
            for (var n = 0; n < this.indentation; n++)
                this.output += '\t';
            this.newLine = false;
        }
        this.output += text;
    };
    IndentStringGenerator.prototype.writeBreakLine = function () {
        this.output += '\n';
        this.newLine = true;
    };
    return IndentStringGenerator;
})();
module.exports = IndentStringGenerator;
//# sourceMappingURL=IndentStringGenerator.js.map