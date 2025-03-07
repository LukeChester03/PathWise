// app.config.js
module.exports = ({ config }) => {
  // Get the existing config
  const existingConfig = { ...config };

  return {
    ...existingConfig,
    // Add hooks for the Android build process
    hooks: {
      ...(existingConfig.hooks || {}),
      postPublish: [...(existingConfig.hooks?.postPublish || [])],
      // This will run before the Android build starts
      prebuild: async () => {
        console.log("⚙️ Running prebuild hook to fix Kotlin compatibility issue");
        // This hook runs before the Android project is generated
      },
    },
    // Add Android-specific configuration
    android: {
      ...(existingConfig.android || {}),
      // These properties will be added to gradle.properties
      // This is the key fix for the Kotlin version compatibility issue
      gradleProperties: {
        ...(existingConfig.android?.gradleProperties || {}),
        "android.suppressKotlinVersionCompatibilityCheck": "true",
        "kotlin.incremental": "false",
      },
    },
    // Add build-specific environment variables
    extra: {
      ...(existingConfig.extra || {}),
      eas: {
        ...(existingConfig.extra?.eas || {}),
        // Configure EAS Build
        build: {
          ...(existingConfig.extra?.eas?.build || {}),
          experimental: {
            ...(existingConfig.extra?.eas?.build?.experimental || {}),
            // Additional Android configuration for EAS
            android: {
              ...(existingConfig.extra?.eas?.build?.experimental?.android || {}),
              gradleProperties: {
                ...(existingConfig.extra?.eas?.build?.experimental?.android?.gradleProperties ||
                  {}),
                "android.suppressKotlinVersionCompatibilityCheck": "true",
                "kotlin.incremental": "false",
                "org.gradle.jvmargs": "-Xmx2048m -XX:MaxMetaspaceSize=512m",
              },
            },
          },
        },
      },
    },
  };
};
