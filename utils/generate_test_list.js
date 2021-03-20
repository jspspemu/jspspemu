var fs = require("fs");
var path = require("path");

function processDirectorySync(dir, matcher, out, basePath) {
	if (matcher === undefined) matcher = function(fname) {return true; };
	if (basePath === undefined) basePath = dir;
	if (out === undefined) out = [];
	fs.readdirSync(dir).forEach(function(name) {
		var fname = dir + '/' + name;
		var stat = fs.statSync(fname);
		if (stat.isDirectory()) {
			processDirectorySync(fname, matcher, out, basePath);
		} else {
			var rfname = fname.substr(basePath.length + 1);
			if (matcher(rfname)) {
				out.push(rfname);
				//console.log(fname);
			}
		}
	});
	return out;
}

var items = {};

processDirectorySync('../pspautotests/tests', function(name) { return name.match(/\.expected$/); }).forEach(function(name) {
	var _path = path.dirname(name);
	var _base = path.basename(name, '.expected');
	if (!items[_path]) items[_path] = [];
	items[_path].push(_base);
});

for (var key in items) {
	console.log('{ ' + JSON.stringify(key) +  ': ' + JSON.stringify(items[key]) + '},');
}
