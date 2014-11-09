(function (SeekAnchor) {
    SeekAnchor[SeekAnchor["Set"] = 0] = "Set";
    SeekAnchor[SeekAnchor["Cursor"] = 1] = "Cursor";
    SeekAnchor[SeekAnchor["End"] = 2] = "End";
})(exports.SeekAnchor || (exports.SeekAnchor = {}));
var SeekAnchor = exports.SeekAnchor;
(function (SceMode) {
})(exports.SceMode || (exports.SceMode = {}));
var SceMode = exports.SceMode;
(function (IOFileModes) {
    IOFileModes[IOFileModes["FormatMask"] = 0x0038] = "FormatMask";
    IOFileModes[IOFileModes["SymbolicLink"] = 0x0008] = "SymbolicLink";
    IOFileModes[IOFileModes["Directory"] = 0x0010] = "Directory";
    IOFileModes[IOFileModes["File"] = 0x0020] = "File";
    IOFileModes[IOFileModes["CanRead"] = 0x0004] = "CanRead";
    IOFileModes[IOFileModes["CanWrite"] = 0x0002] = "CanWrite";
    IOFileModes[IOFileModes["CanExecute"] = 0x0001] = "CanExecute";
})(exports.IOFileModes || (exports.IOFileModes = {}));
var IOFileModes = exports.IOFileModes;
var ScePspDateTime = (function () {
    function ScePspDateTime() {
        this.year = 0;
        this.month = 0;
        this.day = 0;
        this.hour = 0;
        this.minute = 0;
        this.second = 0;
        this.microseconds = 0;
    }
    ScePspDateTime.fromDate = function (date) {
        if (!date)
            date = new Date();
        var pspdate = new ScePspDateTime();
        pspdate.year = date.getFullYear();
        pspdate.month = date.getMonth();
        pspdate.day = date.getDay();
        pspdate.hour = date.getHours();
        pspdate.minute = date.getMinutes();
        pspdate.second = date.getSeconds();
        pspdate.microseconds = date.getMilliseconds() * 1000;
        return pspdate;
    };
    ScePspDateTime.fromTicks = function (ticks) {
        return ScePspDateTime.fromDate(new Date(ticks.getNumber()));
    };
    ScePspDateTime.prototype.getTotalMicroseconds = function () {
        return Integer64.fromNumber((Date.UTC(this.year + 1970, this.month - 1, this.day, this.hour, this.minute, this.second, this.microseconds / 1000) * 1000));
    };
    ScePspDateTime.struct = StructClass.create(ScePspDateTime, [
        { year: Int16 },
        { month: Int16 },
        { day: Int16 },
        { hour: Int16 },
        { minute: Int16 },
        { second: Int16 },
        { microsecond: Int32 },
    ]);
    return ScePspDateTime;
})();
exports.ScePspDateTime = ScePspDateTime;
var SceIoStat = (function () {
    function SceIoStat() {
        this.mode = 0;
        this.attributes = 32 /* File */;
        this.size = 0;
        this.timeCreation = new ScePspDateTime();
        this.timeLastAccess = new ScePspDateTime();
        this.timeLastModification = new ScePspDateTime();
        this.deviceDependentData = [0, 0, 0, 0, 0, 0];
    }
    SceIoStat.struct = StructClass.create(SceIoStat, [
        { mode: Int32 },
        { attributes: Int32 },
        { size: Int64 },
        { timeCreation: ScePspDateTime.struct },
        { timeLastAccess: ScePspDateTime.struct },
        { timeLastModification: ScePspDateTime.struct },
        { deviceDependentData: StructArray(Int32, 6) },
    ]);
    return SceIoStat;
})();
exports.SceIoStat = SceIoStat;
var HleIoDirent = (function () {
    function HleIoDirent() {
        this.stat = new SceIoStat();
        this.name = '';
        this.privateData = 0;
        this.dummy = 0;
    }
    HleIoDirent.struct = StructClass.create(HleIoDirent, [
        { stat: SceIoStat.struct },
        { name: Stringz(256) },
        { privateData: Int32 },
        { dummy: Int32 },
    ]);
    return HleIoDirent;
})();
exports.HleIoDirent = HleIoDirent;
(function (PspLanguages) {
    PspLanguages[PspLanguages["JAPANESE"] = 0] = "JAPANESE";
    PspLanguages[PspLanguages["ENGLISH"] = 1] = "ENGLISH";
    PspLanguages[PspLanguages["FRENCH"] = 2] = "FRENCH";
    PspLanguages[PspLanguages["SPANISH"] = 3] = "SPANISH";
    PspLanguages[PspLanguages["GERMAN"] = 4] = "GERMAN";
    PspLanguages[PspLanguages["ITALIAN"] = 5] = "ITALIAN";
    PspLanguages[PspLanguages["DUTCH"] = 6] = "DUTCH";
    PspLanguages[PspLanguages["PORTUGUESE"] = 7] = "PORTUGUESE";
    PspLanguages[PspLanguages["RUSSIAN"] = 8] = "RUSSIAN";
    PspLanguages[PspLanguages["KOREAN"] = 9] = "KOREAN";
    PspLanguages[PspLanguages["TRADITIONAL_CHINESE"] = 10] = "TRADITIONAL_CHINESE";
    PspLanguages[PspLanguages["SIMPLIFIED_CHINESE"] = 11] = "SIMPLIFIED_CHINESE";
})(exports.PspLanguages || (exports.PspLanguages = {}));
var PspLanguages = exports.PspLanguages;
(function (ButtonPreference) {
    ButtonPreference[ButtonPreference["JAP"] = 0] = "JAP";
    ButtonPreference[ButtonPreference["NA"] = 1] = "NA";
})(exports.ButtonPreference || (exports.ButtonPreference = {}));
var ButtonPreference = exports.ButtonPreference;
//# sourceMappingURL=structs.js.map