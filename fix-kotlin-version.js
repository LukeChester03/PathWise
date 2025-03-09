// fix-kotlin-version.js
const fs = require("fs");
const path = require("path");

console.log("Running custom Kotlin compatibility fix script...");

// Force suppress Kotlin version compatibility check in all relevant modules
function fixKotlinVersionInBuildFiles() {
  try {
    // Create android/gradle.properties if it doesn't exist
    const rootGradleProps = path.join("android", "gradle.properties");
    let propsContent = "";

    if (fs.existsSync(rootGradleProps)) {
      propsContent = fs.readFileSync(rootGradleProps, "utf8");
    }

    // Add Kotlin version and suppression flag if needed
    if (!propsContent.includes("kotlin.version=1.7.20")) {
      const additionalProps = `
# Added by fix script
kotlin.version=1.7.20
kotlinVersion=1.7.20
kotlin.stdlib.default.dependency=false
kotlin.suppressKotlinVersionCompatibilityCheck=true
org.jetbrains.kotlin.gradle.plugin.suppressKotlinVersionCompatibilityCheck=true
android.kotlinOptions.suppressKotlinVersionCompatibilityCheck=true
compose.kotlinCompilerExtensionVersion=1.5.8
      `;

      fs.writeFileSync(rootGradleProps, propsContent + additionalProps);
      console.log("Updated gradle.properties with Kotlin suppression flags");
    }

    // Find and create a hook for expo-modules-core if it exists in the node_modules
    const modulesCorePath = path.join(
      "node_modules",
      "expo-modules-core",
      "android",
      "build.gradle"
    );
    if (fs.existsSync(modulesCorePath)) {
      const moduleContent = fs.readFileSync(modulesCorePath, "utf8");

      // Add Kotlin compatibility suppression directly to expo-modules-core
      if (!moduleContent.includes("suppressKotlinVersionCompatibilityCheck")) {
        const modifiedContent = moduleContent.replace(
          /kotlin\s*{/,
          "kotlin {\n        kotlinOptions.suppressKotlinVersionCompatibilityCheck = true"
        );

        fs.writeFileSync(modulesCorePath, modifiedContent);
        console.log("Added suppressKotlinVersionCompatibilityCheck to expo-modules-core");
      }
    }

    console.log("Kotlin version fix completed successfully");
  } catch (error) {
    console.error("Error applying Kotlin fix:", error);
  }
}

fixKotlinVersionInBuildFiles();
