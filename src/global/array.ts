function identity<T>(a: T) { return a; }
function funcTrue<T>(a: T) { return true; }

interface Array<T> {
	remove(item: T);
	sortBy(item: (item: T) => any): T[];
	any(filter?: (item: T) => boolean): T;
	count(filter?: (item: T) => boolean): number;
	cast<T2>(): T2[];
	first(filter?: (item: T) => boolean): T;
	sum<Q>(selector?: (item: T) => Q);
	max<Q>(selector?: (item: T) => Q);
	binarySearchIndex(selector: (item: T) => number): number;
	binarySearchValue(selector: (item: T) => number): T;
	contains(item: T): boolean;
	toLookupMap(): {};
}

function compareNumbers(a, b) {
	if (a < b) return -1;
	if (a > b) return +1;
	return 0;
}

Array.prototype.contains = function <T>(item: T) {
	return (<T[]>this).indexOf(item) >= 0;
}

Array.prototype.binarySearchValue = function <T>(selector: (item: T) => number) {
	var array = <T[]>this;

	var index = array.binarySearchIndex(selector);
	if (index < 0) return null;
	return array[index];
};

Array.prototype.binarySearchIndex = function <T>(selector: (item: T) => number) {
	var array = <T[]>this;
	var min = 0;
	var max = array.length - 1;
	var step = 0;

	if (array.length == 0) return -1;

	//console.log('--------');

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
				//console.log(min, current, max);
			} else {
				//console.log('#');
				break;
			}
		} else {
			if (result < 0) {
				max = current;
			} else if (result > 0) {
				min = current;
			}
		}
		step++;
		if (step >= 64) throw (new Error("Too much steps"));
	}

	return -1;
};

Array.prototype.max = <any>(function (selector: Function) {
	var array = <any[]>this;
	if (!selector) selector = a => a;
	return array.reduce((previous, current) => { return Math.max(previous, selector(current)); }, selector(array[0]));
});

Array.prototype.sortBy = function (selector: Function) {
	return (<any[]>this).slice(0).sort((a, b) => compare(selector(a), selector(b)));
};

Array.prototype.cast = <any>(function () {
	return this;
});

Array.prototype.count = <any>(function (selector: Function) {
	var array = <any[]>this;
	if (!selector) selector = funcTrue;
	var result = 0;
	for (var n = 0; n < array.length; n++) if (selector(array[n])) result++;
	return result;
});

Array.prototype.any = <any>(function (selector: Function) {
	var array = <any[]>this;
	if (!selector) selector = funcTrue;
	for (var n = 0; n < array.length; n++) if (selector(array[n])) return true;
	return false;
});

Array.prototype.first = <any>(function (selector: Function) {
	var array = <any[]>this;
	if (!selector) selector = identity;
	for (var n = 0; n < array.length; n++) if (selector(array[n])) return array[n];
	return undefined;
});

Array.prototype.sum = <any>(function (selector: Function) {
	var array = <any[]>this;
	if (!selector) selector = a => a;
	return array.reduce((previous, current) => { return previous + selector(current); }, 0);
});

Array.prototype.remove = function (item) {
	var array = <any[]>this;
	var index = array.indexOf(item);
	if (index >= 0) array.splice(index, 1);
};

Array.prototype.toLookupMap = <any>function () {
	var array = <any[]>this;
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
Object.defineProperty(Array.prototype, "max", { enumerable: false });
Object.defineProperty(Array.prototype, "sortBy", { enumerable: false });
Object.defineProperty(Array.prototype, "first", { enumerable: false });
Object.defineProperty(Array.prototype, "sum", { enumerable: false });
Object.defineProperty(Array.prototype, "remove", { enumerable: false });
Object.defineProperty(Array.prototype, "binarySearchValue", { enumerable: false });
Object.defineProperty(Array.prototype, "binarySearchIndex", { enumerable: false });
