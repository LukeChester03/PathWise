// app/screens/LandingScreen.tsx
import React, { useState } from "react";
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet } from "react-native";
import LoginComponent from "../components/Login"; // Import the LoginComponent
import { Colors, NeutralColors } from "../constants/colours";

const LandingScreen = ({ navigation }: { navigation: any }) => {
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);

  const toggleLoginModal = () => {
    setIsLoginModalVisible(!isLoginModalVisible);
  };

  const handleLoginSuccess = () => {
    // Handle login success (e.g., navigate to Home screen)
    console.log("Login successful!");
    navigation.navigate("Home");
    toggleLoginModal();
  };

  const handleNavigateToForgotPassword = () => {
    // Navigate to Forgot Password screen
    console.log("Navigating to Forgot Password screen...");
  };

  return (
    <View style={styles.safeArea}>
      {/* Background Image */}
      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1513026705753-bc3fffca8bf4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Example city image
        }}
        style={styles.backgroundImage}
      >
        {/* Content Container */}
        <View style={styles.container}>
          {/* Pathwise Title */}
          <Text style={styles.title}>Pathwise</Text>
          {/* Pathwise Subtitle */}
          <Text style={styles.subTitle}>Discover the Past, Unlock the City</Text>

          {/* Buttons Container */}
          <View style={styles.buttonsContainer}>
            {/* Register Button */}
            <TouchableOpacity style={[styles.button, styles.registerButton]}>
              <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.button, styles.loginButton]}
              onPress={toggleLoginModal}
            >
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* Login Modal */}
      <LoginComponent
        visible={isLoginModalVisible}
        onRequestClose={toggleLoginModal}
        onLoginSuccess={handleLoginSuccess}
        onNavigateToForgotPassword={handleNavigateToForgotPassword}
      />
    </View>
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
    resizeMode: "cover",
    justifyContent: "space-between",
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
    backgroundColor: Colors.primary,
  },
  loginButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  subTitle: {
    fontSize: 20,

    fontWeight: "bold",
    textAlign: "left",
    marginBottom: 16,
    color: NeutralColors.white,
  },
});
