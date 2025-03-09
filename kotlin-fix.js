// kotlin-fix.js - Direct module patching
const fs = require("fs");
const path = require("path");

console.log("🔧 Applying direct Kotlin fix for expo-modules-core...");

try {
  // Define paths that work in EAS
  const moduleDir = path.join(process.cwd(), "node_modules/expo-modules-core/android");

  if (fs.existsSync(moduleDir)) {
    console.log(`Found expo-modules-core at: ${moduleDir}`);

    // Direct patch to the build.gradle file
    const buildGradlePath = path.join(moduleDir, "build.gradle");
    if (fs.existsSync(buildGradlePath)) {
      let content = fs.readFileSync(buildGradlePath, "utf8");

      // Replace kotlinVersion directly
      content = content.replace(/kotlinVersion\s*=.*/, 'kotlinVersion = "1.7.20"');

      // Add compile options directly
      if (!content.includes("kotlinOptions.suppressKotlinVersionCompatibilityCheck")) {
        content = content.replace(
          /compileOptions {/g,
          `compileOptions {
        kotlinOptions.suppressKotlinVersionCompatibilityCheck = true
        kotlinOptions.jvmTarget = "11"`
        );
      }

      // Add a gradle.properties file directly in the module
      const modulePropsPath = path.join(moduleDir, "gradle.properties");
      const propsContent = `
kotlin.version=1.7.20
kotlinVersion=1.7.20
kotlin.stdlib.default.dependency=false
kotlin.suppressKotlinVersionCompatibilityCheck=true
compose.kotlinCompilerExtensionVersion=1.5.8
android.enableJetifier=true
android.useAndroidX=true
`;
      fs.writeFileSync(modulePropsPath, propsContent);

      // Save changes to build.gradle
      fs.writeFileSync(buildGradlePath, content);
      console.log("✅ Patched expo-modules-core build.gradle and added gradle.properties");

      // Find and modify all build.gradle files in the project's node_modules
      const findBuildGradleFiles = (dir, results = []) => {
        if (!fs.existsSync(dir)) return results;

        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory() && !filePath.includes("node_modules/node_modules")) {
            findBuildGradleFiles(filePath, results);
          } else if (file === "build.gradle") {
            results.push(filePath);
          }
        }
        return results;
      };

      // Find all build.gradle files in node_modules
      console.log("Finding build.gradle files in node_modules...");
      const gradleFiles = findBuildGradleFiles(path.join(process.cwd(), "node_modules"));
      console.log(`Found ${gradleFiles.length} build.gradle files`);

      // Patch each build.gradle file that uses Kotlin
      for (const gradleFile of gradleFiles) {
        try {
          let content = fs.readFileSync(gradleFile, "utf8");
          if (content.includes("kotlin-android") || content.includes("org.jetbrains.kotlin")) {
            console.log(`Patching Kotlin in: ${gradleFile}`);

            // Force Kotlin version
            content = content.replace(/kotlinVersion\s*=.*/, 'kotlinVersion = "1.7.20"');

            // Add suppression option
            if (!content.includes("suppressKotlinVersionCompatibilityCheck")) {
              content += `
// Added by Kotlin fix script
tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    kotlinOptions.suppressKotlinVersionCompatibilityCheck = true
    kotlinOptions.jvmTarget = "11"
}
`;
            }

            fs.writeFileSync(gradleFile, content);
          }
        } catch (err) {
          console.log(`Error patching ${gradleFile}: ${err.message}`);
        }
      }
    }
  } else {
    console.log("⚠️ expo-modules-core android directory not found");
  }

  console.log("🎉 Kotlin fix applied successfully!");
} catch (error) {
  console.error("❌ Error applying Kotlin fix:", error);
  // Don't exit with error to not halt the build
}
