// app/screens/LandingScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import LoginComponent from "../components/LandingPage/Login";
import RegisterModal from "../components/LandingPage/Register";
import { Colors, NeutralColors } from "../constants/colours";

const { width, height } = Dimensions.get("window");

const LandingScreen = ({ navigation }: { navigation: any }) => {
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Animation values for content
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  // Animation values for floating circles
  const circle1Anim = useRef(new Animated.Value(0)).current;
  const circle2Anim = useRef(new Animated.Value(0)).current;
  const circle3Anim = useRef(new Animated.Value(0)).current;

  // Carousel data
  const carouselData = [
    {
      title: "Discover hidden gems",
      icon: "compass-outline",
    },
    {
      title: "Track your journey",
      icon: "map-outline",
    },
    {
      title: "Earn achievements",
      icon: "trophy-outline",
    },
    { title: "Learn with AI", icon: "analytics-outline" },
  ];

  // Animate the background circles
  const animateBackgroundCircles = () => {
    // Circle 1 animation - slow floating movement
    Animated.loop(
      Animated.sequence([
        Animated.timing(circle1Anim, {
          toValue: 1,
          duration: 15000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(circle1Anim, {
          toValue: 0,
          duration: 15000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Circle 2 animation - different direction and timing
    Animated.loop(
      Animated.sequence([
        Animated.timing(circle2Anim, {
          toValue: 1,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(circle2Anim, {
          toValue: 0,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Circle 3 animation - third pattern
    Animated.loop(
      Animated.sequence([
        Animated.timing(circle3Anim, {
          toValue: 1,
          duration: 12000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(circle3Anim, {
          toValue: 0,
          duration: 12000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Setup animations
  useEffect(() => {
    // Staggered entry animations for content
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(buttonsAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Start background circle animations
    animateBackgroundCircles();

    // Auto scroll the carousel
    const carouselInterval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % carouselData.length);
    }, 3000);

    return () => clearInterval(carouselInterval);
  }, []);

  // Circle movement interpolations
  const circle1TranslateX = circle1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.05],
  });

  const circle1TranslateY = circle1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height * 0.05],
  });

  const circle2TranslateX = circle2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width * 0.08],
  });

  const circle2TranslateY = circle2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height * 0.08],
  });

  const circle3TranslateX = circle3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.1],
  });

  const circle3TranslateY = circle3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.06],
  });

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
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Enhanced Background with more Primary Color */}
      <LinearGradient
        colors={[
          "#1a1a2e",
          "#16213e",
          Colors.primary + "25", // Increased primary color presence
        ]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Animated Circles in Background */}
      <View style={styles.backgroundElements}>
        <Animated.View
          style={[
            styles.circle1,
            {
              transform: [{ translateX: circle1TranslateX }, { translateY: circle1TranslateY }],
            },
          ]}
        >
          <LinearGradient
            colors={[Colors.primary + "20", Colors.primary + "10"]}
            style={styles.circleGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.circle2,
            {
              transform: [{ translateX: circle2TranslateX }, { translateY: circle2TranslateY }],
            },
          ]}
        >
          <LinearGradient
            colors={[Colors.primary + "15", Colors.primary + "05"]}
            style={styles.circleGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.circle3,
            {
              transform: [{ translateX: circle3TranslateX }, { translateY: circle3TranslateY }],
            },
          ]}
        >
          <LinearGradient
            colors={[Colors.primary + "20", Colors.primary + "08"]}
            style={styles.circleGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      </View>

      {/* Main Content Container */}
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
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]}
              style={styles.logoGradient}
            >
              <Image source={require("../assets/logo.png")} style={styles.logo} />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Pathwise</Text>
          <Text style={styles.tagline}>Discover the Past, Unlock the City</Text>
        </Animated.View>

        {/* Feature Carousel */}
        <View style={styles.carouselContainer}>
          {carouselData.map((item, index) => (
            <Animated.View
              key={index}
              style={[
                styles.carouselItem,
                {
                  opacity: activeIndex === index ? 1 : 0,
                  transform: [
                    {
                      translateY: activeIndex === index ? 0 : 20,
                    },
                  ],
                  position: "absolute",
                },
              ]}
            >
              <View style={styles.featureContent}>
                <View style={styles.iconWrapper}>
                  <Ionicons name={item.icon} size={24} color="#fff" style={styles.featureIcon} />
                </View>
                <Text style={styles.featureTitle}>{item.title}</Text>
              </View>
            </Animated.View>
          ))}

          {/* Indicator dots */}
          <View style={styles.indicatorContainer}>
            {carouselData.map((_, index) => (
              <View
                key={index}
                style={[styles.indicator, index === activeIndex ? styles.indicatorActive : null]}
              />
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionContainer,
            {
              opacity: buttonsAnim,
              transform: [
                {
                  translateY: buttonsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={toggleRegisterModal}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primary + "E0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.getStartedButtonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={toggleLoginModal}
            activeOpacity={0.7}
          >
            <Text style={styles.loginText}>Log in</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

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
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundElements: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  circleGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
  },
  circle1: {
    position: "absolute",
    width: height * 0.4,
    height: height * 0.4,
    borderRadius: height * 0.2,
    top: -height * 0.1,
    right: -width * 0.1,
    overflow: "hidden",
  },
  circle2: {
    position: "absolute",
    width: height * 0.5,
    height: height * 0.5,
    borderRadius: height * 0.25,
    bottom: -height * 0.2,
    left: -width * 0.15,
    overflow: "hidden",
  },
  circle3: {
    position: "absolute",
    width: height * 0.25,
    height: height * 0.25,
    borderRadius: height * 0.125,
    top: height * 0.35,
    right: -width * 0.05,
    overflow: "hidden",
  },
  contentContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
    paddingTop: height * 0.12,
    paddingBottom: height * 0.08,
  },
  headerContainer: {
    alignItems: "center",
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  logoGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 45,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  carouselContainer: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  carouselItem: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  featureContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  featureIcon: {
    marginRight: 0,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#fff",
    textTransform: "lowercase",
  },
  indicatorContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: Colors.primary,
    width: 18,
  },
  actionContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 40,
  },
  getStartedButton: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  getStartedButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.3,
  },
  loginButton: {
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.primary + "50",
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  loginText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
});
