// app/screens/LandingScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Image, // Import this for handling taps outside the modal
} from "react-native";
import LoginComponent from "../components/Login"; // Import the LoginComponent
import RegisterModal from "../components/Register"; // Import the RegisterModal
import { Colors, NeutralColors } from "../constants/colours";

const LandingScreen = ({ navigation }: { navigation: any }) => {
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);

  // Toggle Login Modal
  const toggleLoginModal = () => {
    setIsLoginModalVisible(!isLoginModalVisible);
  };

  // Toggle Register Modal
  const toggleRegisterModal = () => {
    setIsRegisterModalVisible(!isRegisterModalVisible);
  };

  // Handle Login Success
  const handleLoginSuccess = () => {
    console.log("Login successful!");
    navigation.navigate("Home");
    toggleLoginModal();
  };

  // Handle Forgot Password Navigation
  const handleNavigateToForgotPassword = () => {
    console.log("Navigating to Forgot Password screen...");
  };

  // Handle Register Success
  const handleRegisterSuccess = () => {
    toggleRegisterModal();
    toggleLoginModal();
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
          <View style={styles.titleContainer}>
            {/* Logo */}
            <Image
              source={require("../assets/logo.png")}
              style={styles.logo} // Apply custom styles for the logo
            />
            {/* Pathwise Title */}
            <Text style={styles.title}>Pathwise</Text>
            {/* Pathwise Subtitle */}
            <Text style={styles.subTitle}>Discover the Past, Unlock the City</Text>
          </View>
          {/* Buttons Container */}
          <View style={styles.buttonsContainer}>
            {/* Register Button */}
            <TouchableOpacity
              style={[styles.button, styles.registerButton]}
              onPress={toggleRegisterModal}
            >
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

      {/* Register Modal */}
      <RegisterModal
        visible={isRegisterModalVisible}
        onRequestClose={toggleRegisterModal}
        onRegisterSuccess={handleRegisterSuccess}
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
  titleContainer: {
    alignItems: "center",
  },
  logo: {
    width: 80, // Set a fixed width for the logo
    height: 80, // Set a fixed height for the logo
    marginBottom: 10, // Add spacing between the logo and the title
    resizeMode: "contain", // Ensure the logo scales properly
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginTop: 0, // Remove the top margin since the logo is now above the title
  },
  subTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "left",
    marginBottom: 16,
    color: NeutralColors.white,
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
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
