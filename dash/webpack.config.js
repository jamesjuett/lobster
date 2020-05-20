const path = require('path');

module.exports = {
  mode: 'development',
  entry: './dash/js/main.tsx',
  output: {
    path: path.join(__dirname, '/dash/static/js/'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        use: [
            {
                loader: "ts-loader"
            }
        ]
    },
    ],
  },
  externals: {
    "react": "React",
    "react-dom": "ReactDOM"
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', 'jsx'],
  },
};