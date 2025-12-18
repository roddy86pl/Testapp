const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration for PolFun Box Vega OS
 * https://facebook.github.io/metro/docs/configuration
 */
const config = {
  resolver: {
    // Dodaj rozszerzenia plików
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
