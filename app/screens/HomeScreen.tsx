import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  StatusBar,
  Animated,
  Easing,
  Platform,
  Text,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import { Colors } from "../constants/colours";
import HeaderSection from "../components/HomeScreen/HeaderSection";
import StatsSection from "../components/HomeScreen/StatsSection";
import DiscoveredLocationsSection from "../components/HomeScreen/DiscoveredLocationsSection";
import FeaturesSection from "../components/HomeScreen/FeaturesSection";
import { fetchUserProfile } from "../services/userService";

// TypeScript interfaces
interface NavigationParams {
  [key: string]: any;
}

// Enhanced HomeScreen component with animations and modern design
const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [userName, setUserName] = useState<string>("User");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Animation values
  const fadeAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const scrollY = useRef<Animated.Value>(new Animated.Value(0)).current;
  const loadingAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const welcomeBubbleAnim = useRef<Animated.Value>(new Animated.Value(0)).current;

  // Refs to control staggered animations of sections
  const sections: {
    header: Animated.Value;
    stats: Animated.Value;
    locations: Animated.Value;
    features: Animated.Value;
  } = {
    header: useRef<Animated.Value>(new Animated.Value(0)).current,
    stats: useRef<Animated.Value>(new Animated.Value(0)).current,
    locations: useRef<Animated.Value>(new Animated.Value(0)).current,
    features: useRef<Animated.Value>(new Animated.Value(0)).current,
  };

  // Load user profile and trigger animations
  useEffect(() => {
    const startLoadingAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(loadingAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startLoadingAnimation();

    const loadUserProfile = async () => {
      try {
        setIsLoading(true);
        // Fetch user profile from Firestore
        const userProfile = await fetchUserProfile(navigation);

        // Update username and profile image
        setUserName(userProfile.name || "User");
        setProfileImage(userProfile.profileImage || null);

        // Small delay to ensure smooth animation transition
        setTimeout(() => {
          setIsLoading(false);
          triggerEntryAnimations();
        }, 300);
      } catch (error) {
        console.error("Error loading user profile:", error);
        setIsLoading(false);
        triggerEntryAnimations();
      }
    };

    loadUserProfile();
  }, []);

  // Trigger beautiful staggered entry animations for all components
  const triggerEntryAnimations = () => {
    // Fade in the whole screen
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    // Show welcome bubble after a delay
    Animated.timing(welcomeBubbleAnim, {
      toValue: 1,
      duration: 700,
      delay: 1000,
      useNativeDriver: true,
      easing: Easing.elastic(1.2),
    }).start();

    // Staggered animation for sections
    Animated.stagger(200, [
      Animated.timing(sections.header, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(sections.stats, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(sections.locations, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(sections.features, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
    ]).start();
  };

  // Handle navigation to other screens
  const navigateToScreen = (screenName: string, params?: NavigationParams): void => {
    // Add a small scale animation when navigating
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.97,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    navigation.navigate(screenName, params);
  };

  // Handle scroll events for parallax effects
  const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
  });

  // Render welcome bubble that appears after loading
  const renderWelcomeBubble = () => {
    return (
      <Animated.View
        style={[
          styles.welcomeBubble,
          {
            opacity: welcomeBubbleAnim,
            transform: [
              { scale: welcomeBubbleAnim },
              {
                translateY: welcomeBubbleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={["#9747FF", "#4A90E2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeBubbleGradient}
        >
          <Text style={styles.welcomeBubbleText}>Welcome back, {userName.split(" ")[0]}!</Text>
          <Text style={styles.welcomeBubbleSubtext}>Ready to continue your journey?</Text>

          <TouchableOpacity
            style={styles.welcomeBubbleClose}
            onPress={() => {
              Animated.timing(welcomeBubbleAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
                easing: Easing.out(Easing.back(1.5)),
              }).start();
            }}
          >
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Loading state with pulsing animation
  if (isLoading) {
    return (
      <ScreenWithNavBar>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.loadingIndicator,
                {
                  opacity: loadingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                  transform: [
                    {
                      scale: loadingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1.1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={["#4A90E2", "#9747FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loadingGradient}
              />
            </Animated.View>
            <Text style={styles.loadingText}>Setting up your journey...</Text>
          </View>
        </SafeAreaView>
      </ScreenWithNavBar>
    );
  }

  return (
    <ScreenWithNavBar>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={true}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* Header with parallax effect */}
            <Animated.View
              style={{
                opacity: sections.header,
                transform: [
                  {
                    translateY: sections.header.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                  {
                    translateY: scrollY.interpolate({
                      inputRange: [0, 200],
                      outputRange: [0, -30],
                      extrapolateRight: "clamp",
                    }),
                  },
                ],
              }}
            >
              <HeaderSection userName={userName} profileImage={profileImage} />
            </Animated.View>

            <View style={styles.contentContainer}>
              {/* Stats Section with slide-up animation */}
              <Animated.View
                style={{
                  opacity: sections.stats,
                  transform: [
                    {
                      translateY: sections.stats.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                }}
              >
                <StatsSection />
              </Animated.View>

              {/* Discovered Locations with slide-up animation */}
              <Animated.View
                style={{
                  opacity: sections.locations,
                  transform: [
                    {
                      translateY: sections.locations.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                }}
              >
                <DiscoveredLocationsSection navigateToScreen={navigateToScreen} />
              </Animated.View>

              {/* Features Section with slide-up animation */}
              <Animated.View
                style={{
                  opacity: sections.features,
                  transform: [
                    {
                      translateY: sections.features.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                }}
              >
                <FeaturesSection navigateToScreen={navigateToScreen} />
              </Animated.View>
            </View>
          </Animated.ScrollView>

          {/* Welcome bubble that appears after initial load */}
          {renderWelcomeBubble()}
        </SafeAreaView>
      </Animated.View>
    </ScreenWithNavBar>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80, // Reduced padding at the bottom for better spacing
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16, // Standardized horizontal padding
    marginTop: 20, // Positive margin instead of negative for better layout
    paddingTop: 10, // Reduced padding to compensate for positive margin
    gap: 16, // Add gap between sections for consistent spacing
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 20,
    overflow: "hidden",
  },
  loadingGradient: {
    width: "100%",
    height: "100%",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  welcomeBubble: {
    position: "absolute",
    bottom: 90, // Adjusted for better visibility
    right: 20, // Consistent padding
    width: 220,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 999,
  },
  welcomeBubbleGradient: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    position: "relative",
  },
  welcomeBubbleText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  welcomeBubbleSubtext: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
  },
  welcomeBubbleClose: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default HomeScreen;
