import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { Colors, NeutralColors } from "../../constants/colours";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 375;
const contentMaxWidth = Math.min(width * 0.9, 420);
const iconSize = Math.min(width * 0.15, 60);
const titleSize = isSmallDevice ? 24 : 28;
const basePadding = width * 0.035;
const contentPadding = Math.min(basePadding, 20);

interface GettingStartedModalProps {
  visible: boolean;
  onClose: () => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const GettingStartedModal: React.FC<GettingStartedModalProps> = ({ visible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const MAX_STEPS = 6;
  const prevStepRef = useRef(currentStep);

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
        if (gestureState.dx < -50 && currentStep < MAX_STEPS - 1) {
          if (Platform.OS === "ios") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          setCurrentStep(currentStep + 1);
        } else if (gestureState.dx > 50 && currentStep > 0) {
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
      handleClose();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <View style={styles.welcomeContainer}>
              <Ionicons name="bulb-outline" size={iconSize} color={Colors.primary} />
              <Text style={styles.welcomeTitle}>Getting Started</Text>
              <Text style={styles.welcomeSubtitle}>Your Guide to Places</Text>
            </View>

            <Text style={styles.introDescription}>
              Welcome to Places! Discover how to make the most of your experience with this brief
              introduction to our key features.
            </Text>

            <View style={styles.featureIcons}>
              {[
                { icon: "search-outline", text: "Discover" },
                { icon: "location-outline", text: "Explore" },
                { icon: "bookmark-outline", text: "Save" },
                { icon: "navigate-outline", text: "Visit" },
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
              <Ionicons
                name="search-outline"
                size={Math.min(iconSize * 0.8, 42)}
                color={Colors.primary}
              />
              <Text style={styles.stepTitle}>Discover Places</Text>
            </View>

            <Text style={styles.stepDescription}>
              Use the search bar to find interesting places around you or in a specific location.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                { icon: "magnify", text: "Search for specific destinations or attractions" },
                { icon: "filter-outline", text: "Filter results by category, rating, or distance" },
                { icon: "cards-outline", text: "View detailed information about each place" },
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
                    <Ionicons name={item.icon as IoniconsName} size={22} color={Colors.primary} />
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
              <Ionicons
                name="location-outline"
                size={Math.min(iconSize * 0.8, 42)}
                color="#4CAF50"
              />
              <Text style={styles.stepTitle}>Explore Nearby</Text>
            </View>

            <Text style={styles.stepDescription}>
              Browse through nearby attractions, landmarks, and hidden gems in your area.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                {
                  icon: "location",
                  text: "Discover interesting places near your current location",
                },
                {
                  icon: "compass",
                  text: "Explore recommended destinations based on your interests",
                },
                { icon: "star", text: "Find top-rated attractions and local favorites" },
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
                    <Ionicons name={item.icon as IoniconsName} size={22} color="#4CAF50" />
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
              <Ionicons
                name="bookmark-outline"
                size={Math.min(iconSize * 0.8, 42)}
                color="#FF9800"
              />
              <Text style={styles.stepTitle}>Save Favorites</Text>
            </View>

            <Text style={styles.stepDescription}>
              Save your favorite places for easy access later. Create your personal collection.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                { icon: "bookmark", text: "Save places with a single tap for future reference" },
                { icon: "list", text: "Organize saved places into custom collections" },
                { icon: "sync", text: "Access your saved places across all your devices" },
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
                    <Ionicons name={item.icon as IoniconsName} size={22} color="#FF9800" />
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
              <Ionicons
                name="navigate-outline"
                size={Math.min(iconSize * 0.8, 42)}
                color="#2196F3"
              />
              <Text style={styles.stepTitle}>Plan Your Visit</Text>
            </View>

            <Text style={styles.stepDescription}>
              Get directions, view opening hours, and read reviews before your visit.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                { icon: "navigate", text: "Get detailed directions to your destination" },
                { icon: "time", text: "Check operating hours and plan the best time to visit" },
                { icon: "chatbubbles", text: "Read reviews from other visitors" },
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
                    <Ionicons name={item.icon as IoniconsName} size={22} color="#2196F3" />
                    <Text style={styles.featureText}>{item.text}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </>
        );

      case 5:
        return (
          <>
            <View style={styles.stepHeader}>
              <Ionicons name="camera-outline" size={Math.min(iconSize * 0.8, 42)} color="#9C27B0" />
              <Text style={styles.stepTitle}>Capture Memories</Text>
            </View>

            <Text style={styles.stepDescription}>
              Take photos of the places you visit and share them with the community.
            </Text>

            <View style={styles.finalFeatures}>
              {[
                {
                  icon: "camera",
                  title: "Photos",
                  text: "Capture your experience",
                  color: "#9C27B0",
                },
                {
                  icon: "images",
                  title: "Gallery",
                  text: "Organize memories",
                  color: "#9C27B0",
                },
                {
                  icon: "share-social",
                  title: "Share",
                  text: "With friends & family",
                  color: "#9C27B0",
                },
                {
                  icon: "globe",
                  title: "Community",
                  text: "Join the conversation",
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
                    <Ionicons name={item.icon as IoniconsName} size={26} color="#FFFFFF" />
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
          display: visible ? "flex" : "none",
        },
      ]}
    >
      <LinearGradient
        colors={["rgba(20,20,35,0.96)", "rgba(30,30,60,0.94)"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.contentCard} {...panResponder.panHandlers}>
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
                  colors={[Colors.primary, Colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.nextButtonText}>
                    {currentStep === MAX_STEPS - 1 ? "Start Exploring" : "Continue"}
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
    color: Colors.primary,
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
});

export default GettingStartedModal;
