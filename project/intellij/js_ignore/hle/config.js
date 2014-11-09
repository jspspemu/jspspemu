///<reference path="../global.d.ts" />
var _structs = require('./structs');
var PspLanguages = _structs.PspLanguages;
var ButtonPreference = _structs.ButtonPreference;
var Config = (function () {
    function Config() {
        this.language = 1 /* ENGLISH */;
        this.buttonPreference = 1 /* NA */;
        this.language = this.detectLanguage();
    }
    Config.prototype.detectLanguage = function () {
        switch (navigator.language.split(/[_\-]/g)[0]) {
            case 'ja':
                return 0 /* JAPANESE */;
            case 'en':
                return 1 /* ENGLISH */;
            case 'fr':
                return 2 /* FRENCH */;
            case 'es':
                return 3 /* SPANISH */;
            case 'de':
                return 4 /* GERMAN */;
            case 'it':
                return 5 /* ITALIAN */;
            case 'nl':
                return 6 /* DUTCH */;
            case 'pt':
                return 7 /* PORTUGUESE */;
            case 'ru':
                return 8 /* RUSSIAN */;
            case 'ko':
                return 9 /* KOREAN */;
            case 'zh':
                return 10 /* TRADITIONAL_CHINESE */;
            case 'zh2':
                return 11 /* SIMPLIFIED_CHINESE */;
            default:
                return 1 /* ENGLISH */;
        }
    };
    return Config;
})();
exports.Config = Config;
//# sourceMappingURL=config.js.map