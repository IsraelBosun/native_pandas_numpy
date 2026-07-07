const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web backend (wa-sqlite) ships a .wasm binary that Metro
// needs to treat as an asset, not a source file to transform.
config.resolver.assetExts.push('wasm');

module.exports = config;
