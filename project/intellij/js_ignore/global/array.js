///<reference path="./math.ts" />
function identity(a) {
    return a;
}
function funcTrue(a) {
    return true;
}
function compareNumbers(a, b) {
    if (a < b)
        return -1;
    if (a > b)
        return +1;
    return 0;
}
Array.prototype.contains = function (item) {
    return this.indexOf(item) >= 0;
};
Array.prototype.binarySearchValue = function (selector) {
    var array = this;
    var index = array.binarySearchIndex(selector);
    if (index < 0)
        return null;
    return array[index];
};
Array.prototype.binarySearchIndex = function (selector) {
    var array = this;
    var min = 0;
    var max = array.length - 1;
    var step = 0;
    if (array.length == 0)
        return -1;
    while (true) {
        var current = Math.floor((min + max) / 2);
        var item = array[current];
        var result = selector(item);
        if (result == 0) {
            //console.log('->', current);
            return current;
        }
        //console.log(min, current, max);
        if (((current == min) || (current == max))) {
            if (min != max) {
                //console.log('*');
                min = max = current = (current != min) ? min : max;
            }
            else {
                break;
            }
        }
        else {
            if (result < 0) {
                max = current;
            }
            else if (result > 0) {
                min = current;
            }
        }
        step++;
        if (step >= 64)
            throw (new Error("Too much steps"));
    }
    return -1;
};
Array.prototype.min = (function (selector) {
    var array = this;
    if (!selector)
        selector = function (a) { return a; };
    if (array.length == 0)
        return null;
    return array.reduce(function (previous, current) {
        return (selector(previous) < selector(current) ? previous : current);
    }, array[0]);
});
Array.prototype.max = (function (selector) {
    var array = this;
    if (!selector)
        selector = function (a) { return a; };
    if (array.length == 0)
        return null;
    return array.reduce(function (previous, current) {
        return (selector(previous) > selector(current) ? previous : current);
    }, array[0]);
});
Array.prototype.sortBy = function (selector) {
    return this.slice(0).sort(function (a, b) { return compare(selector(a), selector(b)); });
};
Array.prototype.cast = (function () {
    return this;
});
Array.prototype.count = (function (selector) {
    var array = this;
    if (!selector)
        selector = funcTrue;
    var result = 0;
    for (var n = 0; n < array.length; n++)
        if (selector(array[n]))
            result++;
    return result;
});
Array.prototype.any = (function (selector) {
    var array = this;
    if (!selector)
        selector = funcTrue;
    for (var n = 0; n < array.length; n++)
        if (selector(array[n]))
            return true;
    return false;
});
Array.prototype.first = (function (selector) {
    var array = this;
    if (!selector)
        selector = identity;
    for (var n = 0; n < array.length; n++)
        if (selector(array[n]))
            return array[n];
    return undefined;
});
Array.prototype.sum = (function (selector) {
    var array = this;
    if (!selector)
        selector = function (a) { return a; };
    return array.reduce(function (previous, current) {
        return previous + selector(current);
    }, 0);
});
Array.prototype.remove = function (item) {
    var array = this;
    var index = array.indexOf(item);
    if (index >= 0)
        array.splice(index, 1);
};
Array.prototype.toLookupMap = function () {
    var array = this;
    var lookup = {};
    for (var n = 0; n < array.length; n++) {
        lookup[array[n]] = n;
    }
    return lookup;
};
Object.defineProperty(Array.prototype, "contains", { enumerable: false });
Object.defineProperty(Array.prototype, "toLookupMap", { enumerable: false });
Object.defineProperty(Array.prototype, "cast", { enumerable: false });
Object.defineProperty(Array.prototype, "count", { enumerable: false });
Object.defineProperty(Array.prototype, "any", { enumerable: false });
Object.defineProperty(Array.prototype, "sum", { enumerable: false });
Object.defineProperty(Array.prototype, "min", { enumerable: false });
Object.defineProperty(Array.prototype, "max", { enumerable: false });
Object.defineProperty(Array.prototype, "sortBy", { enumerable: false });
Object.defineProperty(Array.prototype, "first", { enumerable: false });
Object.defineProperty(Array.prototype, "remove", { enumerable: false });
Object.defineProperty(Array.prototype, "binarySearchValue", { enumerable: false });
Object.defineProperty(Array.prototype, "binarySearchIndex", { enumerable: false });
//# sourceMappingURL=array.js.map