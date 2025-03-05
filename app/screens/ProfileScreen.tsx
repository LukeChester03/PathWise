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
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import Header from "../components/Global/Header";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, NeutralColors } from "../constants/colours";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { fetchUserStats, fetchUserLevelInfo } from "../services/statsService";
import { EXPLORATION_LEVELS } from "../types/StatTypes";
import { StatItem } from "../types/StatTypes";

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

  // User data (would be fetched from Firebase in a real app)
  const userData = {
    firstName: auth.currentUser?.displayName?.split(" ")[0] || "John",
    familyName: auth.currentUser?.displayName?.split(" ")[1] || "Doe",
    email: auth.currentUser?.email || "john.doe@example.com",
    avatar: null, // Replace with user's avatar URL if available
    joinDate: "Jan 2023",
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

  return (
    <ScreenWithNavBar>
      <SafeAreaView style={styles.safeArea}>
        {/* Background with gradient */}
        <LinearGradient
          colors={["#3a7bd5", "#00d2ff"]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerOverlay}>
            <Image
              source={require("../assets/world-map.jpg")}
              style={styles.mapBackground}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>

        {/* Custom Header */}
        <View style={styles.customHeader}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={toggleSettings}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>

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
            <View style={styles.avatarContainer}>
              <Animated.View style={{ transform: [{ scale: scaleAvatar }] }}>
                {userData.avatar ? (
                  <Image source={{ uri: userData.avatar }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={["#6a11cb", "#2575fc"]}
                    style={styles.avatarPlaceholder}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.avatarText}>
                      {userData.firstName.charAt(0)}
                      {userData.familyName.charAt(0)}
                    </Text>
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
            </View>

            <Text style={styles.userName}>
              {userData.firstName} {userData.familyName}
            </Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
            <Text style={styles.joinDate}>Member since {userData.joinDate}</Text>

            {/* Explorer Rank */}
            <View style={styles.explorerRankContainer}>
              <Text style={styles.explorerTitle}>
                {getLevelIcon(levelInfo.level)} {levelInfo.title}
              </Text>
            </View>

            {/* Level Progress */}
            <View style={styles.levelContainer}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelTitle}>Level {levelInfo.level}</Text>
                <Text style={styles.levelProgress}>
                  {levelInfo.xpProgress}/{levelInfo.xpNeeded} XP
                </Text>
              </View>
              <View style={styles.progressBarBackground}>
                <Animated.View style={[styles.progressBarFill, { width: progressWidth }]}>
                  <LinearGradient
                    colors={["#F857A6", "#FF5858"]}
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
          </Animated.View>

          {/* Stats Section with Grid Icon */}
          {hasStats && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionTitleLeft}>
                  <Ionicons
                    name="stats-chart"
                    size={20}
                    color={Colors.primary}
                    style={styles.sectionIcon}
                  />
                  <Text style={styles.sectionTitle}>Your Stats</Text>
                </View>

                {/* Grid icon to navigate to full stats */}
                {allUserStats.length > displayedStats.length && (
                  <TouchableOpacity
                    style={styles.gridButton}
                    onPress={navigateToJourneyScreen}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="grid-outline" size={22} color={Colors.primary} />
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
                      colors={stat.gradientColors}
                      style={styles.statIconContainer}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name={stat.icon} size={22} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </Animated.View>
                ))}
              </View>
            </View>
          )}

          {/* XP Insights Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionTitleLeft}>
                <Ionicons
                  name="flash"
                  size={20}
                  color={Colors.primary}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>XP Insights</Text>
              </View>
            </View>

            <View style={styles.xpInfoContainer}>
              <Text style={styles.xpInfoText}>
                Your explorer score is <Text style={styles.xpHighlight}>{levelInfo.xp} XP</Text>.
                Earn more XP by discovering new places, visiting different countries, and
                maintaining your daily streak.
              </Text>

              <View style={styles.xpTipsContainer}>
                <Text style={styles.xpTipsTitle}>Quick XP Tips:</Text>
                <View style={styles.xpTip}>
                  <Ionicons
                    name="earth-outline"
                    size={16}
                    color={Colors.primary}
                    style={styles.xpTipIcon}
                  />
                  <Text style={styles.xpTipText}>Visit a new country: +50 XP</Text>
                </View>
                <View style={styles.xpTip}>
                  <Ionicons
                    name="map-outline"
                    size={16}
                    color={Colors.primary}
                    style={styles.xpTipIcon}
                  />
                  <Text style={styles.xpTipText}>Discover a new place: +10 XP</Text>
                </View>
                <View style={styles.xpTip}>
                  <Ionicons
                    name="flame-outline"
                    size={16}
                    color={Colors.primary}
                    style={styles.xpTipIcon}
                  />
                  <Text style={styles.xpTipText}>Maintain daily streak: +5 XP/day</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Achievements Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="trophy" size={20} color={Colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Achievements</Text>
            </View>

            <View style={styles.achievementsContainer}>
              {userData.achievements.map((achievement, index) => (
                <Animated.View
                  key={achievement.id}
                  style={[
                    {
                      opacity: fadeIn,
                      transform: [
                        {
                          translateY: translateY.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 15 * index],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.achievementItem,
                      achievement.completed
                        ? styles.achievementCompleted
                        : styles.achievementLocked,
                    ]}
                  >
                    <LinearGradient
                      colors={
                        achievement.completed ? ["#5C258D", "#4389A2"] : ["#bdc3c7", "#2c3e50"]
                      }
                      style={styles.achievementIconContainer}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <FontAwesome5 name={achievement.icon} size={18} color={"#fff"} />
                    </LinearGradient>
                    <View style={styles.achievementDetails}>
                      <Text style={styles.achievementTitle}>{achievement.title}</Text>
                      <Text style={styles.achievementDescription}>{achievement.description}</Text>
                    </View>
                    {achievement.completed ? (
                      <View style={styles.achievementCompletedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color="#4CD964" />
                      </View>
                    ) : (
                      <View style={styles.achievementLockedBadge}>
                        <Ionicons name="lock-closed" size={20} color={NeutralColors.gray400} />
                      </View>
                    )}
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Settings Drawer */}
        {isSettingsVisible && (
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={toggleSettings} />
        )}

        <Animated.View
          style={[styles.settingsDrawer, { transform: [{ translateX: settingsAnimation }] }]}
        >
          <LinearGradient
            colors={["#3a7bd5", "#00d2ff"]}
            style={styles.settingsHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.settingsTitle}>Settings</Text>
            <TouchableOpacity onPress={toggleSettings}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.settingsContent}>
            <TouchableOpacity style={styles.settingsItem}>
              <View style={styles.settingsIconContainer}>
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
              style={[styles.settingsItem, styles.logoutItem]}
              onPress={handleLogout}
            >
              <View style={[styles.settingsIconContainer, { backgroundColor: "#FF3B30" }]}>
                <Ionicons name="log-out-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </ScreenWithNavBar>
  );
};

