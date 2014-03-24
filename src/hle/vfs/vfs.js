var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var hle;
(function (hle) {
    (function (vfs) {
        var VfsEntry = (function () {
            function VfsEntry() {
            }
            Object.defineProperty(VfsEntry.prototype, "isDirectory", {
                get: function () {
                    throw (new Error("Must override isDirectory"));
                },
                enumerable: true,
                configurable: true
            });
            VfsEntry.prototype.enumerateAsync = function () {
                throw (new Error("Must override enumerateAsync"));
            };
            Object.defineProperty(VfsEntry.prototype, "size", {
                get: function () {
                    throw (new Error("Must override size"));
                },
                enumerable: true,
                configurable: true
            });
            VfsEntry.prototype.readAllAsync = function () {
                return this.readChunkAsync(0, this.size);
            };
            VfsEntry.prototype.readChunkAsync = function (offset, length) {
                throw (new Error("Must override readChunkAsync"));
            };
            VfsEntry.prototype.close = function () {
            };
            return VfsEntry;
        })();
        vfs.VfsEntry = VfsEntry;

        var Vfs = (function () {
            function Vfs() {
            }
            Vfs.prototype.open = function (path) {
                throw (new Error("Must override open"));
            };
            return Vfs;
        })();
        vfs.Vfs = Vfs;

        var IsoVfsFile = (function (_super) {
            __extends(IsoVfsFile, _super);
            function IsoVfsFile(node) {
                _super.call(this);
                this.node = node;
            }
            Object.defineProperty(IsoVfsFile.prototype, "isDirectory", {
                get: function () {
                    return this.node.isDirectory;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(IsoVfsFile.prototype, "size", {
                get: function () {
                    return this.node.size;
                },
                enumerable: true,
                configurable: true
            });
            IsoVfsFile.prototype.readChunkAsync = function (offset, length) {
                return this.node.readChunkAsync(offset, length);
            };
            IsoVfsFile.prototype.close = function () {
            };
            return IsoVfsFile;
        })(VfsEntry);

        var IsoVfs = (function (_super) {
            __extends(IsoVfs, _super);
            function IsoVfs(iso) {
                _super.call(this);
                this.iso = iso;
            }
            IsoVfs.prototype.open = function (path) {
                return new IsoVfsFile(this.iso.get(path));
            };
            return IsoVfs;
        })(Vfs);
        vfs.IsoVfs = IsoVfs;

        var MemoryVfsEntry = (function (_super) {
            __extends(MemoryVfsEntry, _super);
            function MemoryVfsEntry(data) {
                _super.call(this);
                this.data = data;
            }
            Object.defineProperty(MemoryVfsEntry.prototype, "isDirectory", {
                get: function () {
                    return false;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MemoryVfsEntry.prototype, "size", {
                get: function () {
                    return this.data.byteLength;
                },
                enumerable: true,
                configurable: true
            });
            MemoryVfsEntry.prototype.readChunkAsync = function (offset, length) {
                return Promise.resolve(this.data.slice(offset, offset + length));
            };
            MemoryVfsEntry.prototype.close = function () {
            };
            return MemoryVfsEntry;
        })(VfsEntry);
        vfs.MemoryVfsEntry = MemoryVfsEntry;

        var MemoryVfs = (function (_super) {
            __extends(MemoryVfs, _super);
            function MemoryVfs() {
                _super.apply(this, arguments);
                this.files = {};
            }
            MemoryVfs.prototype.addFile = function (name, data) {
                this.files[name] = data;
            };

            MemoryVfs.prototype.open = function (path) {
                var file = this.files[path];
                if (!file)
                    throw (new Error(sprintf("Can't find '%s'", path)));
                return new MemoryVfsEntry(file);
            };
            return MemoryVfs;
        })(Vfs);
        vfs.MemoryVfs = MemoryVfs;
    })(hle.vfs || (hle.vfs = {}));
    var vfs = hle.vfs;
})(hle || (hle = {}));
//# sourceMappingURL=vfs.js.map
