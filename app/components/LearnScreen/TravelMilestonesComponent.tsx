import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  TravelProfile,
  TravelMilestone,
  TravelBadge,
} from "../../types/LearnScreen/TravelProfileTypes";
import { Colors, NeutralColors, AccentColors } from "../../constants/colours";
import { getAllUserBadges } from "../../services/LearnScreen/badgeService";
import { fetchUserVisitedPlaces } from "../../services/LearnScreen/travelProfileService";

interface TravelMilestonesComponentProps {
  profile: TravelProfile | null;
}

const TravelMilestonesComponent: React.FC<TravelMilestonesComponentProps> = ({ profile }) => {
  const [badges, setBadges] = useState<TravelBadge[]>([]);
  const [visitedPlacesCount, setVisitedPlacesCount] = useState<number>(0);

  useEffect(() => {
    const fetchMilestoneData = async () => {
      try {
        // Fetch badges
        const fetchedBadges = await getAllUserBadges();
        setBadges(fetchedBadges);

        // Fetch visited places
        const visitedPlaces = await fetchUserVisitedPlaces();
        setVisitedPlacesCount(visitedPlaces.length);
      } catch (error) {
        console.error("Error fetching milestone data:", error);
      }
    };

    fetchMilestoneData();
  }, []);

  // Generate milestones based on available data
  const generateMilestones = (): TravelMilestone[] => {
    if (!profile) return [];

    const milestones: TravelMilestone[] = [];

    // Badges Milestone
    const completedBadgesCount = badges.filter((b) => b.completed).length;
    milestones.push({
      title: "Badges Earned",
      value: completedBadgesCount.toString(),
      icon: "ribbon",
      description:
        completedBadgesCount > 0
          ? `Congratulations on earning ${completedBadgesCount} badge${
              completedBadgesCount !== 1 ? "s" : ""
            }!`
          : "Your journey to earning badges begins now",
    });

    // Places Visited Milestone
    milestones.push({
      title: "Places Explored",
      value: visitedPlacesCount.toString(),
      icon: "map",
      description:
        visitedPlacesCount > 0
          ? `You've discovered ${visitedPlacesCount} unique location${
              visitedPlacesCount !== 1 ? "s" : ""
            }`
          : "Start exploring to track your visited places",
    });

    // Streak Milestone
    milestones.push({
      title: "Exploration Streak",
      value: profile.streak.toString(),
      icon: "flame",
      description:
        profile.streak > 0
          ? `Consistent explorer with a ${profile.streak}-day streak`
          : "Keep exploring to build your travel streak",
    });

    // Exploration Score Milestone
    const explorationScore = profile.explorationScore || 0;
    milestones.push({
      title: "Exploration Score",
      value: explorationScore.toString(),
      icon: "trophy",
      description:
        explorationScore > 0
          ? `Your travel curiosity is shining at ${explorationScore} points`
          : "Explore more to boost your travel score",
    });

    return milestones;
  };

  // Color pairs for gradient backgrounds
  const gradientColors = [
    [Colors.primary, AccentColors.accent1],
    [AccentColors.accent2, AccentColors.accent3 || "#4CAF50"],
    [Colors.secondary, AccentColors.accent4 || "#9C27B0"],
    [AccentColors.accent1, Colors.primary],
  ];

  // Generate milestones or use existing ones
  const milestones = profile?.travelMilestones || generateMilestones();

  if (milestones.length === 0) {
    return null;
  }

  return (
    <View style={styles.milestonesContainer}>
      <View style={styles.titleContainer}>
        <Ionicons name="trophy-outline" size={22} color={Colors.primary} style={styles.titleIcon} />
        <Text style={styles.subsectionTitle}>Travel Milestones</Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {milestones.map((milestone, index) => (
          <LinearGradient
            key={index}
            colors={gradientColors[index % gradientColors.length]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.milestoneCard}
          >
            <View style={styles.cardContent}>
              <View style={styles.iconValueContainer}>
                <View style={styles.milestoneIconContainer}>
                  <Ionicons name={milestone.icon as any} size={24} color="white" />
                </View>
                <Text style={styles.milestoneValue}>{milestone.value}</Text>
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                {milestone.description && (
                  <Text style={styles.milestoneDescription}>{milestone.description}</Text>
                )}
              </View>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  milestonesContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  titleIcon: {
    marginRight: 8,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NeutralColors.gray800,
  },
  scrollContainer: {
    maxHeight: 380,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  milestoneCard: {
    borderRadius: 16,
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    padding: 16,
  },
  iconValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  milestoneIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    marginLeft: 62, // Aligns with the icon
  },
  milestoneValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    marginBottom: 6,
  },
  milestoneDescription: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 20,
  },
});

export default TravelMilestonesComponent;
