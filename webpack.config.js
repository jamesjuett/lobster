const path = require('path');
const CircularDependencyPlugin = require('circular-dependency-plugin')

module.exports = {
  // mode: "development",
  entry: {
    main: './src/js/main.ts'
  },
  devtool: "source-map",
  output: {
    path: path.join(__dirname, '/public/lobster/js/'),
    filename: '[name].bundle.js',
    libraryTarget: 'var',
    library: 'Bundle'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ]
  },
  // plugins: [
  //   new CircularDependencyPlugin({
  //     // exclude detection of files based on a RegExp
  //     exclude: /a\.js|node_modules/,
  //     // add errors to webpack instead of warnings
  //     failOnError: true,
  //     // allow import cycles that include an asyncronous import,
  //     // e.g. via import(/* webpackMode: "weak" */ './file.js')
  //     allowAsyncCycles: false,
  //     // set the current working directory for displaying module paths
  //     cwd: process.cwd(),
  //   })
  // ]
};