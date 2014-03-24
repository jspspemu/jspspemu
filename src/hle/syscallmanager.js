var hle;
(function (hle) {
    var SyscallManager = (function () {
        function SyscallManager(context) {
            this.context = context;
            this.calls = {};
            this.lastId = 1;
        }
        SyscallManager.prototype.register = function (nativeFunction) {
            return this.registerWithId(this.lastId++, nativeFunction);
        };

        SyscallManager.prototype.registerWithId = function (id, nativeFunction) {
            this.calls[id] = nativeFunction;
            return id;
        };

        SyscallManager.prototype.call = function (state, id) {
            var nativeFunction = this.calls[id];
            if (!nativeFunction)
                throw (sprintf("Can't call syscall %s: 0x%06X", id));

            //printf('calling syscall 0x%04X : %s', id, info.name);
            nativeFunction.call(this.context, state);
        };
        return SyscallManager;
    })();
    hle.SyscallManager = SyscallManager;
})(hle || (hle = {}));
//# sourceMappingURL=syscallmanager.js.map
