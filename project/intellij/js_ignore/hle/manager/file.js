///<reference path="../../global.d.ts" />
var Device = (function () {
    function Device(name, vfs) {
        this.name = name;
        this.vfs = vfs;
        this.cwd = '';
    }
    Device.prototype.devctlAsync = function (command, input, output) {
        return this.vfs.devctlAsync(command, input, output);
    };
    Device.prototype.openAsync = function (uri, flags, mode) {
        return this.vfs.openAsync(uri.pathWithoutDevice, flags, mode);
    };
    Device.prototype.openDirectoryAsync = function (uri) {
        return this.vfs.openDirectoryAsync(uri.pathWithoutDevice);
    };
    Device.prototype.getStatAsync = function (uri) {
        return this.vfs.getStatAsync(uri.pathWithoutDevice);
    };
    return Device;
})();
exports.Device = Device;
var HleFile = (function () {
    function HleFile(entry) {
        this.entry = entry;
        this.cursor = 0;
        this._asyncResult = null;
        this._asyncPromise = null;
    }
    Object.defineProperty(HleFile.prototype, "asyncResult", {
        get: function () {
            return this._asyncResult;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HleFile.prototype, "asyncOperation", {
        get: function () {
            return this._asyncPromise;
        },
        enumerable: true,
        configurable: true
    });
    HleFile.prototype.startAsyncOperation = function () {
        this._asyncResult = null;
    };
    HleFile.prototype.setAsyncOperation = function (operation) {
        var _this = this;
        this._asyncResult = null;
        this._asyncPromise = operation.then(function (value) {
            _this._asyncResult = value;
            return value;
        });
    };
    HleFile.prototype.setAsyncOperationNow = function (value) {
        this._asyncResult = value;
        this._asyncPromise = Promise.resolve(value);
    };
    HleFile.prototype.close = function () {
        this.entry.close();
    };
    return HleFile;
})();
exports.HleFile = HleFile;
var HleDirectory = (function () {
    function HleDirectory(childs) {
        this.childs = childs;
        this.cursor = 0;
    }
    HleDirectory.prototype.read = function () {
        return this.childs[this.cursor++];
    };
    Object.defineProperty(HleDirectory.prototype, "left", {
        get: function () {
            return this.childs.length - this.cursor;
        },
        enumerable: true,
        configurable: true
    });
    HleDirectory.prototype.close = function () {
    };
    return HleDirectory;
})();
exports.HleDirectory = HleDirectory;
var Uri = (function () {
    function Uri(path) {
        this.path = path;
    }
    Object.defineProperty(Uri.prototype, "device", {
        get: function () {
            return (this.path.split(':'))[0];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "pathWithoutDevice", {
        get: function () {
            return (this.path.split(':'))[1];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "isAbsolute", {
        get: function () {
            return this.path.contains(':');
        },
        enumerable: true,
        configurable: true
    });
    Uri.prototype.append = function (that) {
        if (that.isAbsolute)
            return that;
        return new Uri(this.path + '/' + that.path);
    };
    return Uri;
})();
exports.Uri = Uri;
var FileManager = (function () {
    function FileManager() {
        this.devices = {};
        this.cwd = new Uri('ms0:/');
    }
    FileManager.prototype.chdir = function (cwd) {
        this.cwd = new Uri(cwd);
    };
    FileManager.prototype.getDevice = function (name) {
        name = name.replace(/:$/, '');
        var device = this.devices[name];
        if (!device)
            throw (new Error(sprintf("Can't find device '%s'", name)));
        return device;
    };
    FileManager.prototype.openAsync = function (name, flags, mode) {
        var uri = this.cwd.append(new Uri(name));
        return this.getDevice(uri.device).openAsync(uri, flags, mode).then(function (entry) { return new HleFile(entry); });
    };
    FileManager.prototype.devctlAsync = function (deviceName, command, input, output) {
        return this.getDevice(deviceName).devctlAsync(command, input, output);
    };
    FileManager.prototype.openDirectoryAsync = function (name) {
        var uri = this.cwd.append(new Uri(name));
        return this.getDevice(uri.device).openDirectoryAsync(uri).then(function (entry) {
            return entry.enumerateAsync().then(function (items) {
                entry.close();
                return new HleDirectory(items);
            });
        });
    };
    FileManager.prototype.getStatAsync = function (name) {
        var uri = this.cwd.append(new Uri(name));
        return this.getDevice(uri.device).getStatAsync(uri);
    };
    FileManager.prototype.mount = function (device, vfs) {
        this.devices[device] = new Device(device, vfs);
    };
    return FileManager;
})();
exports.FileManager = FileManager;
//# sourceMappingURL=file.js.map