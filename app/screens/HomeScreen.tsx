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
  Image,
  ImageBackground,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import { Colors } from "../constants/colours";
import HeaderSection from "../components/HomeScreen/HeaderSection";
import StatsSection from "../components/HomeScreen/StatsSection";
import DiscoveredLocationsSection from "../components/HomeScreen/DiscoveredLocationsSection";
import FeaturesSection from "../components/HomeScreen/FeaturesSection";
import JourneyInspiration from "../components/HomeScreen/JourneyInspiration";
import JourneyIntroOverlay from "../components/HomeScreen/JourneyIntroOverlay";
import ActionCards from "../components/HomeScreen/ActionCards";
import QuickActions from "../components/HomeScreen/QuickActions";
import { fetchUserProfile } from "../services/userService";
import { auth } from "../config/firebaseConfig";

const { width, height } = Dimensions.get("window");

interface NavigationParams {
  [key: string]: any;
}

interface JourneyTip {
  title: string;
  description: string;
  icon: string;
}

const OnboardingTips: React.FC = () => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const tips: JourneyTip[] = [
    {
      title: "Discover Nearby",
      description: "Use the map to find interesting locations within walking distance",
      icon: "location",
    },
    {
      title: "Visiting a Place",
      description:
        "When you discover a new place, AI Technology will guide you through its history",
      icon: "albums",
    },
    {
      title: "Learn",
      description:
        "PathWise organically learns about you, and provides personalised recommendations for you",
      icon: "school",
    },
    {
      title: "Track Your Progress",
      description: "Complete challenges to earn badges and progress on your explorer journey",
      icon: "trophy",
    },
  ];

  const animateToNextTip = (nextIndex: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentTipIndex(nextIndex);
      slideAnim.setValue(100);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start();
    });
  };

  const nextTip = () => {
    const nextIndex = (currentTipIndex + 1) % tips.length;
    animateToNextTip(nextIndex);
  };

  const prevTip = () => {
    const nextIndex = (currentTipIndex - 1 + tips.length) % tips.length;
    animateToNextTip(nextIndex);
  };

  const currentTip = tips[currentTipIndex];

  return (
    <View style={styles.cardContainer}>
      <View style={styles.sectionHeader}>
        <Ionicons name="bulb" size={22} color={Colors.primary} />
        <Text style={styles.sectionTitle}>Journey Tips</Text>
      </View>

      <View style={styles.tipCardContainer}>
        <TouchableOpacity style={styles.tipNavButton} onPress={prevTip} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#888" />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.tipCard,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.tipIconContainer}>
            <Ionicons name={currentTip.icon} size={24} color={Colors.primary} />
          </View>
          <Text style={styles.tipTitle}>{currentTip.title}</Text>
          <Text style={styles.tipDescription}>{currentTip.description}</Text>
        </Animated.View>

        <TouchableOpacity style={styles.tipNavButton} onPress={nextTip} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={22} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.tipIndicators}>
        {tips.map((_, index) => (
          <View
            key={index}
            style={[
              styles.tipIndicator,
              index === currentTipIndex ? styles.activeTipIndicator : {},
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [userName, setUserName] = useState<string>("User");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showJourneyIntro, setShowJourneyIntro] = useState<boolean>(false);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);

  const fadeAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const scrollY = useRef<Animated.Value>(new Animated.Value(0)).current;
  const loadingAnim = useRef<Animated.Value>(new Animated.Value(0)).current;

  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, -50],
    extrapolate: "clamp",
  });

  const heroScale = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 1.1],
    extrapolate: "clamp",
  });

  const sections: {
    hero: Animated.Value;
    header: Animated.Value;
    action: Animated.Value;
    stats: Animated.Value;
    features: Animated.Value;
    locations: Animated.Value;
    inspiration: Animated.Value;
    tips: Animated.Value;
    quickActions: Animated.Value;
  } = {
    hero: useRef<Animated.Value>(new Animated.Value(0)).current,
    header: useRef<Animated.Value>(new Animated.Value(0)).current,
    action: useRef<Animated.Value>(new Animated.Value(0)).current,
    stats: useRef<Animated.Value>(new Animated.Value(0)).current,
    features: useRef<Animated.Value>(new Animated.Value(0)).current,
    locations: useRef<Animated.Value>(new Animated.Value(0)).current,
    inspiration: useRef<Animated.Value>(new Animated.Value(0)).current,
    tips: useRef<Animated.Value>(new Animated.Value(0)).current,
    quickActions: useRef<Animated.Value>(new Animated.Value(0)).current,
  };

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
        const userProfile = await fetchUserProfile(navigation);

        setUserName(userProfile.name || "User");
        setProfileImage(userProfile.profileImage || null);

        if (userProfile.isNewUser === true) {
          setShowJourneyIntro(true);
          setIsNewUser(true);
        } else {
          setShowJourneyIntro(false);
          setIsNewUser(false);
        }

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

  const triggerEntryAnimations = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    Animated.stagger(80, [
      Animated.timing(sections.hero, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(sections.header, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(sections.action, {
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
      Animated.timing(sections.inspiration, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(sections.tips, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(sections.quickActions, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
    ]).start();
  };

  const navigateToScreen = (screenName: string, params?: NavigationParams): void => {
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

  const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
  });

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
            <Text style={styles.loadingText}>Preparing your journey...</Text>
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
            <Animated.View
              style={[
                styles.heroSection,
                {
                  opacity: sections.hero,
                  transform: [{ translateY: heroTranslateY }, { scale: heroScale }],
                },
              ]}
            >
              <ImageBackground
                source={{
                  uri: "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&w=1000&q=80",
                }}
                style={styles.heroBg}
              >
                <LinearGradient
                  colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.7)"]}
                  style={styles.heroGradient}
                >
                  <TouchableOpacity
                    style={styles.heroHelpButton}
                    onPress={() => setShowJourneyIntro(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.heroContent}>
                    <Text style={styles.heroTitle}>Pathwise</Text>
                    <Text style={styles.heroSubtitle}>Discover the Past, Unlock the City</Text>

                    <TouchableOpacity
                      style={styles.heroButton}
                      onPress={() => navigateToScreen("Discover")}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.heroButtonText}>Start Exploring</Text>
                      <Ionicons
                        name="arrow-forward"
                        color="#fff"
                        size={18}
                        style={{ marginLeft: 8 }}
                      />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </Animated.View>

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
                ],
              }}
            >
              <HeaderSection userName={userName} profileImage={profileImage} />
            </Animated.View>

            <View style={styles.contentContainer}>
              <Animated.View
                style={{
                  opacity: sections.action,
                  transform: [
                    {
                      translateY: sections.action.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                }}
              >
                <ActionCards navigateToScreen={navigateToScreen} />
              </Animated.View>
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

              <Animated.View
                style={{
                  opacity: sections.inspiration,
                  transform: [
                    {
                      translateY: sections.inspiration.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                }}
              >
                <JourneyInspiration />
              </Animated.View>

              <Animated.View
                style={{
                  opacity: sections.quickActions,
                  transform: [
                    {
                      translateY: sections.quickActions.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                }}
              >
                <QuickActions navigateToScreen={navigateToScreen} />
              </Animated.View>

              <Animated.View
                style={{
                  opacity: sections.tips,
                  transform: [
                    {
                      translateY: sections.tips.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                }}
              >
                <OnboardingTips />
              </Animated.View>
            </View>
          </Animated.ScrollView>
          <JourneyIntroOverlay
            visible={showJourneyIntro}
            onClose={() => setShowJourneyIntro(false)}
          />
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
    paddingBottom: 70,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 16,
  },
  heroSection: {
    width: width,
    height: height * 0.38,
    marginBottom: 10,
  },
  heroBg: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  heroContent: {
    alignItems: "center",
    paddingBottom: 16,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 20,
    textAlign: "center",
  },
  heroButton: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  heroButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  heroHelpButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 35,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
    marginBottom: 16,
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

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text || "#333",
    marginLeft: 8,
  },
  tipCardContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  tipNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  tipCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  tipIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(74, 144, 226, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    textAlign: "center",
  },
  tipDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  tipIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  tipIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DDD",
    marginHorizontal: 4,
  },
  activeTipIndicator: {
    backgroundColor: Colors.primary,
    width: 16,
  },
});

export default HomeScreen;
