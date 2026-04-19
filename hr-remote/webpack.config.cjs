'use strict';

const path = require('path');
const webpack = require('webpack');
const { ModuleFederationPlugin } = webpack.container;

const port = Number(process.env.PORT || 3456);
const publicPath = process.env.RESAURCE_REMOTE_PUBLIC_PATH || `http://127.0.0.1:${port}/remote/`;

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/index.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    publicPath,
    clean: true,
  },
  resolve: { extensions: ['.jsx', '.js'] },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader', options: { presets: ['@babel/preset-react'] } },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    new ModuleFederationPlugin({
      name: 'resaurce_hr',
      filename: 'remoteEntry.js',
      exposes: {
        './HrChatApp': './src/HrChatApp.jsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
      },
    }),
  ],
  optimization: {
    runtimeChunk: false,
  },
};
