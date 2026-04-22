module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-transform-export-namespace-from',
    [require.resolve('react-native-dotenv'), {
      moduleName: '@env',
      path: '.env',
    }],
    'react-native-reanimated/plugin',
  ],
};
