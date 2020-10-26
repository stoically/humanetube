import path from "path";
import webpack from "webpack";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyPlugin from "copy-webpack-plugin";

const config: webpack.Configuration = {
  entry: {
    background: "./src/background.ts",
    index: "./src/index.tsx",
  },
  devtool: false,
  mode: "production",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
          },
          {
            loader: "less-loader",
            options: {
              lessOptions: {
                javascriptEnabled: true,
              },
            },
          },
        ],
      },
    ],
  },
  optimization: {
    minimize: false,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    plugins: [new TsconfigPathsPlugin()],
    fallback: {
      stream: require.resolve("stream-browserify"),
      https: require.resolve("https-browserify"),
      http: require.resolve("stream-http"),
      url: require.resolve("url"),
      path: require.resolve("path-browserify"),
      crypto: require.resolve("crypto-browserify"),
      fs: false,
      perf_hooks: false,
      ws: false,
      worker_threads: false,
    },
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new webpack.ProvidePlugin({ Buffer: ["buffer", "Buffer"] }),
    new webpack.ProvidePlugin({ process: ["process"] }),
    new HtmlWebpackPlugin({
      template: "src/index.html",
      filename: "index.html",
      chunks: ["index"],
    }),
    new CopyPlugin({
      patterns: ["README.md", "LICENSE", "src/manifest.json"],
    }),
  ],
  devServer: {
    inline: false,
    writeToDisk: true,
  },
};

export default config;
