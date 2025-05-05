import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  ScrollView,
  SafeAreaView,
  Platform,
  PanResponder,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { Colors } from "../../constants/colours";
import { auth } from "../../config/firebaseConfig";
import { updateUserOnboardingStatus } from "../../services/userService";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 375;
const contentMaxWidth = Math.min(width * 0.9, 420);
const iconSize = Math.min(width * 0.15, 60);
const titleSize = isSmallDevice ? 24 : 28;
const basePadding = width * 0.035;
const contentPadding = Math.min(basePadding, 20);

interface JourneyIntroOverlayProps {
  visible: boolean;
  onClose: () => void;
}

const JourneyIntroOverlay: React.FC<JourneyIntroOverlayProps> = ({ visible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const MAX_STEPS = 5;
  const prevStepRef = useRef(currentStep);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentSlideAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(1)).current;
  const iconAnimValues = Array(4)
    .fill(0)
    .map(() => useRef(new Animated.Value(0)).current);

  const progressAnim = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Swipe left (next)
        if (gestureState.dx < -50 && currentStep < MAX_STEPS - 1) {
          if (Platform.OS === "ios") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          setCurrentStep(currentStep + 1);
        }
        // Swipe right (previous)
        else if (gestureState.dx > 50 && currentStep > 0) {
          if (Platform.OS === "ios") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          setCurrentStep(currentStep - 1);
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      StatusBar.setBarStyle("light-content");
      setCurrentStep(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start(() => {
        animateIcons();
      });

      animateProgress(0);
    } else {
      StatusBar.setBarStyle("default");
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && prevStepRef.current !== currentStep) {
      const slideDirection = currentStep > prevStepRef.current ? 1 : -1;

      Animated.timing(contentSlideAnim, {
        toValue: -slideDirection * width,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start(() => {
        iconAnimValues.forEach((val) => val.setValue(0));
        contentSlideAnim.setValue(slideDirection * width);

        Animated.parallel([
          Animated.timing(contentSlideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.2)),
          }),
          Animated.timing(contentScaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.2)),
          }),
        ]).start(() => {
          animateIcons();
        });
      });

      prevStepRef.current = currentStep;

      animateProgress(currentStep);
    }
  }, [currentStep, visible]);

  const animateProgress = (step: number) => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / MAX_STEPS,
      duration: 500,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.cubic),
    }).start();
  };

  const animateIcons = () => {
    iconAnimValues.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 350,
        delay: 150 + index * 80,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }).start();
    });
  };

  const handleClose = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(0);
      onClose();
    });
  };

  const handleNextStep = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (currentStep < MAX_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleStartJourney();
    }
  };

  // handle the start journey button press
  const handleStartJourney = () => {
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const userId = auth.currentUser?.uid;

    // update Firebase
    if (userId) {
      updateUserOnboardingStatus(userId, false)
        .then(() => {
          handleAnimatedClose();
        })
        .catch((error) => {
          console.error("Failed to update onboarding status:", error);
          handleAnimatedClose();
        });
    } else {
      handleAnimatedClose();
    }
  };

  const handleAnimatedClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(0);
      onClose();
    });
  };

  if (!visible) return null;

  // Get step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <View style={styles.welcomeContainer}>
              <Image source={require("../../assets/logo.png")} style={styles.logo} />
              <Text style={styles.welcomeTitle}>Welcome to Pathwise</Text>
              <Text style={styles.welcomeSubtitle}>Your Passport to Adventure</Text>
            </View>

            <Text style={styles.introDescription}>
              Embark on a journey of discovery through time and place. With Pathwise as your guide,
              the world around you becomes a canvas of stories waiting to be uncovered.
            </Text>

            <View style={styles.featureIcons}>
              {[
                { icon: "compass", text: "Discover" },
                { icon: "map", text: "Navigate" },
                { icon: "book", text: "Learn" },
                { icon: "trophy", text: "Achieve" },
              ].map((item, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.featureIconContainer,
                    {
                      opacity: iconAnimValues[index],
                      transform: [
                        {
                          scale: iconAnimValues[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.iconCircle}>
                    <Ionicons name={item.icon} size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.iconText}>{item.text}</Text>
                </Animated.View>
              ))}
            </View>
          </>
        );

      case 1:
        return (
          <>
            <View style={styles.stepHeader}>
              <FontAwesome5
                name="route"
                size={Math.min(iconSize * 0.8, 42)}
                color={Colors.primary}
              />
              <Text style={styles.stepTitle}>Uncover the Unexpected</Text>
            </View>

            <Text style={styles.stepDescription}>
              Pathwise guides you to both famous landmarks and hidden gems that most travelers miss.
              Our app transforms any city into a personalized adventure.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                { icon: "map-marker-radius", text: "Real-time landmark detection" },
                { icon: "compass-outline", text: "Proximity alerts for nearby points of interest" },
                { icon: "map-search", text: "Discover hidden locations off the beaten path" },
              ].map((item, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.featureItem,
                    {
                      opacity: iconAnimValues[index],
                      transform: [
                        {
                          translateX: iconAnimValues[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.featureItemContent}>
                    <MaterialCommunityIcons name={item.icon} size={22} color={Colors.primary} />
                    <Text style={styles.featureText}>{item.text}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </>
        );

      case 2:
        return (
          <>
            <View style={styles.stepHeader}>
              <Ionicons name="book" size={Math.min(iconSize * 0.8, 42)} color={Colors.primary} />
              <Text style={styles.stepTitle}>Stories Come Alive</Text>
            </View>

            <Text style={styles.stepDescription}>
              As you reach each destination, our AI creates personalized, educational content about
              what you're seeing. History becomes a conversation, not a lecture.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                { icon: "brain", text: "AI-generated historical insights" },
                {
                  icon: "book-open-page-variant",
                  text: "In depth content to keep you learning",
                },
                {
                  icon: "lightbulb-variant-outline",
                  text: "A personal guide to answer any questions",
                },
              ].map((item, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.featureItem,
                    {
                      opacity: iconAnimValues[index],
                      transform: [
                        {
                          translateX: iconAnimValues[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.featureItemContent}>
                    <MaterialCommunityIcons name={item.icon} size={22} color={Colors.primary} />
                    <Text style={styles.featureText}>{item.text}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </>
        );

      case 3:
        return (
          <>
            <View style={styles.stepHeader}>
              <MaterialCommunityIcons
                name="account-search"
                size={Math.min(iconSize * 0.8, 42)}
                color="#4F46E5"
              />
              <Text style={styles.stepTitle}>Learn & Analyze</Text>
            </View>

            <Text style={styles.stepDescription}>
              Our AI analyzes your travel patterns to provide personalized insights on what kind of
              traveler you are, and helps you learn more deeply about each location you visit.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                { icon: "chart-bar", text: "Personalized travel profile analytics" },
                { icon: "account-details", text: "Discover your unique traveler characteristics" },
                { icon: "lightbulb-on", text: "Deep-dive learning about visited locations" },
                { icon: "connection", text: "Connect with local cultures" },
              ].map((item, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.featureItem,
                    {
                      opacity: iconAnimValues[index],
                      transform: [
                        {
                          translateX: iconAnimValues[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.featureItemContent}>
                    <MaterialCommunityIcons name={item.icon} size={22} color="#4F46E5" />
                    <Text style={styles.featureText}>{item.text}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </>
        );

      case 4:
        return (
          <>
            <View style={styles.stepHeader}>
              <Ionicons name="trophy" size={Math.min(iconSize * 0.8, 42)} color={Colors.primary} />
              <Text style={styles.stepTitle}>Level Up Your Exploration</Text>
            </View>

            <Text style={styles.stepDescription}>
              Every place you visit earns you achievements and increases your explorer level.
            </Text>

            <View style={styles.finalFeatures}>
              {[
                {
                  icon: "star-circle",
                  title: "Achievements",
                  text: "Earn badges for exploration",
                  color: "#4A90E2",
                },
                {
                  icon: "medal",
                  title: "Discover",
                  text: "Find new places and history",
                  color: "#F5A623",
                },
                {
                  icon: "lock-open",
                  title: "Learn",
                  text: "AI content for each place",
                  color: "#50E3C2",
                },
                {
                  icon: "earth",
                  title: "Worldwide",
                  text: "Explore anywhere globally",
                  color: "#9C27B0",
                },
              ].map((item, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.finalFeatureItem,
                    {
                      opacity: iconAnimValues[index],
                      transform: [{ scale: iconAnimValues[index] }],
                    },
                  ]}
                >
                  <View style={[styles.finalIconCircle, { backgroundColor: item.color }]}>
                    <MaterialCommunityIcons name={item.icon} size={26} color="#FFFFFF" />
                  </View>
                  <Text style={styles.finalFeatureTitle}>{item.title}</Text>
                  <Text style={styles.finalFeatureText}>{item.text}</Text>
                </Animated.View>
              ))}
            </View>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <LinearGradient
        colors={["rgba(20,20,35,0.96)", "rgba(30,30,60,0.94)"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.contentCard} {...panResponder.panHandlers}>
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="rgba(0,0,0,0.4)" />
            </TouchableOpacity>

            <Animated.View
              style={{
                width: "100%",
                transform: [{ translateX: contentSlideAnim }, { scale: contentScaleAnim }],
              }}
            >
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              >
                {renderStepContent()}
              </ScrollView>
            </Animated.View>

            <View style={styles.navigationContainer}>
              <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.nextButton}
                activeOpacity={0.8}
                onPress={handleNextStep}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.nextButtonText}>
                    {currentStep === MAX_STEPS - 1 ? "Begin My Adventure" : "Continue"}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  gradient: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Math.max(width * 0.04, 16),
  },
  safeArea: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: contentMaxWidth,
    padding: contentPadding,
    alignItems: "center",
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 0,
    width: "100%",
    paddingHorizontal: 2,
    justifyContent: "flex-start",
  },

  welcomeContainer: {
    alignItems: "center",
    marginBottom: 12,
    paddingTop: 6,
  },
  welcomeTitle: {
    fontSize: titleSize,
    fontWeight: "800",
    color: "#333",
    marginTop: 10,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: isSmallDevice ? 15 : 17,
    fontWeight: "600",
    color: Colors.secondary,
    marginTop: 3,
    textAlign: "center",
  },
  introDescription: {
    fontSize: isSmallDevice ? 14 : 15,
    color: "#555",
    textAlign: "center",
    marginBottom: 14,
    lineHeight: isSmallDevice ? 20 : 22,
    paddingHorizontal: contentPadding * 0.4,
  },
  featureIcons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
    marginBottom: 0,
    flexWrap: "wrap",
  },
  featureIconContainer: {
    alignItems: "center",
    marginHorizontal: 6,
    marginBottom: 6,
  },
  iconCircle: {
    width: isSmallDevice ? 45 : 48,
    height: isSmallDevice ? 45 : 48,
    borderRadius: isSmallDevice ? 22.5 : 24,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  iconText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },

  stepHeader: {
    alignItems: "center",
    marginBottom: 12,
    marginTop: 5,
  },
  stepTitle: {
    fontSize: isSmallDevice ? 20 : 22,
    fontWeight: "700",
    color: "#333",
    marginTop: 6,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 21,
    paddingHorizontal: contentPadding * 0.4,
  },
  featureItemsContainer: {
    width: "100%",
    marginBottom: 0,
    paddingHorizontal: 2,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    backgroundColor: "rgba(245, 245, 250, 0.8)",
    padding: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    width: "100%",
    alignSelf: "center",
  },
  featureItemContent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  featureText: {
    fontSize: 14,
    color: "#444",
    marginLeft: 10,
    flex: 1,
    flexWrap: "wrap",
  },

  finalFeatures: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 0,
  },
  finalFeatureItem: {
    width: "48%",
    alignItems: "center",
    backgroundColor: "rgba(245, 245, 250, 0.8)",
    padding: 8,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 4,
  },
  finalIconCircle: {
    width: isSmallDevice ? 42 : 46,
    height: isSmallDevice ? 42 : 46,
    borderRadius: isSmallDevice ? 21 : 23,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  finalFeatureTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#444",
    marginBottom: 2,
  },
  finalFeatureText: {
    fontSize: isSmallDevice ? 11 : 12,
    color: "#666",
    textAlign: "center",
  },

  navigationContainer: {
    width: "100%",
    marginTop: 2,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  progressContainer: {
    width: "100%",
    marginBottom: 10,
  },
  progressBackground: {
    height: 3,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 1.5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
  },
  nextButton: {
    width: "100%",
    borderRadius: 15,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  logo: {
    width: 80,
    height: 80,
  },
});

export default JourneyIntroOverlay;
