module.exports = ({ config }) => {
  const newConfig = {
    ...config,
    android: {
      ...config.android,
      // Add manifest attributes to handle conflicts
      androidManifest: {
        ...config.android?.androidManifest,
        application: {
          "@tools:replace": "android:appComponentFactory",
        },
      },
    },
  };

  return newConfig;
};
