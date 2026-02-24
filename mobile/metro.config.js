const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration that works with both Expo and React Native CLI
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */

// Get the default Expo config
const defaultConfig = getDefaultConfig(__dirname);

// Custom configuration
const config = {
  resolver: {
    alias: {
      '@': './src',
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);