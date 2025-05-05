import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TravelBadge } from "../../../types/LearnScreen/TravelProfileTypes";

interface BadgeItemProps {
  badge: TravelBadge;
}

const BadgeItem: React.FC<BadgeItemProps> = ({ badge }) => {
  return (
    <View style={styles.badgeItem}>
      <View
        style={[
          styles.badgeIconContainer,
          badge.completed ? styles.completedBadge : styles.incompleteBadge,
        ]}
      >
        <Ionicons
          name={badge.icon as any}
          size={28}
          color={badge.completed ? "#6366F1" : "#9CA3AF"}
        />
      </View>
      <Text style={styles.badgeName}>{badge.name}</Text>
      <Text style={styles.badgeDescription}>{badge.description}</Text>
      {!badge.completed && badge.requirements.length > 0 && (
        <View style={styles.badgeProgressContainer}>
          <View style={styles.badgeProgressBar}>
            <View
              style={[
                styles.badgeProgressFill,
                {
                  width: `${Math.min(
                    100,
                    (badge.requirements[0].current / badge.requirements[0].value) * 100
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.badgeProgressText}>
            {badge.requirements[0].current}/{badge.requirements[0].value}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badgeItem: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  completedBadge: {
    backgroundColor: "#EEF2FF",
    borderWidth: 2,
    borderColor: "#C7D2FE",
  },
  incompleteBadge: {
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  badgeName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
    textAlign: "center",
  },
  badgeDescription: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
  },
  badgeProgressContainer: {
    width: "100%",
    marginTop: 8,
  },
  badgeProgressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  badgeProgressFill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 3,
  },
  badgeProgressText: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "right",
  },
});

export default BadgeItem;
