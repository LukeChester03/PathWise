import React from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";

const LandingScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Background Image */}
      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0", // Example city image (replace with your own image)
        }}
        style={styles.backgroundImage}
      >
        {/* Content Container */}
        <View style={styles.container}>
          {/* Pathwise Title */}
          <Text style={styles.title}>Pathwise</Text>

          {/* Buttons Container */}
          <View style={styles.buttonsContainer}>
            {/* Register Button */}
            <TouchableOpacity style={[styles.button, styles.registerButton]}>
              <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity style={[styles.button, styles.loginButton]}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default LandingScreen;

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    resizeMode: "cover", // Ensures the image covers the entire screen
    justifyContent: "space-between", // Aligns content between top and bottom
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginTop: 50,
  },
  buttonsContainer: {
    marginBottom: 50,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  registerButton: {
    backgroundColor: "#4CAF50", // Green for Register
  },
  loginButton: {
    backgroundColor: "#2196F3", // Blue for Login
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
});
