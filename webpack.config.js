const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'stylish.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: './dist/',
    libraryTarget: 'umd'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader' }
      }
    ]
  }
};