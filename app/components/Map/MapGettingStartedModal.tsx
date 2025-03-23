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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, NeutralColors } from "../../constants/colours";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");
// Calculate responsive dimensions based on screen size
const isSmallDevice = width < 375;
const contentMaxWidth = Math.min(width * 0.9, 420);
const iconSize = Math.min(width * 0.15, 60);
const titleSize = isSmallDevice ? 24 : 28;
const basePadding = width * 0.035;
const contentPadding = Math.min(basePadding, 20);

// Define prop interface for the component
interface MapGettingStartedModalProps {
  visible: boolean;
  onClose: () => void;
}

// Specify icon name type for more precise typing
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const MapGettingStartedModal: React.FC<MapGettingStartedModalProps> = ({ visible, onClose }) => {
  // State to track which intro screen to show
  const [currentStep, setCurrentStep] = useState(0);
  const MAX_STEPS = 4; // Total number of steps
  const prevStepRef = useRef(currentStep);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentSlideAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(1)).current;
  const iconAnimValues = Array(4)
    .fill(0)
    .map(() => useRef(new Animated.Value(0)).current);

  // Progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Set up pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20; // Only respond to horizontal gestures
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

  // Animate when visibility changes
  useEffect(() => {
    if (visible) {
      StatusBar.setBarStyle("light-content");
      // Only fade in the overlay container
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start(() => {
        // Animate the icons in sequence for initial step
        animateIcons();
      });

      // Start progress animation
      animateProgress(0);
    } else {
      StatusBar.setBarStyle("default");
      // Fade out the entire overlay
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Effect to handle step changes
  useEffect(() => {
    if (visible && prevStepRef.current !== currentStep) {
      // Determine slide direction based on step change
      const slideDirection = currentStep > prevStepRef.current ? 1 : -1;

      // First, slide current content out
      Animated.timing(contentSlideAnim, {
        toValue: -slideDirection * width,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start(() => {
        // Reset animations for new slide
        iconAnimValues.forEach((val) => val.setValue(0));
        contentSlideAnim.setValue(slideDirection * width);

        // Then slide new content in
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
          // Animate icons for this step
          animateIcons();
        });
      });

      prevStepRef.current = currentStep;

      // Update progress bar
      animateProgress(currentStep);
    }
  }, [currentStep, visible]);

  // Animate progress bar
  const animateProgress = (step: number) => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / MAX_STEPS,
      duration: 500,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.cubic),
    }).start();
  };

  // Function to animate icons in sequence
  const animateIcons = () => {
    iconAnimValues.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 350,
        delay: 150 + index * 80, // Faster animation sequence
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }).start();
    });
  };

  // Close overlay handler
  const handleClose = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Just fade out the overlay
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Reset to first step before closing
      setCurrentStep(0);
      onClose();
    });
  };

  // Navigate to next step
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

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <View style={styles.welcomeContainer}>
              <MaterialCommunityIcons name="map" size={iconSize} color={Colors.primary} />
              <Text style={styles.welcomeTitle}>Discover New Places</Text>
              <Text style={styles.welcomeSubtitle}>Interactive Map Guide</Text>
            </View>

            <Text style={styles.introDescription}>
              Explore nearby attractions, plan routes, and discover new places with our interactive
              map features. Swipe through to learn about all the navigation options.
            </Text>

            <View style={styles.featureIcons}>
              {[
                { icon: "locate-outline", text: "Find Places" },
                { icon: "navigate-outline", text: "Plan Routes" },
                { icon: "bookmark-outline", text: "Save Favorites" },
                { icon: "hand-left-outline", text: "Navigate Map" },
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
                    <Ionicons name={item.icon as IoniconsName} size={24} color="#FFFFFF" />
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
                name="locate-outline"
                size={Math.min(iconSize * 0.8, 42)}
                color={Colors.primary}
              />
              <Text style={styles.stepTitle}>Find Nearby Places</Text>
            </View>

            <Text style={styles.stepDescription}>
              The map shows the 40 closest attractions to your current location. Tap on any marker
              to learn more about that place.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                { icon: "map-marker", text: "View the 40 closest attractions to you" },
                { icon: "information-outline", text: "Tap any marker to see detailed information" },
                { icon: "image-outline", text: "View photos and read about each place" },
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
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={22}
                      color={Colors.primary}
                    />
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
                name="navigate-outline"
                size={Math.min(iconSize * 0.8, 42)}
                color="#4CAF50"
              />
              <Text style={styles.stepTitle}>Plan Your Route</Text>
            </View>

            <Text style={styles.stepDescription}>
              Tap "Start Journey" on any place card to begin your adventure. It will automatically
              determine whether you are driving or walking.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                { icon: "directions", text: "Get directions to any place with one tap" },
                {
                  icon: "car",
                  text: "PathWise detects if you're driving or walking",
                },
                {
                  icon: "map-marker-path",
                  text: "Follow the route with real-time updates",
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
                    <MaterialCommunityIcons name={item.icon as any} size={22} color="#4CAF50" />
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
                name="hand-left-outline"
                size={Math.min(iconSize * 0.8, 42)}
                color="#FF5722"
              />
              <Text style={styles.stepTitle}>Map Navigation Tips</Text>
            </View>

            <Text style={styles.stepDescription}>
              Use these gestures to navigate the map efficiently and find your way around.
            </Text>

            <View style={styles.finalFeatures}>
              {[
                {
                  icon: "gesture-pinch",
                  title: "Zoom",
                  text: "Pinch to zoom in and out",
                  color: "#FF5722",
                },
                {
                  icon: "gesture-tap",
                  title: "Zoom In",
                  text: "Double tap to zoom in",
                  color: "#FF5722",
                },
                {
                  icon: "gesture-two-tap",
                  title: "Zoom Out",
                  text: "Two-finger tap to zoom out",
                  color: "#FF5722",
                },
                {
                  icon: "gesture-swipe",
                  title: "Pan",
                  text: "Swipe to pan around the map",
                  color: "#FF5722",
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
                    <MaterialCommunityIcons name={item.icon as any} size={26} color="#FFFFFF" />
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
                  colors={[Colors.primary, Colors.secondary || Colors.primary]}
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

  // Welcome step styles
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

  // Step content styles
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

  // Final step styles
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

  // Navigation controls
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

export default MapGettingStartedModal;
