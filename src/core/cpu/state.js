var core;
(function (core) {
    (function (cpu) {
        var CpuState = (function () {
            function CpuState(memory, syscallManager) {
                this.memory = memory;
                this.syscallManager = syscallManager;
                this.gpr = new Int32Array(32);
                this.fpr = new Float32Array(32);
                //fpr: Float64Array = new Float64Array(32);
                this.BRANCHFLAG = false;
                this.BRANCHPC = 0;
                this.PC = 0;
                this.LO = 0;
                this.HI = 0;
                this.IC = 0;
                this.thread = null;
                this.fcr31_rm = 0;
                this.fcr31_cc = false;
                this.fcr31_fs = false;
                this.fcr0_imp = 0;
                this.fcr0_rev = 0;
            }
            CpuState.getGprAccessName = function (index) {
                return 'gpr[' + index + ']';
            };
            CpuState.getFprAccessName = function (index) {
                return 'fpr[' + index + ']';
            };

            Object.defineProperty(CpuState.prototype, "V0", {
                get: function () {
                    return this.gpr[2];
                },
                set: function (value) {
                    this.gpr[2] = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CpuState.prototype, "V1", {
                get: function () {
                    return this.gpr[3];
                },
                set: function (value) {
                    this.gpr[3] = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CpuState.prototype, "K0", {
                get: function () {
                    return this.gpr[26];
                },
                set: function (value) {
                    this.gpr[26] = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CpuState.prototype, "GP", {
                get: function () {
                    return this.gpr[28];
                },
                set: function (value) {
                    this.gpr[28] = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CpuState.prototype, "SP", {
                get: function () {
                    return this.gpr[29];
                },
                set: function (value) {
                    this.gpr[29] = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CpuState.prototype, "FP", {
                get: function () {
                    return this.gpr[30];
                },
                set: function (value) {
                    this.gpr[30] = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CpuState.prototype, "RA", {
                get: function () {
                    return this.gpr[31];
                },
                set: function (value) {
                    this.gpr[31] = value;
                },
                enumerable: true,
                configurable: true
            });

            CpuState.prototype.getPointerStream = function (address) {
                return this.memory.getPointerStream(address);
            };

            Object.defineProperty(CpuState.prototype, "REGS", {
                get: function () {
                    return sprintf('r1: %08X, r2: %08X, r3: %08X, r3: %08X', this.gpr[1], this.gpr[2], this.gpr[3], this.gpr[4]);
                },
                enumerable: true,
                configurable: true
            });

            CpuState.prototype._trace_state = function () {
                console.info(this);
                throw ('_trace_state');
            };

            Object.defineProperty(CpuState.prototype, "fcr31", {
                get: function () {
                    var value = 0;
                    value = BitUtils.insert(value, 0, 2, this.fcr31_rm);
                    value = BitUtils.insert(value, 23, 1, this.fcr31_cc ? 1 : 0);
                    value = BitUtils.insert(value, 24, 1, this.fcr31_fs ? 1 : 0);
                    return value;
                },
                set: function (value) {
                    this.fcr31_rm = BitUtils.extract(value, 0, 2);
                    this.fcr31_cc = (BitUtils.extract(value, 23, 1) != 0);
                    this.fcr31_fs = (BitUtils.extract(value, 24, 1) != 0);
                },
                enumerable: true,
                configurable: true
            });


            Object.defineProperty(CpuState.prototype, "fcr0", {
                get: function () {
                    return (this.fcr0_imp << 8) | (this.fcr0_rev);
                },
                enumerable: true,
                configurable: true
            });

            CpuState.prototype._cfc1_impl = function (d, t) {
                switch (d) {
                    case 0:
                        this.gpr[t] = this.fcr0;
                        break;
                    case 31:
                        this.gpr[t] = this.fcr31;
                        break;
                    default:
                        throw (new Error(sprintf("Unsupported CFC1(%d)", d)));
                }
            };

            CpuState.prototype._ctc1_impl = function (d, t) {
                switch (d) {
                    case 31:
                        this.fcr31 = t;
                        break;
                    default:
                        throw (new Error(sprintf("Unsupported CFC1(%d)", d)));
                }
            };

            CpuState.prototype._comp_impl = function (s, t, fc_unordererd, fc_equal, fc_less, fc_inv_qnan) {
                if (isNaN(s) || isNaN(t)) {
                    this.fcr31_cc = fc_unordererd;
                } else {
                    //bool cc = false;
                    //if (fc_equal) cc = cc || (s == t);
                    //if (fc_less) cc = cc || (s < t);
                    //return cc;
                    var equal = (fc_equal) && (s == t);
                    var less = (fc_less) && (s < t);

                    this.fcr31_cc = (less || equal);
                }
            };

            CpuState.prototype._cvt_w_s_impl = function (FS) {
                switch (this.fcr31_rm) {
                    case 0:
                        return MathFloat.rint(FS);
                    case 1:
                        return MathFloat.cast(FS);
                    case 2:
                        return MathFloat.ceil(FS);
                    case 3:
                        return MathFloat.floor(FS);
                }

                throw ("RM has an invalid value!!");
            };

            CpuState.prototype.syscall = function (id) {
                this.syscallManager.call(this, id);
            };
            CpuState.prototype.dbreak = function () {
                throw (new CpuBreakException());
            };
            CpuState.prototype.sb = function (value, address) {
                this.memory.writeInt8(address, value);
            };
            CpuState.prototype.sh = function (value, address) {
                this.memory.writeInt16(address, value);
            };
            CpuState.prototype.sw = function (value, address) {
                this.memory.writeInt32(address, value);
            };
            CpuState.prototype.swc1 = function (value, address) {
                this.memory.writeFloat32(address, value);
            };
            CpuState.prototype.lwc1 = function (address) {
                var value = this.memory.readFloat32(address);

                //console.warn('lwc1: ' + value);
                return this.memory.readFloat32(address);
            };
            CpuState.prototype.lb = function (address) {
                return this.memory.readInt8(address);
            };
            CpuState.prototype.lbu = function (address) {
                return this.memory.readUInt8(address);
            };
            CpuState.prototype.lw = function (address) {
                return this.memory.readInt32(address);
            };
            CpuState.prototype.lh = function (address) {
                return this.memory.readInt16(address);
            };
            CpuState.prototype.lhu = function (address) {
                return this.memory.readUInt16(address);
            };
            CpuState.prototype.min = function (a, b) {
                return (a < b) ? a : b;
            };
            CpuState.prototype.max = function (a, b) {
                return (a > b) ? a : b;
            };
            CpuState.prototype.sltu = function (a, b) {
                return ((a >>> 0) < (b >>> 0));
            };

            CpuState.prototype.lwl = function (RS, Offset, RT) {
                var Address = (RS + Offset);
                var AddressAlign = Address & 3;
                var Value = this.memory.readInt32(Address & ~3);
                return ((Value << CpuState.LwlShift[AddressAlign]) | (RT & CpuState.LwlMask[AddressAlign]));
            };

            CpuState.prototype.lwr = function (RS, Offset, RT) {
                var Address = (RS + Offset);
                var AddressAlign = Address & 3;
                var Value = this.memory.readInt32(Address & ~3);
                return ((Value >>> CpuState.LwrShift[AddressAlign]) | (RT & CpuState.LwrMask[AddressAlign]));
            };

            CpuState.prototype.div = function (rs, rt) {
                this.LO = (rs / rt) | 0;
                this.HI = (rs % rt) | 0;
            };

            CpuState.prototype.divu = function (rs, rt) {
                rs >>>= 0; // unsigned
                rt >>>= 0; // unsigned
                this.LO = (rs / rt) | 0;
                this.HI = (rs % rt) | 0;
            };

            CpuState.prototype.mult = function (rs, rt) {
                //this.LO = (((rs >> 0) & 0xFFFF) * ((rt >> 0) & 0xFFFF)) | 0;
                //this.HI = (((rs >> 16) & 0xFFFF) * ((rt >> 16) & 0xFFFF)) | 0; // @TODO: carry!
                var result = rs * rt;
                this.LO = Math.floor(result % Math.pow(2, 32)) | 0;
                this.HI = Math.floor(result / Math.pow(2, 32)) | 0;
            };

            CpuState.prototype.multu = function (rs, rt) {
                var result = (rs >>> 0) * (rt >>> 0);
                this.LO = Math.floor(result % Math.pow(2, 32)) | 0;
                this.HI = Math.floor(result / Math.pow(2, 32)) | 0;
            };

            CpuState.prototype.madd = function (rs, rt) {
                var result = rs * rt;
                this.LO = (this.LO + Math.floor(result % Math.pow(2, 32))) | 0;
                this.HI = (this.HI + Math.floor(result / Math.pow(2, 32))) | 0;
            };

            CpuState.prototype.maddu = function (rs, rt) {
                var result = rs * rt;
                this.LO = (this.LO + Math.floor(result % Math.pow(2, 32))) | 0;
                this.HI = (this.HI + Math.floor(result / Math.pow(2, 32))) | 0;
            };

            CpuState.prototype.msub = function (rs, rt) {
                var result = rs * rt;
                this.LO = (this.LO - Math.floor(result % Math.pow(2, 32))) | 0;
                this.HI = (this.HI - Math.floor(result / Math.pow(2, 32))) | 0;
            };

            CpuState.prototype.msubu = function (rs, rt) {
                var result = rs * rt;
                this.LO = (this.LO - Math.floor(result % Math.pow(2, 32))) | 0;
                this.HI = (this.HI - Math.floor(result / Math.pow(2, 32))) | 0;
            };

            CpuState.prototype.break = function () {
                console.log('break!');
            };
            CpuState.LwrMask = [0x00000000, 0xFF000000, 0xFFFF0000, 0xFFFFFF00];
            CpuState.LwrShift = [0, 8, 16, 24];

            CpuState.LwlMask = [0x00FFFFFF, 0x0000FFFF, 0x000000FF, 0x00000000];
            CpuState.LwlShift = [24, 16, 8, 0];
            return CpuState;
        })();
        cpu.CpuState = CpuState;
    })(core.cpu || (core.cpu = {}));
    var cpu = core.cpu;
})(core || (core = {}));
//# sourceMappingURL=state.js.map
