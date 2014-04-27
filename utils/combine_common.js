var fs = require("fs");

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

function requireModules(moduleFiles) {
	var modules = {};
	
	function normalizePath(path) {
		var components = [];
		path.split('/').forEach(function(item) {
			switch (item) {
				case '': case '.': break;
				case '..': if (components.length) components.pop(); break;
				default: components.push(item);
			}
		});
		//console.log('path: ' + path + ' -> ' + components.join('/'));
		return components.join('/');
	}
	
	function getParentPath(path) {
		var index = path.lastIndexOf('/');
		if (index >= 0) return path.substr(0, index);
		return '';
	}
	
	var getRequireForPath = function(path) {
		return function(relativeModuleName) {
			var absoluteModuleName = normalizePath(path + '/' + relativeModuleName);
			var absoluteModuleParent = getParentPath(absoluteModuleName);
			var module = modules[absoluteModuleName];
			if (!module) {
				modules[absoluteModuleName] = module = { exports : {} };
				var moduleFunction = moduleFiles[absoluteModuleName];
				if (!moduleFunction) throw(new Error("Can't find module '" + absoluteModuleName + "'"));
				moduleFunction(module, module.exports, getRequireForPath(absoluteModuleParent));
			}
			return module.exports;
		};
	};
	return getRequireForPath('');
}

function generateCombinedCommonJs(mapFiles) {
	var commonjsFile = '';
	commonjsFile += 'var require = (function() {\n';
	commonjsFile += String(requireModules);
	commonjsFile += 'return requireModules({\n';
	var moduleNames = [];
	for (var moduleName in mapFiles) moduleNames.push(moduleName);
	moduleNames.sort();
	
	var items = [];
	moduleNames.forEach(function(moduleName) {
		var content = mapFiles[moduleName];
		items.push(JSON.stringify(moduleName.replace(/\.js$/, '')) + ': function(module, exports, require) {\n' + content.replace('\uFEFF', '') + '}');
	});
	
	commonjsFile += items.join(',\n');

	commonjsFile += '});\n'
	commonjsFile += '})();\n';
	return commonjsFile;
}

exports.generateCombinedCommonJs = generateCombinedCommonJs;

/*
var require = requireModules({
	'demo' : function(exports, require) {
		var demo4 = require('src/demo4');
		exports.test = demo4.test;
	},
	'src/demo4' : function(exports, require) {
		exports.test = 8;
	},
	'test/demo2' : function(exports, require) {
		var demo = require('../demo');
		console.log(demo.test);
	},
});

require('test/demo2');
*/

/*
var basePath = __dirname + '/../js';
var files = processDirectorySync(basePath, function(fname) {
	if ((fname.substr(-3) != '.js')) return false;
	
	var pathWithoutJs = fname.substr(0, fname.length-3);
	var pathToTs = __dirname + '/../' + pathWithoutJs + '.ts';
	if (fs.existsSync(pathToTs)) {
		return true;
	} else {
		console.log('file ' + pathToTs + ' not exists');
		return false;
	}
	return isJs;
});
var mapFiles = {};
files.forEach(function(file) {
	var moduleName = file.replace(/\.js$/, '');
	var content = fs.readFileSync(basePath + '/' + file, 'utf-8');
	mapFiles[moduleName] = content;
});

var commonjsFile = generateCombinedCommonJs(mapFiles);

fs.writeFileSync(__dirname + '/../jspspemu.js', commonjsFile);
*/
