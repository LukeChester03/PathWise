import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { TravelProfile, TravelBadge, TravelerTrait } from "../types/LearnScreen/TravelProfileTypes";
import { getTravelProfile } from "../services/LearnScreen/travelProfileService";
import { getAllUserBadges } from "../services/LearnScreen/badgeService";
import { Colors, NeutralColors, AccentColors } from "../constants/colours";

// Import components
import TravelerTraitsComponent from "../components/LearnScreen/TravelSnapshotSection/TravelerTraitsComponent";
import TravelMilestonesComponent from "../components/LearnScreen/TravelSnapshotSection/TravelMilestonesComponent";
import TravelTimelineComponent from "../components/LearnScreen/TravelSnapshotSection/TravelTimelineComponent";
import VisitStatsCardsComponent from "../components/LearnScreen/TravelSnapshotSection/VisitStatsCardComponent";
import ProfileHeader from "../components/LearnScreen/ProfileHeader";
import SectionHeader from "../components/LearnScreen/SectionHeader";
import BadgesSection from "../components/LearnScreen/BadgesSection";
import TravelPatternsSection from "../components/LearnScreen/TravelSnapshotSection/TravelPatternsSection";
import PreferencesSection from "../components/LearnScreen/TravelSnapshotSection/PreferencesSection";
import InsightsSection from "../components/LearnScreen/TravelSnapshotSection/InsightsSection";
import Header from "../components/Global/Header";

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

const TravelProfileScreen: React.FC<TravelProfileScreenProps> = ({ route, navigation }) => {
  // State management
  const [profile, setProfile] = useState<TravelProfile | null>(route.params?.profile || null);
  const [loading, setLoading] = useState<boolean>(!route.params?.profile);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("preferences");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [badgesView, setBadgesView] = useState<"earned" | "progress">("earned");
  const [badges, setBadges] = useState<TravelBadge[]>([]);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-20));

  // Helper function to generate default traveler traits
  const generateDefaultTraits = (): TravelerTrait[] => {
    return [
      {
        id: "explorer",
        title: "Explorer",
        description: "You enjoy discovering new places and expanding your travel horizons.",
        icon: "compass",
        color: Colors.primary,
      },
      {
        id: "cultural-explorer",
        title: "Cultural Explorer",
        description: "You seek to understand the local culture and traditions in places you visit.",
        icon: "color-palette",
        color: Colors.secondary,
      },
      {
        id: "planner",
        title: "Thoughtful Planner",
        description: "You like to research and plan your visits with attention to detail.",
        icon: "calendar",
        color: AccentColors.accent1,
      },
    ];
  };

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    } else {
      // Process profile data
      processProfileData();

      // Fetch badges for this user
      fetchAllBadges();

      // Start animations
      startAnimations();
    }
  }, [profile]);

  const processProfileData = () => {
    // Generate default traits if they don't exist
    if (!profile?.travelerTraits) {
      setProfile((prevProfile) => ({
        ...prevProfile!,
        travelerTraits: generateDefaultTraits(),
      }));
    }

    // Format the last updated timestamp
    if (profile?.hasOwnProperty("lastGeneratedAt")) {
      const timestamp = (profile as any).lastGeneratedAt;
      if (timestamp) {
        const date = new Date(timestamp);
        setLastUpdated(date.toLocaleString());
      }
    }
  };

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchAllBadges = async () => {
    try {
      // Get all badges from the service
      const allBadges = await getAllUserBadges();
      setBadges(allBadges);
    } catch (err) {
      console.error("Error fetching all badges:", err);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { profile: fetchedProfile } = await getTravelProfile();

      // Ensure traveler traits exist
      if (!fetchedProfile.travelerTraits || fetchedProfile.travelerTraits.length === 0) {
        fetchedProfile.travelerTraits = generateDefaultTraits();
      }

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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Helper functions for badge handling
  const getCompletedBadges = (): TravelBadge[] => {
    return badges.filter((badge) => badge.completed);
  };

  const getInProgressBadges = (): TravelBadge[] => {
    // Get badges in progress
    const inProgressBadges = badges.filter((badge) => !badge.completed);

    // Limit in-progress badges to prevent overwhelming display
    return inProgressBadges.slice(0, 4);
  };

  // Format visitation data
  const formatVisitationData = () => {
    return {
      averageDuration:
        profile?.visitation.averageDuration === "Unknown"
          ? "Still collecting data"
          : profile?.visitation.averageDuration,
      averageDistance:
        profile?.visitation.averageDistance === "Unknown" ||
        profile?.visitation.averageDistance === "0 km"
          ? "Ready to explore"
          : profile?.visitation.averageDistance,
      mostVisitedCity:
        profile?.visitation.mostVisitedCity === "Unknown"
          ? "Begin your journey"
          : profile?.visitation.mostVisitedCity,
    };
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Analyzing your travel data...</Text>
      </SafeAreaView>
    );
  }

  // Render error state
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

  // Ensure traveler traits exist
  const travelerTraits = profile.travelerTraits || generateDefaultTraits();

  // Badge counts
  const completedBadgesCount = getCompletedBadges().length;

  // Format visitation data
  const formattedVisitation = formatVisitationData();

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <Header
        title="Travel Snapshot"
        subtitle="Your travel characteristics"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        showIcon={true}
        iconName="analytics-outline"
        iconColor={Colors.primary}
        showHelp={false}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header Component */}
        <ProfileHeader
          profileType={profile.type}
          profileLevel={profile.level}
          description={profile.description}
          badgeCount={completedBadgesCount}
          streak={profile.streak}
        />

        {/* Traveler Traits Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <SectionHeader title="Traveler Traits" icon="person" color={Colors.primary} />
          <TravelerTraitsComponent traits={travelerTraits} />
        </Animated.View>

        {/* Enhanced Visit Statistics section */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          {/* Travel Milestones */}
          <TravelMilestonesComponent profile={profile} />
        </Animated.View>

        {/* Travel Timeline */}
        <View style={styles.section}>
          <TravelTimelineComponent profile={profile} />
        </View>

        {/* Badges Section */}
        <BadgesSection
          completedBadges={getCompletedBadges()}
          inProgressBadges={getInProgressBadges()}
          badgesView={badgesView}
          setBadgesView={setBadgesView}
          profile={profile}
        />

        {/* Travel Patterns Section */}
        <TravelPatternsSection
          profile={profile}
          expanded={expandedSection === "patterns"}
          toggleExpanded={() => toggleSection("patterns")}
        />

        {/* Preferences Section */}
        <PreferencesSection
          profile={profile}
          expanded={expandedSection === "preferences"}
          toggleExpanded={() => toggleSection("preferences")}
        />

        {/* Insights Section */}
        <InsightsSection recentInsights={profile.recentInsights} />

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
    </View>
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
