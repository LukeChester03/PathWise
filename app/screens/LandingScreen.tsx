// app/screens/LandingScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import LoginComponent from "../components/LandingPage/Login";
import RegisterModal from "../components/LandingPage/Register";
import { Colors, NeutralColors } from "../constants/colours";

const { width, height } = Dimensions.get("window");

const LandingScreen = ({ navigation }: { navigation: any }) => {
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleLoginModal = () => {
    setIsLoginModalVisible(!isLoginModalVisible);
  };

  const toggleRegisterModal = () => {
    setIsRegisterModalVisible(!isRegisterModalVisible);
  };

  const handleLoginSuccess = () => {
    navigation.navigate("Home");
    toggleLoginModal();
  };

  const handleNavigateToForgotPassword = () => {
    console.log("Navigating to Forgot Password screen...");
  };

  const handleRegisterSuccess = () => {
    toggleRegisterModal();
    toggleLoginModal();
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />

      {/* Background Image with Overlay */}
      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1513026705753-bc3fffca8bf4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        }}
        style={styles.backgroundImage}
      >
        <View style={styles.overlay} />

        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Logo and Title Section */}
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.logoContainer}>
              <Image source={require("../assets/logo.png")} style={styles.logo} />
            </View>
            <Text style={styles.title}>Pathwise</Text>
            <Text style={styles.tagline}>Discover the Past, Unlock the City</Text>
          </Animated.View>

          {/* Buttons Container */}
          <Animated.View style={[styles.buttonsContainer, { opacity: fadeAnim }]}>
            <View style={styles.cardContainer}>
              <TouchableOpacity
                style={styles.getStartedButton}
                onPress={toggleRegisterModal}
                activeOpacity={0.8}
              >
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <Text style={styles.accountText}>Already have an account?</Text>
                <TouchableOpacity onPress={toggleLoginModal}>
                  <Text style={styles.loginText}>Log in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </ImageBackground>

      <LoginComponent
        visible={isLoginModalVisible}
        onRequestClose={toggleLoginModal}
        onLoginSuccess={handleLoginSuccess}
        onNavigateToForgotPassword={handleNavigateToForgotPassword}
      />

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
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: width,
    height: height * 1.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  contentContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "flex-end", // Push buttons to the bottom
  },
  headerContainer: {
    alignItems: "center",
    marginTop: height * 0.15, // Keep header near the top
    marginBottom: "auto", // Push it away from buttons
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(247, 247, 247, 0.21)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  logo: {
    width: 96,
    height: 96,
    resizeMode: "contain",
  },
  title: {
    fontSize: 42,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 12,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "500",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 0.5,
    opacity: 0.9,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonsContainer: {
    alignItems: "center",
  },
  cardContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 24,
    backdropFilter: "blur(10px)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  getStartedButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 20,
  },
  getStartedButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  accountText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginRight: 6,
  },
  loginText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
