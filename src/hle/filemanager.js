var hle;
(function (hle) {
    var Device = (function () {
        function Device(name, vfs) {
            this.name = name;
            this.vfs = vfs;
            this.cwd = '';
        }
        Device.prototype.open = function (uri, flags, mode) {
            var entry = this.vfs.open(uri.pathWithoutDevice);
            return entry;
        };
        return Device;
    })();
    hle.Device = Device;

    var HleFile = (function () {
        function HleFile(entry) {
            this.entry = entry;
            this.cursor = 0;
        }
        HleFile.prototype.close = function () {
            this.entry.close();
        };
        return HleFile;
    })();
    hle.HleFile = HleFile;

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
    hle.Uri = Uri;

    var FileManager = (function () {
        function FileManager() {
            this.devices = {};
            this.cwd = new Uri('');
        }
        FileManager.prototype.chdir = function (cwd) {
            this.cwd = new Uri(cwd);
        };

        FileManager.prototype.getDevice = function (name) {
            var device = this.devices[name];
            if (!device)
                throw (new Error(sprintf("Can't find device '%s'", name)));
            return device;
        };

        FileManager.prototype.open = function (name, flags, mode) {
            var uri = this.cwd.append(new Uri(name));
            var entry = this.getDevice(uri.device).open(uri, flags, mode);
            return new HleFile(entry);
        };

        FileManager.prototype.mount = function (device, vfs) {
            this.devices[device] = new Device(device, vfs);
        };
        return FileManager;
    })();
    hle.FileManager = FileManager;
})(hle || (hle = {}));
//# sourceMappingURL=filemanager.js.map
