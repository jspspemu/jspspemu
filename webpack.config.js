const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
//const isProduction = process.env.NODE_ENV === 'production'
//console.warn(process.env)
//console.warn("isProduction", isProduction, process.env.NODE_ENV)

module.exports = {
    entry: './src/app.ts',
    devtool: 'inline-source-map',
    mode: 'development',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            //transpileOnly: true,
                            //happyPackMode: true
                        },
                    },
                ],
                exclude: /node_modules/,
            },
        ],
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: true,
        port: 9000,
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'jspspemu.js',
        path: path.resolve(__dirname, 'dist'),
    },
    optimization: {
        minimize: false
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'jspspemu',
        }),
        new CopyPlugin({
            patterns: [
                { from: "test.html", to: "." },
            ],
        }),
    ],
};