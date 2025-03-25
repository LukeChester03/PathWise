// screens/ProfileScreen.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  StatusBar,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth, db } from "../config/firebaseConfig";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import Header from "../components/Global/Header";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, NeutralColors } from "../constants/colours";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { fetchUserStats, fetchUserLevelInfo } from "../services/statsService";
import { fetchUserProfile, UserProfile } from "../services/userService";
import { EXPLORATION_LEVELS } from "../types/StatTypes";
import { StatItem } from "../types/StatTypes";
import BadgesSection from "../components/LearnScreen/BadgesSection";
import { TravelBadge, TravelProfile } from "../types/LearnScreen/TravelProfileTypes";
import { getAllUserBadges } from "../services/LearnScreen/badgeService";

const { width, height } = Dimensions.get("window");

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const settingsAnimation = useRef(new Animated.Value(width)).current;
  const [allUserStats, setAllUserStats] = useState<StatItem[]>([]);
  const [displayedStats, setDisplayedStats] = useState<StatItem[]>([]);
  const [levelInfo, setLevelInfo] = useState({
    level: 1,
    xp: 0,
    title: "Beginner Explorer",
    nextLevelXP: 100,
    progress: 0,
    xpNeeded: 100,
    xpProgress: 0,
  });
  const [badgesView, setBadgesView] = useState<"earned" | "progress">("earned");
  const [badges, setBadges] = useState<TravelBadge[]>([]);

  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfile & { joinDate: string }>({
    name: "User",
    email: auth.currentUser?.email || "",
    profileImage: null,
    joinDate: "Jan 2023",
  });

  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const scaleAvatar = useRef(new Animated.Value(0.8)).current;
  const rotateGear = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const levelUpScale = useRef(new Animated.Value(1)).current;

  // Stats animation values
  const statsScale = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Badge animation value
  const badgeBounce = useRef(new Animated.Value(0)).current;

  // User achievements data
  const userData = {
    achievements: [
      {
        id: 1,
        title: "Adventurer",
        description: "Visit 10 different places",
        icon: "trophy",
        completed: true,
      },
      {
        id: 2,
        title: "World Traveler",
        description: "Visit 3 different countries",
        icon: "globe",
        completed: true,
      },
      {
        id: 3,
        title: "Photographer",
        description: "Upload 20 photos",
        icon: "camera",
        completed: true,
      },
      {
        id: 4,
        title: "Explorer",
        description: "Visit 50 different places",
        icon: "map-marker",
        completed: false,
      },
      {
        id: 5,
        title: "Critic",
        description: "Write 20 reviews",
        icon: "star",
        completed: false,
      },
    ],
  };

  // Function to get meaningful stats
  const getMeaningfulStats = useCallback((stats: StatItem[], count: number = 4) => {
    if (!stats || stats.length === 0) return [];

    // Helper function to check if a stat has meaningful content
    const isStatMeaningful = (stat: StatItem): boolean => {
      if (typeof stat.value === "number") {
        return stat.value > 0;
      }
      if (typeof stat.value === "string") {
        // Check for "Level X" format (always show current level)
        if (stat.value.startsWith("Level ")) {
          return true;
        }
        // Check for distance values
        if (stat.value.endsWith("km") || stat.value.endsWith("m")) {
          return stat.value !== "0 km" && stat.value !== "0 m";
        }
        // Filter out empty values
        return !["None yet", "0", "0.0"].includes(stat.value);
      }
      return false;
    };

    // Filter stats that have meaningful content
    const meaningfulStats = stats.filter(isStatMeaningful);

    // If we don't have enough stats, just return what we have
    return meaningfulStats.slice(0, count);
  }, []);

  // Helper functions for badge handling - follow the pattern from TravelProfileScreen
  const getCompletedBadges = (): TravelBadge[] => {
    return badges.filter((badge) => badge.completed);
  };

  const getInProgressBadges = (): TravelBadge[] => {
    // Get badges in progress
    const inProgressBadges = badges.filter((badge) => !badge.completed);

    // Limit in-progress badges to prevent overwhelming display
    return inProgressBadges.slice(0, 4);
  };

  // Create a simplified travel profile
  const travelProfile: TravelProfile = {
    type: levelInfo.title,
    level: levelInfo.level.toString(),
    description: "Your personal travel journey",
    streak: 0,
    visitFrequency: {
      weekdays: {
        most: "Weekends",
        percentage: 60,
        insight: "You tend to explore more on weekends",
      },
      timeOfDay: {
        most: "Afternoon",
        percentage: 70,
        insight: "Afternoon adventures are your preferred time to explore",
      },
      season: {
        most: "Summer",
        percentage: 50,
        insight: "Summer seems to be your favorite time to travel",
      },
    },
    visitation: {
      averageDuration: "2 hours",
      averageDistance: "5 km",
      mostVisitedCity: "Unknown",
    },
    patterns: ["Weekend Explorer", "Cultural Enthusiast"],
    preferences: {
      categories: [],
      architecturalStyles: [],
      activities: [],
    },
    recentInsights: [],
    explorationScore: levelInfo.xp,
    isGenerating: false,
  };

  // Function to fetch all badges - similar to what's in TravelProfileScreen
  const fetchAllBadges = async () => {
    try {
      // Get all badges from the service
      const allBadges = await getAllUserBadges();
      setBadges(allBadges);
    } catch (err) {
      console.error("Error fetching all badges:", err);

      // Fallback: create dummy badges from userData if the service fails
      const dummyBadges: TravelBadge[] = userData.achievements.map((achievement) => ({
        id: achievement.id.toString(),
        name: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        completed: achievement.completed,
        dateEarned: achievement.completed ? new Date() : new Date(0),
        requirements: [
          {
            type: "visitCount",
            value: 10,
            current: achievement.completed ? 10 : 5,
          },
        ],
      }));

      setBadges(dummyBadges);
    }
  };

  // Navigate to the journey screen with all stats
  const navigateToJourneyScreen = () => {
    // Include all stats, even those with zero values
    navigation.navigate("MyJourney", { stats: allUserStats });
  };

  // Animate the level up effect
  const animateLevelUp = () => {
    Animated.sequence([
      Animated.timing(levelUpScale, {
        toValue: 1.3,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(levelUpScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    // Load user profile using the existing service
    const loadUserProfile = async () => {
      try {
        const profile = await fetchUserProfile(navigation);

        // Update user profile state with the data from the service
        setUserProfile({
          name: profile.name || "User",
          email: profile.email || auth.currentUser?.email || "",
          profileImage: profile.profileImage || null,
          joinDate: "Jan 2023", // This could be fetched from Firestore if available
        });
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };

    // Fetch user stats from Firebase
    const loadStats = async () => {
      try {
        const stats = await fetchUserStats();
        const userLevelInfo = await fetchUserLevelInfo();

        if (userLevelInfo) {
          setLevelInfo(userLevelInfo);

          // Animate progress bar
          Animated.timing(progressAnim, {
            toValue: userLevelInfo.progress / 100,
            duration: 1500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }

        setAllUserStats(stats);

        // Get only meaningful stats
        setDisplayedStats(getMeaningfulStats(stats, 4));
      } catch (error) {
        console.error("Error fetching stats:", error);
        setAllUserStats([]);
        setDisplayedStats([]);
      }
    };

    // Fetch badges
    fetchAllBadges();

    // Load both user profile and stats
    loadUserProfile();
    loadStats();

    // Start animations when component mounts
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.back(1.7)),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAvatar, {
          toValue: 1,
          duration: 1000,
          easing: Easing.elastic(1.2),
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(
        150,
        statsScale.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          })
        )
      ),
      Animated.spring(badgeBounce, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Setup continuous rotation animation for settings gear
    Animated.loop(
      Animated.timing(rotateGear, {
        toValue: 1,
        duration: 15000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Trigger level up animation
    animateLevelUp();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.navigate("Landing");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    }
  };

  // Open/close settings drawer
  const toggleSettings = () => {
    if (isSettingsVisible) {
      // Close settings
      Animated.timing(settingsAnimation, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsSettingsVisible(false));
    } else {
      // Open settings
      setIsSettingsVisible(true);
      Animated.timing(settingsAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // Interpolate rotation for settings gear
  const spin = rotateGear.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Badge bounce transform
  const badgeTransform = badgeBounce.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 1.3, 1],
  });

  // Progress width animation
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // Determine if we should show the stats section at all
  const hasStats = displayedStats.length > 0;

  // Get level icon
  const getLevelIcon = (level: number) => {
    const levelData = EXPLORATION_LEVELS.find((l) => l.level === level);
    return levelData ? levelData.icon : "🔍";
  };

  // Function to get initials from name for avatar placeholder
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScreenWithNavBar>
      <StatusBar barStyle="light-content" />

      {/* Use the Header component */}
      <Header
        title="Profile"
        subtitle="Your personal explorer journey"
        showIcon={true}
        iconName="person-circle"
        iconColor={Colors.primary}
        customStyles={styles.header}
        onHelpPress={function (): void {
          throw new Error("Function not implemented.");
        }}
        showHelp={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <Animated.View
          style={[
            styles.profileCard,
            {
              opacity: fadeIn,
              transform: [{ translateY: translateY }],
            },
          ]}
        >
          <View style={styles.profileCardContent}>
            <View style={styles.avatarSection}>
              <Animated.View
                style={[styles.avatarContainer, { transform: [{ scale: scaleAvatar }] }]}
              >
                {userProfile.profileImage ? (
                  <Image source={{ uri: userProfile.profileImage }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={[Colors.primary, Colors.primary + "80"]}
                    style={styles.avatarPlaceholder}
                  >
                    <Text style={styles.avatarText}>{getInitials(userProfile.name)}</Text>
                  </LinearGradient>
                )}
                <Animated.View
                  style={[styles.levelBadge, { transform: [{ scale: badgeTransform }] }]}
                >
                  <Animated.Text
                    style={[styles.levelText, { transform: [{ scale: levelUpScale }] }]}
                  >
                    {levelInfo.level}
                  </Animated.Text>
                </Animated.View>
              </Animated.View>

              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{userProfile.name}</Text>
                <Text style={styles.explorerTitle}>
                  {getLevelIcon(levelInfo.level)} {levelInfo.title}
                </Text>
                <Text style={styles.userEmail}>{userProfile.email}</Text>
                <Text style={styles.joinDate}>Member since {userProfile.joinDate}</Text>
              </View>
            </View>

            {/* Level Progress */}
            <View style={styles.levelContainer}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelTitle}>Explorer Level {levelInfo.level}</Text>
                <Text style={styles.levelProgress}>
                  {levelInfo.xpProgress}/{levelInfo.xpNeeded} XP
                </Text>
              </View>
              <View style={styles.progressBarBackground}>
                <Animated.View style={[styles.progressBarFill, { width: progressWidth }]}>
                  <LinearGradient
                    colors={[Colors.primary, Colors.primary + "80"]}
                    style={styles.progressGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </Animated.View>
              </View>
              <Text style={styles.levelInfo}>
                {levelInfo.xpNeeded - levelInfo.xpProgress} XP to Level {levelInfo.level + 1}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats Section */}
        {hasStats && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionTitleLeft}>
                <Ionicons
                  name="analytics-outline"
                  size={20}
                  color={Colors.primary}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Your Explorer Stats</Text>
              </View>

              {allUserStats.length > displayedStats.length && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={navigateToJourneyScreen}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.statsGrid}>
              {displayedStats.map((stat, index) => (
                <Animated.View
                  key={stat.id}
                  style={[
                    styles.statItem,
                    {
                      transform: [{ scale: statsScale[index] || statsScale[0] }],
                      opacity: statsScale[index] || statsScale[0],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[stat.gradientColors[0], stat.gradientColors[1]]}
                    style={styles.statIconContainer}
                  >
                    <Ionicons name={stat.icon} size={22} color="#fff" />
                  </LinearGradient>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {/* XP Insights Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionTitleLeft}>
              <Ionicons name="flash" size={20} color={Colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>XP Insights</Text>
            </View>
          </View>

          <View style={styles.xpInfoContainer}>
            <View style={styles.xpHeader}>
              <View style={styles.xpBadge}>
                <Text style={styles.xpBadgeText}>{levelInfo.xp}</Text>
              </View>
              <Text style={styles.xpBadgeLabel}>Total XP</Text>
            </View>

            <Text style={styles.xpInfoText}>
              Earn more XP by discovering new places, visiting different countries, and maintaining
              your daily streak.
            </Text>

            <View style={styles.xpTipsContainer}>
              <Text style={styles.xpTipsTitle}>Quick XP Tips:</Text>
              <View style={styles.xpTipsGrid}>
                <View style={styles.xpTip}>
                  <View style={[styles.xpTipIcon, { backgroundColor: "#4CD964" }]}>
                    <Ionicons name="earth-outline" size={16} color="#fff" />
                  </View>
                  <Text style={styles.xpTipText}>Visit a new country: +50 XP</Text>
                </View>
                <View style={styles.xpTip}>
                  <View style={[styles.xpTipIcon, { backgroundColor: "#5856D6" }]}>
                    <Ionicons name="map-outline" size={16} color="#fff" />
                  </View>
                  <Text style={styles.xpTipText}>Discover a new place: +10 XP</Text>
                </View>
                <View style={styles.xpTip}>
                  <View style={[styles.xpTipIcon, { backgroundColor: "#FF9500" }]}>
                    <Ionicons name="flame-outline" size={16} color="#fff" />
                  </View>
                  <Text style={styles.xpTipText}>Daily streak: +5 XP/day</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Badges Section */}

        <View style={styles.badgesSectionWrapper}>
          <BadgesSection
            completedBadges={getCompletedBadges()}
            inProgressBadges={getInProgressBadges()}
            badgesView={badgesView}
            setBadgesView={setBadgesView}
            profile={travelProfile}
          />
        </View>

        {/* Logout button at the bottom */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons
            name="log-out-outline"
            size={20}
            color={Colors.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Settings Drawer */}
      {isSettingsVisible && (
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={toggleSettings} />
      )}

      <Animated.View
        style={[styles.settingsDrawer, { transform: [{ translateX: settingsAnimation }] }]}
      >
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>Settings</Text>
          <TouchableOpacity onPress={toggleSettings} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.settingsContent}>
          <TouchableOpacity style={styles.settingsItem}>
            <View style={[styles.settingsIconContainer, { backgroundColor: Colors.primary }]}>
              <Ionicons name="person-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.settingsItemText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={[styles.settingsIconContainer, { backgroundColor: "#5856D6" }]}>
              <Ionicons name="lock-closed-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.settingsItemText}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={[styles.settingsIconContainer, { backgroundColor: "#FF9500" }]}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.settingsItemText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={[styles.settingsIconContainer, { backgroundColor: "#34C759" }]}>
              <Ionicons name="globe-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.settingsItemText}>Language</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={[styles.settingsIconContainer, { backgroundColor: "#007AFF" }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.settingsItemText}>Privacy</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={[styles.settingsIconContainer, { backgroundColor: "#5AC8FA" }]}>
              <Ionicons name="help-circle-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.settingsItemText}>Help & Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={[styles.settingsIconContainer, { backgroundColor: "#4A90E2" }]}>
              <Ionicons name="information-circle-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.settingsItemText}>About</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsItem, styles.logoutSettingsItem]}
            onPress={handleLogout}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: "#FF3B30" }]}>
              <Ionicons name="log-out-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.logoutSettingsText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </ScreenWithNavBar>
  );
};

const styles = StyleSheet.create({
  // Header
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  badgesSectionWrapper: {
    marginHorizontal: -16,
  },
  // Content
  scrollView: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
  },

  // Profile Card
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  profileCardContent: {
    padding: 20,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  levelBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  levelText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  explorerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginBottom: 2,
  },
  joinDate: {
    fontSize: 12,
    color: NeutralColors.gray500,
  },
  levelContainer: {
    width: "100%",
    marginTop: 8,
  },
  levelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  levelTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  levelProgress: {
    fontSize: 14,
    color: NeutralColors.gray600,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressGradient: {
    width: "100%",
    height: "100%",
  },
  levelInfo: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginTop: 6,
    textAlign: "right",
  },

  // Sections
  sectionContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500",
    marginRight: 2,
  },

  // Stats Grid
  statsGrid: {
    marginTop: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  statIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: NeutralColors.gray600,
  },

  // XP Section
  xpInfoContainer: {
    padding: 6,
  },
  xpHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  xpBadge: {
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 50,
    alignItems: "center",
  },
  xpBadgeText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  xpBadgeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  xpInfoText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#555",
    marginBottom: 16,
  },
  xpTipsContainer: {
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
  },
  xpTipsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  xpTipsGrid: {
    gap: 10,
  },
  xpTip: {
    flexDirection: "row",
    alignItems: "center",
  },
  xpTipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  xpTipText: {
    fontSize: 14,
    color: "#555",
  },

  // Achievements
  achievementsContainer: {
    marginTop: 8,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.03)",
  },
  achievementIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  achievementIconDisabled: {
    opacity: 0.6,
  },
  achievementDetails: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 3,
  },
  achievementTitleDisabled: {
    color: NeutralColors.gray600,
  },
  achievementDescription: {
    fontSize: 13,
    color: NeutralColors.gray600,
  },
  achievementDescriptionDisabled: {
    color: NeutralColors.gray400,
  },
  achievementCompletedBadge: {
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  achievementLockedBadge: {
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.5,
  },

  // Logout button
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
  },
  logoutText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },

  // Settings Drawer
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
  settingsDrawer: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "80%",
    height: "100%",
    backgroundColor: "#fff",
    zIndex: 1001,
    shadowColor: "#000",
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    overflow: "hidden",
  },
  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  settingsContent: {
    flex: 1,
    paddingVertical: 8,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.03)",
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  settingsItemText: {
    fontSize: 16,
    color: "#333",
  },
  logoutSettingsItem: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.03)",
    borderBottomWidth: 0,
  },
  logoutSettingsText: {
    fontSize: 16,
    color: "#FF3B30",
    fontWeight: "500",
  },
});

export default ProfileScreen;
