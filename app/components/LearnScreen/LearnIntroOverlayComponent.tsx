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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { Colors } from "../../constants/colours";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 375;
const contentMaxWidth = Math.min(width * 0.9, 420);
const iconSize = Math.min(width * 0.15, 60);
const titleSize = isSmallDevice ? 24 : 28;
const basePadding = width * 0.035;
const contentPadding = Math.min(basePadding, 20);

interface LearnIntroOverlayProps {
  visible: boolean;
  onClose: () => void;
}

const LearnIntroOverlay: React.FC<LearnIntroOverlayProps> = ({ visible, onClose }) => {
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
              <MaterialCommunityIcons name="brain" size={iconSize} color={Colors.primary} />
              <Text style={styles.welcomeTitle}>Learn Screen Guide</Text>
              <Text style={styles.welcomeSubtitle}>AI-Powered Travel Insights</Text>
            </View>

            <Text style={styles.introDescription}>
              Welcome to the Learn screen! This is your educational hub for travel insights,
              personalized recommendations, and interactive features powered by AI. Swipe through to
              learn about each feature.
            </Text>

            <View style={styles.featureIcons}>
              {[
                { icon: "analytics", text: "Insights" },
                { icon: "language", text: "Language" },
                { icon: "compass", text: "Discover" },
                { icon: "school", text: "Learn" },
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
              <MaterialCommunityIcons
                name="account-details"
                size={Math.min(iconSize * 0.8, 42)}
                color={Colors.primary}
              />
              <Text style={styles.stepTitle}>AI Travel Snapshot</Text>
            </View>

            <Text style={styles.stepDescription}>
              Get a personalized analysis of your travel preferences and behaviors based on the
              places you've visited.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                {
                  icon: "card-account-details",
                  text: "Personalized traveler profile based on your history",
                },
                { icon: "medal", text: "Earn badges for your exploration achievements" },
                { icon: "trending-up", text: "Track your progress and exploration level" },
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
              <Ionicons name="language" size={Math.min(iconSize * 0.8, 42)} color="#0284C7" />
              <Text style={styles.stepTitle}>Language Assistant</Text>
            </View>

            <Text style={styles.stepDescription}>
              Learn useful phrases in local languages for the regions you've visited. Perfect for
              communicating during your travels.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                { icon: "translate", text: "Get translations for common phrases" },
                { icon: "microphone", text: "Pronunciation guides for proper speaking" },
                {
                  icon: "information-variant",
                  text: "Cultural context for when to use each phrase",
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
                    <MaterialCommunityIcons name={item.icon} size={22} color="#0284C7" />
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
              <Ionicons name="people" size={Math.min(iconSize * 0.8, 42)} color="#7E22CE" />
              <Text style={styles.stepTitle}>Cultural Context</Text>
            </View>

            <Text style={styles.stepDescription}>
              Learn about local customs, traditions, and cultural norms relevant to the places you
              visit.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                { icon: "hand-right", text: "Etiquette tips for respectful travel" },
                { icon: "food-fork-drink", text: "Local dining customs and practices" },
                { icon: "calendar", text: "Information about important local traditions" },
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
                    <MaterialCommunityIcons name={item.icon} size={22} color="#7E22CE" />
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
              <Ionicons name="analytics" size={Math.min(iconSize * 0.8, 42)} color="#4F46E5" />
              <Text style={styles.stepTitle}>Advanced Travel Analysis</Text>
            </View>

            <Text style={styles.stepDescription}>
              Gain deeper insights into your travel patterns and behaviours through comprehensive
              data analysis.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                { icon: "chart-bar", text: "Visualized statistics of your exploration patterns" },
                { icon: "clock-time-eight", text: "Preferred visiting times and patterns" },
                { icon: "map-marker-path", text: "Travel routes and distance analysis" },
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

      case 5:
        return (
          <>
            <View style={styles.stepHeader}>
              <Ionicons name="school" size={Math.min(iconSize * 0.8, 42)} color="#6366F1" />
              <Text style={styles.stepTitle}>Knowledge Quest Game</Text>
            </View>

            <Text style={styles.stepDescription}>
              Test your knowledge about the places you've visited with interactive quizzes and earn
              rewards.
            </Text>

            <View style={styles.featureItemsContainer}>
              {[
                { icon: "help-circle", text: "Answer questions about visited places" },
                { icon: "trophy", text: "Earn points and track your progress" },
                {
                  icon: "book-open-page-variant",
                  text: "Learn new facts through detailed explanations",
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
                    <MaterialCommunityIcons name={item.icon} size={22} color="#6366F1" />
                    <Text style={styles.featureText}>{item.text}</Text>
                  </View>
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
                    {currentStep === MAX_STEPS - 1 ? "Got It" : "Continue"}
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
});

export default LearnIntroOverlay;
