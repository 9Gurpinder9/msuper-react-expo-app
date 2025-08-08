// metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// if you still need to watch your src folder for symlinked libs:
config.watchFolders = [path.resolve(projectRoot, "src")];

// ensure your TS path-aliases work at bundle time:
config.resolver.extraNodeModules = {
  "@super-admin": path.resolve(projectRoot, "src/super-admin"),
  "@config": path.resolve(projectRoot, "config"),
  "@theme": path.resolve(projectRoot, "src/theme"),
  "@utils": path.resolve(projectRoot, "src/utils"),
};

module.exports = config;
