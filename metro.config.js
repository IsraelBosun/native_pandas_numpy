const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web backend (wa-sqlite) ships a .wasm binary that Metro
// needs to treat as an asset, not a source file to transform.
config.resolver.assetExts.push('wasm');

// Metro defaults to one bundler worker per logical core — 17 Node processes
// on this machine, which exhausts Windows' memory commit limit and kills
// bundling with "Zone Allocation failed". Two workers fit comfortably.
config.maxWorkers = 2;

module.exports = config;
