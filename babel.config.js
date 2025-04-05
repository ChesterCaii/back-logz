module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Temporarily remove react-native-dotenv plugin
      // ['module:react-native-dotenv', {
      //   "envName": "APP_ENV",
      //   "moduleName": "@env",
      //   "path": ".env",
      // }],
      // Note: expo-router plugin should be listed last.
      'expo-router/babel', 
    ]
  };
}; 