// screens/TravelProfileScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { TravelProfile, TravelBadge } from "../types/LearnScreen/TravelProfileTypes";
import { VisitedPlaceDetails } from "../types/MapTypes";
import { getTravelProfile } from "../services/LearnScreen/travelProfileService";
import { getAllUserBadges } from "../services/LearnScreen/badgeService";
import { Colors, NeutralColors, AccentColors } from "../constants/colours";
import {
  syncBadgesWithStats,
  refreshBadgesInProfile,
} from "../services/LearnScreen/badgeStatsService";
import { fetchUserStats } from "../services/statsService";

// Define navigation types
type RootStackParamList = {
  Home: undefined;
  TravelProfile: { profile?: TravelProfile };
};

type TravelProfileScreenRouteProp = RouteProp<RootStackParamList, "TravelProfile">;
type TravelProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, "TravelProfile">;

interface TravelProfileScreenProps {
  route: TravelProfileScreenRouteProp;
  navigation: TravelProfileScreenNavigationProp;
}

const { width } = Dimensions.get("window");
const cardWidth = (width - 64) / 3;

const TravelProfileScreen: React.FC<TravelProfileScreenProps> = ({ route, navigation }) => {
  const [profile, setProfile] = useState<TravelProfile | null>(route.params?.profile || null);
  const [loading, setLoading] = useState<boolean>(!route.params?.profile);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("preferences");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Badge display state
  const [badgesView, setBadgesView] = useState<"earned" | "progress">("earned");
  const [lockedBadges, setLockedBadges] = useState<TravelBadge[]>([]);
  const [isSyncingBadges, setSyncingBadges] = useState<boolean>(false);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));

  /**
   * Synchronize badges with current user stats
   */
  const syncBadgesWithUserStats = async () => {
    try {
      if (!profile) return;

      setSyncingBadges(true);

      // Sync badges with stats
      const { updatedBadges, completedBadgeIds } = await syncBadgesWithStats();

      if (updatedBadges.length > 0) {
        // Refresh the whole profile to get the latest data
        await fetchProfile();

        // Optionally show a notification for completed badges
        if (completedBadgeIds.length > 0) {
          // You could implement a toast or notification here
          console.log(`Badges completed: ${completedBadgeIds.length}`);
        }
      }
    } catch (error) {
      console.error("Error syncing badges with stats:", error);
    } finally {
      setSyncingBadges(false);
    }
  };

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    } else {
      // Format the last updated timestamp from the profile
      if (profile.hasOwnProperty("lastGeneratedAt")) {
        const timestamp = (profile as any).lastGeneratedAt;
        if (timestamp) {
          const date = new Date(timestamp);
          setLastUpdated(date.toLocaleString());
        }
      }

      // Fetch badges for this user (including locked ones)
      fetchAllBadges();

      // Sync badges with stats when profile is loaded
      syncBadgesWithUserStats();

      // Start fade-in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [profile]);

  /**
   * Fetch all badges, including those not in the profile
   */
  const fetchAllBadges = async () => {
    try {
      // Get all badges from the service
      const allBadges = await getAllUserBadges();

      // Filter out badges that aren't in the profile (these are the "locked" ones)
      const profileBadgeIds = new Set(profile?.badges.map((badge) => badge.id) || []);
      const lockedBadgesList = allBadges.filter((badge) => !profileBadgeIds.has(badge.id));

      setLockedBadges(lockedBadgesList);
      console.log(`Found ${lockedBadgesList.length} locked badges`);
    } catch (err) {
      console.error("Error fetching all badges:", err);
    }
  };

  /**
   * Manually refresh badges without fetching full profile
   */
  const refreshBadges = async () => {
    if (!profile) return;

    try {
      setSyncingBadges(true);

      // Refresh badges based on current stats
      const updatedBadges = await refreshBadgesInProfile(profile.badges);

      // Update the profile with refreshed badges
      setProfile({
        ...profile,
        badges: updatedBadges,
      });
    } catch (error) {
      console.error("Error refreshing badges:", error);
    } finally {
      setSyncingBadges(false);
    }
  };

  /**
   * Fetch the user's travel profile with updated badge sync
   */
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // First ensure badges are synced with current stats
      await syncBadgesWithStats();

      const { profile: fetchedProfile } = await getTravelProfile();
      setProfile(fetchedProfile);

      // Set last updated time if available
      if (fetchedProfile.hasOwnProperty("lastGeneratedAt")) {
        const timestamp = (fetchedProfile as any).lastGeneratedAt;
        if (timestamp) {
          const date = new Date(timestamp);
          setLastUpdated(date.toLocaleString());
        }
      }
    } catch (err) {
      console.error("Error fetching travel profile:", err);
      setError("Failed to load your travel profile");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fully refresh profile and badges
   */
  const refreshProfileAndBadges = async () => {
    try {
      setLoading(true);
      setError(null);

      // First sync badges with stats
      await syncBadgesWithStats();

      // Then fetch the updated profile
      await fetchProfile();
    } catch (err) {
      console.error("Error refreshing profile and badges:", err);
      setError("Failed to refresh your travel profile");
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  // Function to get the progress percentage for a badge
  const getBadgeProgress = (badge: TravelBadge): number => {
    if (!badge.requirements || badge.requirements.length === 0) return 0;
    const requirement = badge.requirements[0];

    // Handle case where current or value might be undefined/null
    const current = requirement.current || 0;
    const value = requirement.value || 1; // Avoid division by zero

    return Math.min(100, (current / value) * 100);
  };

  // Function to get the formatted progress text for a badge
  const getBadgeProgressText = (badge: TravelBadge): string => {
    if (!badge.requirements || badge.requirements.length === 0) return "0/0";
    const requirement = badge.requirements[0];

    // Handle case where current or value might be undefined/null
    const current = requirement.current || 0;
    const value = requirement.value || 0;

    return `${current}/${value}`;
  };

  // Helper function to format requirement type for display
  const formatRequirementType = (type: string): string => {
    switch (type) {
      case "visitCount":
        return "Places";
      case "categoryVisit":
        return "Category Visits";
      case "streak":
        return "Day Streak";
      case "distance":
        return "KM Traveled";
      case "countries":
        return "Countries";
      case "continents":
        return "Continents";
      case "explorationscore":
        return "Score";
      default:
        return type;
    }
  };

  // Split badges into completed and in-progress
  const getCompletedBadges = (): TravelBadge[] => {
    return profile?.badges.filter((badge) => badge.completed) || [];
  };

  const getInProgressBadges = (): TravelBadge[] => {
    // Get badges in progress from the profile
    const inProgressFromProfile = profile?.badges.filter((badge) => !badge.completed) || [];

    // If there are no in-progress badges, include some locked badges
    if (inProgressFromProfile.length === 0) {
      // Return all locked badges
      return lockedBadges;
    }

    // If there are only a few in-progress badges, add some locked badges
    if (inProgressFromProfile.length < 2 && lockedBadges.length > 0) {
      // Add up to 2 locked badges to ensure there's always something to work towards
      const lockedToShow = lockedBadges.slice(0, 2);
      return [...inProgressFromProfile, ...lockedToShow];
    }

    return inProgressFromProfile;
  };

  // Count completed badges
  const completedBadgesCount = getCompletedBadges().length;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Analyzing your travel data...</Text>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="cloud-offline" size={60} color={NeutralColors.gray400} />
        <Text style={styles.errorTitle}>Couldn't Load Profile</Text>
        <Text style={styles.errorText}>{error || "Something went wrong"}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Format visitation data for better display
  const formattedVisitation = {
    averageDuration:
      profile.visitation.averageDuration === "Unknown"
        ? "Still collecting data"
        : profile.visitation.averageDuration,
    averageDistance:
      profile.visitation.averageDistance === "Unknown" ||
      profile.visitation.averageDistance === "0 km"
        ? "Ready to explore"
        : profile.visitation.averageDistance,
    mostVisitedCity:
      profile.visitation.mostVisitedCity === "Unknown"
        ? "Begin your journey"
        : profile.visitation.mostVisitedCity,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Travel Profile</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshProfileAndBadges}>
          <Ionicons name="refresh" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <LinearGradient
          colors={[Colors.primary, Colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          <View style={styles.profileTypeContainer}>
            <Text style={styles.profileType}>{profile.type}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{profile.level}</Text>
            </View>
          </View>

          <Text style={styles.profileDescription}>{profile.description}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completedBadgesCount}</Text>
              <Text style={styles.statLabel}>Earned Badges</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Badges Section with Tabs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="ribbon" size={22} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Badges</Text>
            </View>
            <View style={styles.badgeTabs}>
              <TouchableOpacity
                style={[styles.badgeTab, badgesView === "earned" && styles.badgeTabActive]}
                onPress={() => setBadgesView("earned")}
              >
                <Text
                  style={[
                    styles.badgeTabText,
                    badgesView === "earned" && styles.badgeTabTextActive,
                  ]}
                >
                  Earned
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.badgeTab, badgesView === "progress" && styles.badgeTabActive]}
                onPress={() => setBadgesView("progress")}
              >
                <Text
                  style={[
                    styles.badgeTabText,
                    badgesView === "progress" && styles.badgeTabTextActive,
                  ]}
                >
                  In Progress
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Badge refresh control */}
          <TouchableOpacity
            style={styles.badgeRefreshButton}
            onPress={refreshBadges}
            disabled={isSyncingBadges}
          >
            <Ionicons
              name={isSyncingBadges ? "sync-circle" : "sync-outline"}
              size={16}
              color={isSyncingBadges ? NeutralColors.gray400 : Colors.primary}
            />
            <Text style={styles.badgeRefreshText}>
              {isSyncingBadges ? "Updating..." : "Update Badge Progress"}
            </Text>
          </TouchableOpacity>

          {/* Display either earned or in-progress badges based on selected tab */}
          {badgesView === "earned" ? (
            // EARNED BADGES
            getCompletedBadges().length > 0 ? (
              <View style={styles.badgesContainer}>
                {getCompletedBadges().map((badge, index) => (
                  <View key={index} style={styles.badgeItem}>
                    <View style={styles.badgeIconContainer}>
                      <Ionicons name={badge.icon as any} size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.badgeContent}>
                      <Text style={styles.badgeName}>{badge.name}</Text>
                      <Text style={styles.badgeDescription}>{badge.description}</Text>
                      <Text style={styles.badgeEarnedDate}>
                        Earned {badge.dateEarned.toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyBadgesContainer}>
                <Ionicons
                  name="information-circle"
                  size={24}
                  color={Colors.primary}
                  style={styles.emptyStateIcon}
                />
                <Text style={styles.emptyBadgesTitle}>No Badges Earned Yet</Text>
                <Text style={styles.emptyBadgesText}>
                  You're making progress! Switch to the "In Progress" tab to see badges you're
                  currently working toward.
                </Text>
              </View>
            )
          ) : // IN PROGRESS BADGES
          getInProgressBadges().length > 0 ? (
            <View style={styles.badgesContainer}>
              {getInProgressBadges().map((badge, index) => {
                const progress = getBadgeProgress(badge);
                const progressText = getBadgeProgressText(badge);
                const requirementType =
                  badge.requirements && badge.requirements.length > 0
                    ? formatRequirementType(badge.requirements[0].type)
                    : "";

                // Check if this is a locked badge
                const isLocked = !profile?.badges.some((b) => b.id === badge.id);

                return (
                  <View
                    key={index}
                    style={[styles.progressBadgeItem, isLocked ? styles.lockedBadgeItem : null]}
                  >
                    <View
                      style={[
                        styles.badgeIconContainer,
                        isLocked ? styles.lockedBadgeIconContainer : null,
                      ]}
                    >
                      <Ionicons
                        name={badge.icon as any}
                        size={24}
                        color={isLocked ? NeutralColors.gray500 : Colors.primary}
                      />
                      {isLocked && (
                        <View style={styles.lockIconOverlay}>
                          <Ionicons name="lock-closed" size={12} color={NeutralColors.gray600} />
                        </View>
                      )}
                    </View>
                    <View style={styles.badgeContent}>
                      <Text style={[styles.badgeName, isLocked ? styles.lockedBadgeName : null]}>
                        {badge.name}
                      </Text>
                      <Text
                        style={[
                          styles.badgeDescription,
                          isLocked ? styles.lockedBadgeDescription : null,
                        ]}
                      >
                        {badge.description}
                      </Text>

                      <View style={styles.badgeProgressContainer}>
                        <View style={styles.badgeProgressBar}>
                          <View
                            style={[
                              styles.badgeProgressFill,
                              { width: `${progress}%` },
                              isLocked ? styles.lockedBadgeProgressFill : null,
                            ]}
                          />
                        </View>
                        <View style={styles.badgeProgressTextContainer}>
                          <Text
                            style={[
                              styles.badgeProgressType,
                              isLocked ? styles.lockedBadgeText : null,
                            ]}
                          >
                            {requirementType}
                          </Text>
                          <Text
                            style={[
                              styles.badgeProgressText,
                              isLocked ? styles.lockedBadgeText : null,
                            ]}
                          >
                            {progressText}
                          </Text>
                        </View>
                      </View>

                      {isLocked && (
                        <Text style={styles.unlockInstructionText}>
                          {badge.requirements && badge.requirements[0]?.type === "categoryVisit"
                            ? `Visit ${badge.requirements[0].value} ${
                                badge.requirements[0].category || "places"
                              } to unlock`
                            : badge.requirements && badge.requirements[0]?.type === "visitCount"
                            ? `Visit ${badge.requirements[0].value} places to unlock`
                            : badge.requirements && badge.requirements[0]?.type === "streak"
                            ? `Maintain a ${badge.requirements[0].value}-day streak to unlock`
                            : badge.requirements && badge.requirements[0]?.type === "distance"
                            ? `Travel ${badge.requirements[0].value}km to unlock`
                            : "Start working on this badge to unlock it"}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyBadgesContainer}>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={Colors.success}
                style={styles.emptyStateIcon}
              />
              <Text style={styles.emptyBadgesTitle}>All Badges Completed!</Text>
              <Text style={styles.emptyBadgesText}>
                Congratulations! You've earned all available badges. Check back later for new
                challenges.
              </Text>
            </View>
          )}
        </View>

        {/* Travel Patterns Section */}
        <TouchableOpacity style={styles.section} onPress={() => toggleSection("patterns")}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="analytics" size={22} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Travel Patterns</Text>
            </View>
            <Ionicons
              name={expandedSection === "patterns" ? "chevron-up" : "chevron-down"}
              size={22}
              color={Colors.primary}
            />
          </View>

          {expandedSection === "patterns" && (
            <View style={styles.patternsContainer}>
              <View style={styles.frequencySection}>
                <Text style={styles.subsectionTitle}>Visit Frequency</Text>

                <View style={styles.frequencyItem}>
                  <View style={styles.frequencyHeader}>
                    <Text style={styles.frequencyLabel}>Preferred Day</Text>
                    <Text style={styles.frequencyValue}>
                      {profile.visitFrequency.weekdays.most}
                    </Text>
                  </View>
                  <View style={styles.frequencyBarContainer}>
                    <View
                      style={[
                        styles.frequencyBar,
                        { width: `${profile.visitFrequency.weekdays.percentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.frequencyInsight}>
                    {profile.visitFrequency.weekdays.insight}
                  </Text>
                </View>

                <View style={styles.frequencyItem}>
                  <View style={styles.frequencyHeader}>
                    <Text style={styles.frequencyLabel}>Time of Day</Text>
                    <Text style={styles.frequencyValue}>
                      {profile.visitFrequency.timeOfDay.most}
                    </Text>
                  </View>
                  <View style={styles.frequencyBarContainer}>
                    <View
                      style={[
                        styles.frequencyBar,
                        { width: `${profile.visitFrequency.timeOfDay.percentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.frequencyInsight}>
                    {profile.visitFrequency.timeOfDay.insight}
                  </Text>
                </View>

                <View style={styles.frequencyItem}>
                  <View style={styles.frequencyHeader}>
                    <Text style={styles.frequencyLabel}>Season</Text>
                    <Text style={styles.frequencyValue}>{profile.visitFrequency.season.most}</Text>
                  </View>
                  <View style={styles.frequencyBarContainer}>
                    <View
                      style={[
                        styles.frequencyBar,
                        { width: `${profile.visitFrequency.season.percentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.frequencyInsight}>
                    {profile.visitFrequency.season.insight}
                  </Text>
                </View>
              </View>

              <View style={styles.insightsContainer}>
                <Text style={styles.subsectionTitle}>Behavioral Insights</Text>

                {profile.patterns.length > 0 ? (
                  profile.patterns.map((pattern, index) => (
                    <View key={index} style={styles.insightItem}>
                      <View style={styles.insightBullet} />
                      <Text style={styles.insightText}>{pattern}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>
                    Continue exploring to reveal your travel patterns
                  </Text>
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Enhanced Visit Statistics section */}
        <Animated.View style={[styles.visitationStatsContainer, { opacity: fadeAnim }]}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="stats-chart" size={22} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Visit Statistics</Text>
              </View>
            </View>

            <View style={styles.statsCardContainer}>
              <LinearGradient
                colors={[Colors.primary, AccentColors.accent1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statsCard}
              >
                <View style={styles.statsCardIconContainer}>
                  <Ionicons name="time" size={24} color={NeutralColors.white} />
                </View>
                <Text style={styles.statsCardValue}>{formattedVisitation.averageDuration}</Text>
                <Text style={styles.statsCardLabel}>Average Duration</Text>
              </LinearGradient>

              <LinearGradient
                colors={[Colors.secondary, AccentColors.accent2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statsCard}
              >
                <View style={styles.statsCardIconContainer}>
                  <Ionicons name="map" size={24} color={NeutralColors.white} />
                </View>
                <Text style={styles.statsCardValue}>{formattedVisitation.averageDistance}</Text>
                <Text style={styles.statsCardLabel}>Average Distance</Text>
              </LinearGradient>

              <LinearGradient
                colors={[AccentColors.accent3, Colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statsCard}
              >
                <View style={styles.statsCardIconContainer}>
                  <Ionicons name="location" size={24} color={NeutralColors.white} />
                </View>
                <Text style={styles.statsCardValue}>{formattedVisitation.mostVisitedCity}</Text>
                <Text style={styles.statsCardLabel}>Top City</Text>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>

        {/* Preferences Section */}
        <TouchableOpacity style={styles.section} onPress={() => toggleSection("preferences")}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="heart" size={22} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Travel Preferences</Text>
            </View>
            <Ionicons
              name={expandedSection === "preferences" ? "chevron-up" : "chevron-down"}
              size={22}
              color={Colors.primary}
            />
          </View>

          {expandedSection === "preferences" && (
            <View style={styles.preferencesContainer}>
              <Text style={styles.subsectionTitle}>Place Categories</Text>

              {profile.preferences.categories.map((category, index) => (
                <View key={index} style={styles.preferenceItem}>
                  <View style={styles.preferenceHeader}>
                    <View style={styles.preferenceIconContainer}>
                      <Ionicons name={category.icon as any} size={18} color={Colors.primary} />
                    </View>
                    <Text style={styles.preferenceLabel}>{category.category}</Text>
                    <Text style={styles.preferencePercentage}>{category.percentage}%</Text>
                  </View>
                  <View style={styles.preferenceBarContainer}>
                    <View
                      style={[
                        styles.preferenceBar,
                        {
                          width: `${category.percentage}%`,
                          backgroundColor:
                            index % 3 === 0
                              ? Colors.primary
                              : index % 3 === 1
                              ? Colors.secondary
                              : AccentColors.accent1,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}

              <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Architectural Styles</Text>

              {profile.preferences.architecturalStyles.map((style, index) => (
                <View key={index} style={styles.preferenceItem}>
                  <View style={styles.preferenceHeader}>
                    <Text style={styles.preferenceLabel}>{style.name}</Text>
                    <Text style={styles.preferencePercentage}>{style.percentage}%</Text>
                  </View>
                  <View style={styles.preferenceBarContainer}>
                    <View
                      style={[
                        styles.preferenceBar,
                        {
                          width: `${style.percentage}%`,
                          backgroundColor:
                            index % 3 === 0
                              ? Colors.secondary
                              : index % 3 === 1
                              ? AccentColors.accent2
                              : Colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}

              <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Activities</Text>

              {profile.preferences.activities.map((activity, index) => (
                <View key={index} style={styles.preferenceItem}>
                  <View style={styles.preferenceHeader}>
                    <Text style={styles.preferenceLabel}>{activity.name}</Text>
                    <Text style={styles.preferencePercentage}>{activity.percentage}%</Text>
                  </View>
                  <View style={styles.preferenceBarContainer}>
                    <View
                      style={[
                        styles.preferenceBar,
                        {
                          width: `${activity.percentage}%`,
                          backgroundColor:
                            index % 3 === 0
                              ? AccentColors.accent3
                              : index % 3 === 1
                              ? Colors.primary
                              : Colors.secondary,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {/* Insights Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="bulb" size={22} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Personalized Insights</Text>
            </View>
          </View>

          <View style={styles.insightsListContainer}>
            {profile.recentInsights.length > 0 ? (
              profile.recentInsights.map((insight, index) => (
                <View key={index} style={styles.personalizedInsightItem}>
                  <Ionicons
                    name="sparkles"
                    size={18}
                    color={Colors.primary}
                    style={styles.insightIcon}
                  />
                  <Text style={styles.personalizedInsightText}>{insight}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyInsightsContainer}>
                <Ionicons name="bulb-outline" size={24} color={Colors.primary} />
                <Text style={styles.emptyInsightsText}>
                  Visit more places to receive personalized insights about your travel patterns
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Profile Update Information */}
        <View style={styles.profileUpdateInfoContainer}>
          <Ionicons
            name="time-outline"
            size={18}
            color={NeutralColors.gray600}
            style={{ marginRight: 8 }}
          />
          <View>
            <Text style={styles.profileUpdateInfoText}>
              Your travel profile updates automatically every 24 hours.
            </Text>
            {lastUpdated && (
              <Text style={styles.profileLastUpdatedText}>Last updated: {lastUpdated}</Text>
            )}
            <Text style={styles.profileRefreshText}>
              Come back tomorrow to see how your travel patterns evolve!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.gray100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray200,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  refreshButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    padding: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  profileType: {
    fontSize: 24,
    fontWeight: "800",
    color: NeutralColors.white,
  },
  levelBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  levelText: {
    fontSize: 14,
    fontWeight: "600",
    color: NeutralColors.white,
  },
  profileDescription: {
    fontSize: 16,
    color: NeutralColors.white,
    opacity: 0.95,
    marginBottom: 20,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: NeutralColors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
  },
  section: {
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginLeft: 8,
  },

  // Badge tabs
  badgeTabs: {
    flexDirection: "row",
    borderRadius: 8,
    backgroundColor: NeutralColors.gray200,
    overflow: "hidden",
  },
  badgeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeTabActive: {
    backgroundColor: Colors.primary,
  },
  badgeTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: NeutralColors.gray600,
  },
  badgeTabTextActive: {
    color: NeutralColors.white,
  },
  badgeRefreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: NeutralColors.gray200,
    borderRadius: 16,
    alignSelf: "center",
  },
  badgeRefreshText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: "500",
  },

  // Badge containers
  badgesContainer: {
    marginTop: 16,
  },
  badgeItem: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: NeutralColors.gray100,
    padding: 12,
    borderRadius: 12,
  },
  progressBadgeItem: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: NeutralColors.gray100,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  lockedBadgeItem: {
    borderLeftColor: NeutralColors.gray500,
    backgroundColor: NeutralColors.gray100,
  },
  badgeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NeutralColors.gray200,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  lockedBadgeIconContainer: {
    backgroundColor: NeutralColors.gray200,
  },
  lockIconOverlay: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 10,
    padding: 2,
  },
  badgeContent: {
    flex: 1,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  badgeDescription: {
    fontSize: 13,
    color: NeutralColors.gray600,
    marginBottom: 6,
  },
  badgeEarnedDate: {
    fontSize: 12,
    color: Colors.success,
    fontStyle: "italic",
  },

  // Badge progress styles
  badgeProgressContainer: {
    marginTop: 6,
  },
  badgeProgressBar: {
    height: 6,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 3,
    overflow: "hidden",
  },
  badgeProgressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  badgeProgressTextContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  badgeProgressText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  badgeProgressType: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  lockedBadgeName: {
    color: NeutralColors.gray600,
  },
  lockedBadgeDescription: {
    color: NeutralColors.gray500,
  },
  lockedBadgeText: {
    color: NeutralColors.gray500,
  },
  lockedBadgeProgressFill: {
    backgroundColor: NeutralColors.gray500,
  },
  unlockInstructionText: {
    fontSize: 12,
    fontStyle: "italic",
    color: NeutralColors.gray600,
    marginTop: 6,
  },

  // Empty states
  emptyBadgesContainer: {
    padding: 16,
    backgroundColor: NeutralColors.gray100,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  emptyStateIcon: {
    marginBottom: 8,
  },
  emptyBadgesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyBadgesText: {
    fontSize: 14,
    color: NeutralColors.gray700,
    textAlign: "center",
    lineHeight: 20,
  },

  // Pattern section styles
  patternsContainer: {
    marginTop: 16,
  },
  frequencySection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: NeutralColors.gray800,
    marginBottom: 12,
  },
  frequencyItem: {
    marginBottom: 12,
  },
  frequencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  frequencyLabel: {
    fontSize: 14,
    color: NeutralColors.gray700,
  },
  frequencyValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  frequencyBarContainer: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    marginBottom: 6,
  },
  frequencyBar: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  frequencyInsight: {
    fontSize: 12,
    fontStyle: "italic",
    color: NeutralColors.gray600,
  },

  // Enhanced Visit Statistics section
  visitationStatsContainer: {
    marginBottom: 0,
    marginTop: 0,
  },
  statsCardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  statsCard: {
    width: cardWidth,
    height: 130,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statsCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statsCardValue: {
    fontSize: 14,
    fontWeight: "700",
    color: NeutralColors.white,
    textAlign: "center",
    marginVertical: 4,
    padding: 2,
  },
  statsCardLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },

  insightsContainer: {
    marginBottom: 8,
  },
  insightItem: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-start",
  },
  insightBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
    marginRight: 10,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: NeutralColors.gray700,
    lineHeight: 20,
  },

  // Preferences section
  preferencesContainer: {
    marginTop: 16,
  },
  preferenceItem: {
    marginBottom: 12,
  },
  preferenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  preferenceIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NeutralColors.gray200,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  preferenceLabel: {
    flex: 1,
    fontSize: 14,
    color: NeutralColors.gray700,
  },
  preferencePercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  preferenceBarContainer: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
  },
  preferenceBar: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },

  // Insights list
  insightsListContainer: {
    marginTop: 12,
  },
  personalizedInsightItem: {
    flexDirection: "row",
    backgroundColor: NeutralColors.gray100,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  insightIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  personalizedInsightText: {
    flex: 1,
    fontSize: 14,
    color: NeutralColors.gray700,
    lineHeight: 20,
  },

  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: NeutralColors.gray100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: NeutralColors.gray600,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: NeutralColors.gray100,
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NeutralColors.gray900,
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: NeutralColors.gray600,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: NeutralColors.white,
    fontWeight: "600",
    fontSize: 16,
  },

  // Other states
  noDataText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    fontStyle: "italic",
    textAlign: "center",
    padding: 12,
  },
  emptyInsightsContainer: {
    padding: 16,
    alignItems: "center",
    backgroundColor: NeutralColors.gray100,
    borderRadius: 12,
  },
  emptyInsightsText: {
    marginTop: 8,
    fontSize: 14,
    color: NeutralColors.gray700,
    textAlign: "center",
    lineHeight: 20,
  },
  profileUpdateInfoContainer: {
    flexDirection: "row",
    backgroundColor: NeutralColors.gray100,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    alignItems: "flex-start",
  },
  profileUpdateInfoText: {
    fontSize: 14,
    color: NeutralColors.gray700,
    flex: 1,
    lineHeight: 20,
  },
  profileLastUpdatedText: {
    fontSize: 12,
    color: NeutralColors.gray600,
    fontStyle: "italic",
    marginTop: 4,
  },
  profileRefreshText: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 8,
  },
});

export default TravelProfileScreen;
