// import webpackPreprocessor from "@cypress/webpack-preprocessor";
import path from "path";
import webpackConfig from "../../webpack.config";
import webpack from "webpack";

const pluginConfig: Cypress.PluginConfig = (on, config) => {
  // const fn = webpackPreprocessor({ webpackOptions });

  // // TODO adjust types
  // // https://github.com/cypress-io/cypress/blob/cf9475dbed9ed098c2c04ee96c37aa8d2a370c79/npm/webpack-preprocessor/index.ts#L110
  // // https://github.com/cypress-io/cypress/blob/e57c13562dfadda2ed2d7e7709edac5dda0189d1/cli/types/cypress.d.ts#L5005
  // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // // @ts-ignore
  // on("file:preprocessor", fn);

  on("before:browser:launch", async (browser, launchOptions) => {
    const compiler = webpack(webpackConfig);
    // console.log("run?");
    // compiler.run((err, stats) => {
    //   // [Stats Object](#stats-object)
    //   // Print watch/build result here...
    //   console.log(stats);
    // });
    console.log("starting webpack watcher.. this may take a while");
    await new Promise((resolve, reject) => {
      const watching = compiler.watch(
        {
          // Example [watchOptions](/configuration/watch/#watchoptions)
          aggregateTimeout: 300,
          poll: undefined,
        },
        (err, stats) => {
          console.log(
            stats?.toString({
              chunks: false, // Makes the build much quieter
              colors: true, // Shows colors in the console
            })
          );

          if (!stats || stats?.hasErrors()) {
            reject();
          } else {
            resolve();
          }
        }
      );
    });

    console.log(path.join(__dirname, "../../dist"));
    launchOptions.extensions.push(path.join(__dirname, "../../dist"));

    return launchOptions;
  });

  return config;
};

export default pluginConfig;
