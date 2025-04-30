const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,
  resolver: {
    extraNodeModules: {
      idb: path.resolve(__dirname, "node_modules/idb"),
    },
  },
};