export default ProfileScreen;

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 0,
  },
  headerOverlay: {
    width: "100%",
    height: "100%",
    opacity: 0.15,
    overflow: "hidden",
  },
  mapBackground: {
    width: "100%",
    height: "100%",
    opacity: 0.4,
  },
  customHeader: {
    height: 100,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginTop: 24,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
  },
  levelBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF5858",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  levelText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginBottom: 6,
  },
  joinDate: {
    fontSize: 12,
    color: NeutralColors.gray500,
    marginBottom: 14,
  },
  explorerRankContainer: {
    marginBottom: 16,
  },
  explorerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary,
  },
  levelContainer: {
    width: "100%",
    marginTop: 12,
  },
  levelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  levelProgress: {
    fontSize: 14,
    color: NeutralColors.gray600,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressGradient: {
    width: "100%",
    height: "100%",
  },
  levelInfo: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginTop: 8,
    textAlign: "right",
  },
  sectionContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
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
    fontWeight: "bold",
    color: "#333",
  },
  gridButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(74, 144, 226, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: NeutralColors.gray600,
  },
  xpInfoContainer: {
    padding: 6,
  },
  xpInfoText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#444",
    marginBottom: 16,
  },
  xpHighlight: {
    fontWeight: "bold",
    color: Colors.primary,
  },
  xpTipsContainer: {
    padding: 12,
    backgroundColor: "rgba(74, 144, 226, 0.08)",
    borderRadius: 12,
  },
  xpTipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  xpTip: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  xpTipIcon: {
    marginRight: 8,
  },
  xpTipText: {
    fontSize: 14,
    color: "#555",
  },
  achievementsContainer: {
    marginTop: 8,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  achievementCompleted: {
    opacity: 1,
  },
  achievementLocked: {
    opacity: 0.7,
  },
  achievementIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  achievementDetails: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 13,
    color: NeutralColors.gray600,
  },
  achievementCompletedBadge: {
    height: 45,
    width: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  achievementLockedBadge: {
    height: 45,
    width: 45,
    justifyContent: "center",
    alignItems: "center",
  },
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
    width: "85%",
    height: "100%",
    backgroundColor: "#fff",
    zIndex: 1001,
    shadowColor: "#000",
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    borderTopLeftRadius: 25,
    borderBottomLeftRadius: 25,
    overflow: "hidden",
  },
  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  settingsContent: {
    flex: 1,
    paddingVertical: 10,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
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
  logoutItem: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    borderBottomWidth: 0,
  },
  logoutText: {
    fontSize: 16,
    color: "#FF3B30",
    fontWeight: "500",
  },
});
