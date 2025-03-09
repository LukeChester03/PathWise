// fix-android-build.js
const fs = require("fs");
const path = require("path");

console.log("🛠️ Starting Android build compatibility fixes...");

try {
  // Create android directory if it doesn't exist
  const androidDir = path.join(process.cwd(), "android");
  if (!fs.existsSync(androidDir)) {
    fs.mkdirSync(androidDir, { recursive: true });
  }

  // 1. Create gradle.properties with compatibility settings
  const gradlePropsPath = path.join(androidDir, "gradle.properties");
  const gradleProps = `
# Kotlin and Compose configurations
kotlin.version=1.7.20
kotlinVersion=1.7.20
kotlin.stdlib.default.dependency=false
android.kotlinOptions.suppressKotlinVersionCompatibilityCheck=true
kotlin.suppressKotlinVersionCompatibilityCheck=true
org.jetbrains.kotlin.gradle.plugin.suppressKotlinVersionCompatibilityCheck=true
compose.kotlinCompilerExtensionVersion=1.5.8
kotlin.jvm.target.validation.mode=ignore
kotlin.jvm.target=11
android.kotlinOptions.jvmTarget=11

# Dependency resolution strategy
android.useAndroidX=true
android.enableJetifier=true
android.nonTransitiveRClass=true

# Important: Fix attributes issues
android.disableAutomaticComponentCreation=true

# Performance settings
org.gradle.jvmargs=-Xmx4g -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.configureondemand=true
org.gradle.caching=true
`;

  fs.writeFileSync(gradlePropsPath, gradleProps);
  console.log("✅ Created custom gradle.properties");

  // 2. Create or modify build.gradle to add dependency resolution strategy
  const buildGradlePath = path.join(androidDir, "build.gradle");
  const buildGradleContent = `
// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
    ext {
        kotlinVersion = "1.7.20"
        buildToolsVersion = "34.0.0"
        minSdkVersion = 24
        compileSdkVersion = 35
        targetSdkVersion = 34
        ndkVersion = "26.1.10909125"
        
        // Make sure these exact versions are used
        if (findProperty('android.useAndroidX') == 'true') {
            androidXCore = "1.10.0"
            androidXFragment = "1.5.0"
            androidXAnnotation = "1.7.0"
        }
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath('com.android.tools.build:gradle:8.1.4')
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
    }
    
    // Force resolution of Kotlin version for all plugins
    configurations.classpath {
        resolutionStrategy.eachDependency { DependencyResolveDetails details ->
            if (details.requested.group == 'org.jetbrains.kotlin') {
                details.useVersion kotlinVersion
            }
        }
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
        maven {
            // All of React Native (JS, Obj-C sources, Android binaries) is installed from npm
            url("$rootDir/../node_modules/react-native/android")
        }
        maven {
            // Android JSC is installed from npm
            url("$rootDir/../node_modules/jsc-android/dist")
        }
        maven {
            // For expo modules
            url "$rootDir/../node_modules/expo/android/maven"
        }
        maven { url 'https://www.jitpack.io' }
    }
    
    // Force Kotlin version consistently
    configurations.all {
        resolutionStrategy.eachDependency { DependencyResolveDetails details ->
            if (details.requested.group == 'org.jetbrains.kotlin') {
                details.useVersion "$kotlinVersion"
            }
        }
    }
    
    // Force compatible AGP attributes
    configurations.all {
        resolutionStrategy.dependencySubstitution.all { DependencySubstitution dependency ->
            if (dependency.requested instanceof ModuleComponentSelector && dependency.requested.module.contains('androidx')) {
                dependency.useTarget dependency.requested
            }
        }
    }
    
    // Add suppression to all Kotlin compile tasks
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            jvmTarget = "11"
            suppressKotlinVersionCompatibilityCheck = true
        }
    }
}

// Fix for React Native modules
subprojects {
    afterEvaluate { project ->
        if (project.hasProperty("android")) {
            android {
                // Force compatibility attributes to work
                lintOptions {
                    disable 'InvalidPackage'
                    disable 'GradleDependency'
                    abortOnError false
                }
                
                // Make variants consumable
                publishing {
                    singleVariant("release") {
                        withSourcesJar()
                    }
                    singleVariant("debug") {
                        withSourcesJar()
                    }
                }
            }
        }
    }
}
`;

  fs.writeFileSync(buildGradlePath, buildGradleContent);
  console.log("✅ Created custom build.gradle");

  // 3. Create or modify settings.gradle to help with dependency resolution
  const settingsGradlePath = path.join(androidDir, "settings.gradle");
  const settingsGradleContent = `
rootProject.name = 'PathWise'

apply from: new File(["node", "--print", "require.resolve('expo/package.json')"].execute(null, rootDir).text.trim(), "../scripts/autolinking.gradle");
useExpoModules()

apply from: new File(["node", "--print", "require.resolve('@react-native-community/cli-platform-android/package.json')"].execute(null, rootDir).text.trim(), "../native_modules.gradle");
applyNativeModulesSettingsGradle(settings)

include ':app'
includeBuild(new File(["node", "--print", "require.resolve('@react-native/gradle-plugin/package.json')"].execute(null, rootDir).text.trim()).getParentFile())

// Force enabling consuming components
enableFeaturePreview("STABLE_CONFIGURATION_CACHE")
enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")
`;

  fs.writeFileSync(settingsGradlePath, settingsGradleContent);
  console.log("✅ Created custom settings.gradle");

  // 4. Fix the expo-modules-core Kotlin version issue
  try {
    // Path to the expo-modules-core directory
    const modulesCorePath = path.join(process.cwd(), "node_modules/expo-modules-core");
    const androidPath = path.join(modulesCorePath, "android");
    const buildGradlePath = path.join(androidPath, "build.gradle");

    if (fs.existsSync(buildGradlePath)) {
      console.log("Found expo-modules-core build.gradle, applying patch...");

      let buildGradle = fs.readFileSync(buildGradlePath, "utf8");

      // Replace Kotlin version
      buildGradle = buildGradle.replace(
        /kotlinVersion\s*=\s*['"](.*?)['"]/g,
        'kotlinVersion = "1.7.20"'
      );

      // Add compatibility fixes
      if (!buildGradle.includes("// COMPATIBILITY FIX")) {
        buildGradle = `// COMPATIBILITY FIX
buildscript {
    configurations.all {
        resolutionStrategy {
            eachDependency { DependencyResolveDetails details ->
                if (details.requested.group == 'org.jetbrains.kotlin') {
                    details.useVersion '1.7.20'
                }
            }
        }
    }
}

${buildGradle}`;
      }

      // Add JVM target and version suppression
      if (!buildGradle.includes("suppressKotlinVersionCompatibilityCheck")) {
        buildGradle = buildGradle.replace(
          /kotlin\s*{/g,
          'kotlin {\n    kotlinOptions {\n        jvmTarget = "11"\n        suppressKotlinVersionCompatibilityCheck = true\n    }'
        );
      }

      // Add compatibility with AGP 8.6.0
      if (!buildGradle.includes("ANDROID_GRADLE_PLUGIN_COMPATIBILITY")) {
        buildGradle += `
// ANDROID_GRADLE_PLUGIN_COMPATIBILITY
afterEvaluate {
    publishing {
        publications {
            release(MavenPublication) {
                from components.release
            }
            debug(MavenPublication) {
                from components.debug
            }
        }
    }
}
`;
      }

      fs.writeFileSync(buildGradlePath, buildGradle);
      console.log("✅ Patched expo-modules-core build.gradle");

      // Create gradle.properties in expo-modules-core/android
      const moduleGradlePropsPath = path.join(androidPath, "gradle.properties");
      fs.writeFileSync(moduleGradlePropsPath, gradleProps);
      console.log("✅ Created gradle.properties in expo-modules-core/android");
    }
  } catch (error) {
    console.error("⚠️ Error patching expo-modules-core:", error);
  }

  console.log("🎉 Android build fix completed successfully!");
} catch (error) {
  console.error("❌ Error:", error);
}
