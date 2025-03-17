// components/TravelMilestonesComponent.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TravelProfile, TravelMilestone } from "../../types/LearnScreen/TravelProfileTypes";
import { Colors, NeutralColors } from "../../constants/colours";

interface TravelMilestonesComponentProps {
  profile: TravelProfile | null;
}

const TravelMilestonesComponent: React.FC<TravelMilestonesComponentProps> = ({ profile }) => {
  if (!profile) return null;

  // If no milestones are available, generate some based on profile data
  const generateDefaultMilestones = (): TravelMilestone[] => {
    const milestones: TravelMilestone[] = [];

    // Places visited milestone
    const completedBadgeCount = profile.badges.filter((b) => b.completed).length;

    milestones.push({
      title: "Badges Earned",
      value: completedBadgeCount,
      icon: "ribbon",
      description:
        completedBadgeCount > 0
          ? "You've earned your first badges!"
          : "Start exploring to earn badges",
    });

    // Streak milestone
    milestones.push({
      title: "Current Streak",
      value: profile.streak,
      icon: "flame",
      description:
        profile.streak > 0
          ? `You've been exploring for ${profile.streak} consecutive days`
          : "Visit places regularly to build a streak",
    });

    // Top category
    const topCategory = profile.preferences.categories[0]?.category || "Places";
    milestones.push({
      title: "Favorite Category",
      value: topCategory,
      icon: "heart",
      description: `You show a strong preference for ${topCategory.toLowerCase()}`,
    });

    return milestones;
  };

  const milestones = profile.travelMilestones || generateDefaultMilestones();

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
