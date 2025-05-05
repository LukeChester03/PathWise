import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, NeutralColors } from "../../constants/colours";

interface ProfileHeaderProps {
  profileType: string;
  profileLevel: string;
  description: string;
  badgeCount: number;
  streak: number;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profileType,
  profileLevel,
  description,
  badgeCount,
  streak,
}) => {
  return (
    <LinearGradient
      colors={[Colors.primary, Colors.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.profileHeader}
    >
      <View style={styles.profileTypeContainer}>
        <Text style={styles.profileType}>{profileType}</Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{profileLevel}</Text>
        </View>
      </View>

      <Text style={styles.profileDescription}>{description}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{badgeCount}</Text>
          <Text style={styles.statLabel}>Earned Badges</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
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
});

export default ProfileHeader;
