const { merge } = require('webpack-merge');
const common = require('./webpack.config.js');

module.exports = merge(common, {
    //devtool: 'eval',
    devtool: 'eval',
    mode: 'production',
    optimization: {
        minimize: true
    },
});
