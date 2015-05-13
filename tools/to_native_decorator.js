var fs = require('fs');

function processFolder(path, callback) {
	for (var fname of fs.readdirSync(path)) {
		var fpath = path + '/' + fname;
		var isdir = fs.statSync(fpath).isDirectory();
		if (isdir) {
			processFolder(fpath, callback);
		} else {
			callback(fpath);
		}
	}
}

function processFile(filePath) {
	var file = fs.readFileSync(filePath, 'utf-8');
	file = file.replace(/(\w+)\s*=\s*createNativeFunction\((.*?),\s*this\s*,\s*(\(.*?\).*?)=> \{/g, '@nativeFunction($2)\n\t$1$3{');
	file = file.replace('import createNativeFunction = _utils.createNativeFunction;', 'import nativeFunction = _utils.nativeFunction;');
	fs.writeFileSync(filePath, file);
}

processFolder('../source/src/hle/module', function(fpath) {
	if (fpath.match(/\.ts$/)) {
		processFile(fpath);
		//console.log(fpath);
	}
});

/*
//var file = fs.readFileSync('to_native_decorator.js', 'utf-8');
*/