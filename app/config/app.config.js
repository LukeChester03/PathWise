module.exports = ({ config }) => {
  // Make sure the Google Maps API key is properly set
  if (config.android && config.android.config && config.android.config.googleMapsApiKey) {
    return config;
  }
  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android.config,
        googleMapsApiKey: "AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA",
      },
    },
  };
};
