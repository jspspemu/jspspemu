var combine_common = require('./combine_common');

combine_common.compileProject(false, function() {
    combine_common.analyzeFolder(combine_common.JS_BASE_PATH);
    combine_common.updateSingleJsFile();
});
