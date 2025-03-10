const { withAndroidManifest } = require("@expo/config-plugins");

// This plugin adds tools:replace="android:appComponentFactory" to the application tag
const withAndroidXFix = (config) => {
  return withAndroidManifest(config, async (config) => {
    // Add the tools namespace to the manifest
    if (!config.modResults.manifest.$) {
      config.modResults.manifest.$ = {};
    }
    if (!config.modResults.manifest.$["xmlns:tools"]) {
      config.modResults.manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    // Add the tools:replace attribute to the application tag
    const application = config.modResults.manifest.application[0];
    if (!application.$) {
      application.$ = {};
    }
    application.$["tools:replace"] = "android:appComponentFactory";
    application.$["android:appComponentFactory"] = "androidx.core.app.CoreComponentFactory";

    return config;
  });
};

module.exports = (config) => {
  config = withAndroidXFix(config);
  return config;
};
