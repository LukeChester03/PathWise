// components/LearnScreen/TravelMilestonesComponent.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  TravelProfile,
  TravelMilestone,
  TravelBadge,
} from "../../../types/LearnScreen/TravelProfileTypes";
import { Colors, NeutralColors, AccentColors } from "../../../constants/colours";
import { getAllUserBadges } from "../../../services/LearnScreen/badgeService";
import { fetchUserVisitedPlaces } from "../../../services/LearnScreen/travelProfileService";
import GradientCard from "../../Global/GradientCard";

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
          <GradientCard
            key={index}
            gradientColors={gradientColors[index % gradientColors.length]}
            icon={milestone.icon}
            value={milestone.value}
            title={milestone.title}
            description={milestone.description}
          />
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
});

export default TravelMilestonesComponent;
