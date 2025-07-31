// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "src")];
config.resolver.extraNodeModules = {
  "@super-admin": path.resolve(__dirname, "src/super-admin"),
  "@company": path.resolve(__dirname, "src/company"),
  "@config": path.resolve(__dirname, "config"),
};
module.exports = config;
