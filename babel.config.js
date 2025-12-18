module.exports = api => {
  const babelEnv = api.env();

  // plugins common for all environment
  const plugins = [
    [
      '@babel/plugin-transform-react-jsx',
      {
        runtime: 'automatic',
      },
    ],
    '@amazon-devices/react-native-reanimated/plugin',
  ];

  // plugins pushed only for "production" env
  if (babelEnv === 'production') {
    // Remove console logs in production except errors and warnings
    plugins.push([
      'transform-remove-console',
      { exclude: ['error', 'warn'] },
    ]);
  }

  const presets = [
    [
      'module:metro-react-native-babel-preset',
      { useTransformReactJSXExperimental: true },
    ],
  ];

  return {
    presets,
    plugins,
  };
};
