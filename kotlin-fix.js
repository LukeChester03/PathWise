// kotlin-fix.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🔧 Applying direct Kotlin fix for expo-modules-core...");

try {
  // Path to the module with the compiler issue
  const moduleDir = path.join(__dirname, "node_modules/expo-modules-core/android");

  // Create a specific kotlin.properties file to force the version
  const propsContent = `kotlin.suppressVersionCompatibilityCheck=true
kotlin.stdlib.default.dependency=false
compose.kotlinCompilerExtensionVersion=1.5.8
kotlinVersion=1.7.20`;

  fs.writeFileSync(path.join(moduleDir, "kotlin.properties"), propsContent);
  console.log("✅ Created kotlin.properties in expo-modules-core");

  // Direct patch to the build.gradle file
  const buildGradlePath = path.join(moduleDir, "build.gradle");
  if (fs.existsSync(buildGradlePath)) {
    let content = fs.readFileSync(buildGradlePath, "utf8");

    // Apply a direct fix at the very beginning of the file
    if (!content.includes("// KOTLIN VERSION PATCH")) {
      const patch = `// KOTLIN VERSION PATCH
buildscript {
    configurations.all {
        resolutionStrategy.force 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.7.20'
    }
}

project.ext.set("kotlinVersion", "1.7.20")
project.ext.set("KOTLIN_VERSION", "1.7.20")

tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    kotlinOptions {
        suppressKotlinVersionCompatibilityCheck = true
        jvmTarget = "11"
    }
}

`;

      content = patch + content;
      fs.writeFileSync(buildGradlePath, content);
      console.log("✅ Patched build.gradle");

      // Create a replacement for the kotlin compiler plugin
      const kotlinDir = path.join(moduleDir, "kotlin");
      if (!fs.existsSync(kotlinDir)) {
        fs.mkdirSync(kotlinDir, { recursive: true });
      }

      // Write a minimal replacement for the kotlin compiler plugin
      const compilerPluginPath = path.join(kotlinDir, "compiler-plugin.gradle");
      const pluginContent = `
apply plugin: 'kotlin-android'

kotlin {
    kotlinOptions {
        jvmTarget = "11"
        suppressKotlinVersionCompatibilityCheck = true
    }
}
`;
      fs.writeFileSync(compilerPluginPath, pluginContent);
      console.log("✅ Created kotlin compiler plugin override");

      // Try to clean any cached Kotlin compiler data
      try {
        execSync("rm -rf ~/.gradle/caches/modules-2/files-2.1/org.jetbrains.kotlin");
        console.log("✅ Cleaned Kotlin cache");
      } catch (err) {
        console.log("⚠️ Could not clean Kotlin cache:", err.message);
      }
    }
  } else {
    console.log("⚠️ Could not find build.gradle file");
  }

  console.log("🎉 Kotlin fix applied successfully!");
} catch (error) {
  console.error("❌ Error applying Kotlin fix:", error);
  process.exit(1);
}
