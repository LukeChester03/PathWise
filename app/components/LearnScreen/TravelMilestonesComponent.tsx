import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  TravelProfile,
  TravelMilestone,
  TravelBadge,
} from "../../types/LearnScreen/TravelProfileTypes";
import { Colors, NeutralColors } from "../../constants/colours";
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

  // Generate milestones or use existing ones
  const milestones = profile?.travelMilestones || generateMilestones();

  if (milestones.length === 0) {
    return null;
  }

  return (
    <View style={styles.milestonesContainer}>
      <Text style={styles.subsectionTitle}>Travel Milestones</Text>

      <View style={styles.milestonesGrid}>
        {milestones.map((milestone, index) => (
          <View key={index} style={styles.milestoneCard}>
            <View style={styles.milestoneIconContainer}>
              <Ionicons name={milestone.icon as any} size={22} color={Colors.primary} />
            </View>
            <Text style={styles.milestoneValue}>{milestone.value}</Text>
            <Text style={styles.milestoneTitle}>{milestone.title}</Text>
            {milestone.description && (
              <Text style={styles.milestoneDescription}>{milestone.description}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  milestonesContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: NeutralColors.gray800,
    marginBottom: 12,
  },
  milestonesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
  },
  milestoneCard: {
    width: "48%",
    backgroundColor: NeutralColors.gray100,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  milestoneIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + "20", // 20% opacity
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  milestoneValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  milestoneTitle: {
    fontSize: 14,
    color: NeutralColors.gray700,
    marginBottom: 4,
  },
  milestoneDescription: {
    fontSize: 12,
    color: NeutralColors.gray600,
    textAlign: "center",
  },
});

export default TravelMilestonesComponent;
