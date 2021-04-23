const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const buildPath = path.resolve(__dirname, 'build');

const client = {
  entry: './src/client/client.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ['ts-loader'],
        exclude: /node_modules/
      },
    ],
  },
  plugins: [],
  optimization: {
    minimize: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'client.js',
    path: buildPath,
  },
};

const ui = {
  entry: './src/ui/ui.tsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ['ts-loader'],
        exclude: /node_modules/
      },
    ],
  },
  target: "web",
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/ui/static", to: buildPath },
      ],
    }),
  ],
  optimization: {
    minimize: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'ui.js',
    path: buildPath,
  },
};

module.exports = [client, ui];
