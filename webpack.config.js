const path = require('path');

module.exports = {
  // mode: "development",
  entry: {
    main: './src/js/main.ts',
    // 'main.min': './src/js/main.ts',
    embedded_exercises: './src/js/embedded_exercises.ts',
    // 'exercises.min': './src/js/exercises.ts',
    regression: './src/js/test/regression.ts',
    // 'regression.min': './src/js/test/regression.ts'
  },
  output: {
    path: path.join(__dirname, '/public/js/'),
    filename: '[name].js',
    libraryTarget: 'umd',
    library: 'Lobster',
    umdNamedDefine: true,
  },
  optimization: {
    minimize: false,
  },
  devtool: 'source-map',
  // optimization: {
  //   minimizer: [
  //     new TerserPlugin({
  //       cache: true,
  //       parallel: true,
  //       sourceMap: true, // Must be set to true if using source-maps in production
  //       terserOptions: {
  //         // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
  //       },
  //       include: /\.min\.js$/,
  //     }),
  //   ]
  // },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};
