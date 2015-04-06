var fs = require("fs");
var path = require("path");
var watch = require("node-watch");
var child_process = require("child_process");
var dir = require("node-dir");
var wrench = require('wrench');

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

	var moduleNames = [];
	for (var moduleName in mapFiles) moduleNames.push(moduleName);
	moduleNames.sort();
	
	function isGlobal(moduleName) {
		return moduleName.match(/^src\/global/);
	}
	
	moduleNames.forEach(function(moduleName) {
		if (!isGlobal(moduleName)) return;
		commonjsFile += mapFiles[moduleName] + "\n";
	});

	commonjsFile += 'var require = (function() {\n';
	commonjsFile += String(requireModules);
	commonjsFile += 'return requireModules({\n';
	
	var items = [];
	moduleNames.forEach(function(moduleName) {
		if (isGlobal(moduleName)) return;
		var content = mapFiles[moduleName];
		items.push(JSON.stringify(moduleName.replace(/\.js$/, '')) + ': function(module, exports, require) {\n' + content.replace('\uFEFF', '') + '\n}');
	});
	
	commonjsFile += items.join(',\n');

	commonjsFile += '});\n';
	commonjsFile += '})();\n';
	commonjsFile += 'if (typeof exports != "undefined") exports.require2 = require;\n';
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

function compileProject(watch, done) {
    var ARGS = TSC_ARGS;
    var TSC_CMD = (process.platform == 'win32') ? 'tsc.cmd' : 'tsc';
	if (watch) ARGS = ['-w'].concat(TSC_ARGS);
	var tsc_command = child_process.spawn(TSC_CMD, ARGS);
	//console.log(ARGS);
	//console.log(tsc_command);
	///*
	tsc_command.stdout.on('data', function(data) {
		if (data.toString().indexOf("TS6042") >= 0) {
			done();
			//console.log('DATA:' + data);
			/*
			 if (!serverStarted) {
			 serverStarted = true;
			 setTimeout(startServer, 10);
			 }
			 */
		}
	});
	//*/
	tsc_command.on('exit', done);
	tsc_command.stdout.pipe(process.stdout);
	tsc_command.stderr.pipe(process.stderr);
}

exports.compileProject = compileProject;


var jsFilesContent = {};

var ROOT_FOLDER = path.normalize(__dirname + '/../..');
var JS_BASE_PATH = path.normalize(ROOT_FOLDER + "/js");
var SINGLETON_JS_FILE = path.normalize(ROOT_FOLDER + "/jspspemu.js");
var SOURCE_FOLDER = path.normalize(ROOT_FOLDER + "/source");
var BOOTSTRAP_FILE = path.normalize(SOURCE_FOLDER + '/bootstrap.ts');

// REQUIRED BECAUSE OF THIS BUG: https://github.com/Microsoft/TypeScript/issues/1106
var BOOTSTRAP_FILE_RELATIVE = path.relative(process.cwd(), BOOTSTRAP_FILE);

var TSC_ARGS = ['--removeComments', '--outDir', JS_BASE_PATH, '--target', 'ES5', '--module', 'commonjs', BOOTSTRAP_FILE_RELATIVE];

exports.ROOT_FOLDER = ROOT_FOLDER;
exports.JS_BASE_PATH = JS_BASE_PATH;
exports.SINGLETON_JS_FILE = SINGLETON_JS_FILE;
exports.SOURCE_FOLDER = SOURCE_FOLDER;
exports.BOOTSTRAP_FILE = BOOTSTRAP_FILE;
exports.BOOTSTRAP_FILE_RELATIVE = BOOTSTRAP_FILE_RELATIVE;


function updateSingleJsFile() {
	var combinedContent = generateCombinedCommonJs(jsFilesContent);
	fs.writeFileSync(SINGLETON_JS_FILE, combinedContent);
	console.log('Updated ' + SINGLETON_JS_FILE);
}
exports.updateSingleJsFile = updateSingleJsFile;

function tryIncludeFile(filename) {
	if (!filename.match(/\.js$/)) return false;
	if (filename.substr(0, JS_BASE_PATH.length) != JS_BASE_PATH) return;
	var moduleName = filename.substr(JS_BASE_PATH.length).replace(/\\/g, '/').replace(/^\/+/, '');
	var newContent = fs.readFileSync(filename, 'utf-8');
	var oldContent = jsFilesContent[moduleName];
	if (newContent === oldContent) return false;
	jsFilesContent[moduleName] = newContent;
	return true;
}
exports.tryIncludeFile = tryIncludeFile;

function analyzeFolder(folder) {
	wrench.readdirSyncRecursive(folder).forEach(function (filename) {
		filename = path.normalize(folder + '/' + filename);
		tryIncludeFile(filename);
	});
}
exports.analyzeFolder = analyzeFolder;

function watchFolder(folder) {
	watch(folder, {recursive: true, followSymLinks: true}, function (filename) {
		filename = path.normalize(filename);
		if (tryIncludeFile(filename)) {
			console.log(filename, ' changed.');
			updateSingleJsFile();
		}
	});
}
exports.watchFolder = watchFolder;

function analyzeAndWatchFolder(folder) {
	console.log("Reading and watching folder: '" + folder + "'");
	analyzeFolder(folder);
	watchFolder(folder);
}
exports.analyzeAndWatchFolder = analyzeAndWatchFolder;

