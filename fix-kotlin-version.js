const fs = require("fs");
const path = require("path");

// This script runs after prebuild to fix the Kotlin version
console.log("Fixing Kotlin version...");

// Path to the build.gradle file
const buildGradlePath = path.join(__dirname, "android", "build.gradle");

if (fs.existsSync(buildGradlePath)) {
  let buildGradleContent = fs.readFileSync(buildGradlePath, "utf8");

  // Replace the Kotlin version line
  buildGradleContent = buildGradleContent.replace(
    /kotlinVersion = findProperty\('android\.kotlinVersion'\) \?: '1\.9\.25'/,
    "kotlinVersion = '1.7.20' // Fixed version for compatibility"
  );

  fs.writeFileSync(buildGradlePath, buildGradleContent);
  console.log("Successfully updated Kotlin version to 1.7.20 in build.gradle");
} else {
  console.log("build.gradle not found. Make sure to run prebuild first.");
}
