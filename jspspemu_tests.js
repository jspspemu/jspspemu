/* global global */
/* global loggerPolicies */

global._ = require('./source/lib/underscore.js');
global.fs = require('fs');
global.assert = require('chai').assert;
//mocha.setup('bdd');

function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

var require2 = require('./jspspemu.js').require2;
loggerPolicies.disableAll = true;
var _tests = require2('test/_tests');
