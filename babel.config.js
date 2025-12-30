module.exports = function (api) {
  api.cache(true);
  let plugins = [];
  // Removed react-native-worklets plugin (not used)
  
  // Add react-native-dotenv untuk load environment variables dari .env
  plugins.push([
    'module:react-native-dotenv',
    {
      moduleName: '@env',
      path: '.env',
      safe: false,
      allowUndefined: false,
    },
  ]);

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],

    plugins,
  };
};
