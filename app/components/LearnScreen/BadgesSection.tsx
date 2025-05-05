import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TravelBadge, TravelProfile } from "../../types/LearnScreen/TravelProfileTypes";
import { Colors, NeutralColors } from "../../constants/colours";
import SectionHeader from "./SectionHeader";

interface BadgesSectionProps {
  completedBadges: TravelBadge[];
  inProgressBadges: TravelBadge[];
  badgesView: "earned" | "progress";
  setBadgesView: (view: "earned" | "progress") => void;
  profile: TravelProfile;
}

const BadgesSection: React.FC<BadgesSectionProps> = ({
  completedBadges,
  inProgressBadges,
  badgesView,
  setBadgesView,
  profile,
}) => {
  const getBadgeProgress = (badge: TravelBadge): number => {
    if (!badge.requirements || badge.requirements.length === 0) return 0;
    const requirement = badge.requirements[0];
    const current = requirement.current || 0;
    const value = requirement.value || 1;
    return Math.min(100, (current / value) * 100);
  };

  const getBadgeProgressText = (badge: TravelBadge): string => {
    if (!badge.requirements || badge.requirements.length === 0) return "0/0";
    const requirement = badge.requirements[0];
    const current = requirement.current || 0;
    const value = requirement.value || 0;
    return `${current}/${value}`;
  };

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

  const BadgeTabs = () => (
    <View style={styles.badgeTabs}>
      <TouchableOpacity
        style={[styles.badgeTab, badgesView === "earned" && styles.badgeTabActive]}
        onPress={() => setBadgesView("earned")}
      >
        <Text style={[styles.badgeTabText, badgesView === "earned" && styles.badgeTabTextActive]}>
          Earned
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.badgeTab, badgesView === "progress" && styles.badgeTabActive]}
        onPress={() => setBadgesView("progress")}
      >
        <Text style={[styles.badgeTabText, badgesView === "progress" && styles.badgeTabTextActive]}>
          In Progress
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Badges"
        icon="ribbon"
        color={Colors.primary}
        rightElement={<BadgeTabs />}
      />

      <View style={styles.badgeUpdateInfo}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
        <Text style={styles.badgeUpdateText}>Badges update automatically every 24 hours</Text>
      </View>

      {badgesView === "earned" ? (
        completedBadges.length > 0 ? (
          <View style={styles.badgesContainer}>
            {completedBadges.map((badge, index) => (
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
              You're making progress! Switch to the "In Progress" tab to see badges you're currently
              working toward.
            </Text>
          </View>
        )
      ) : inProgressBadges.length > 0 ? (
        <View style={styles.badgesContainer}>
          {inProgressBadges.map((badge, index) => {
            const progress = getBadgeProgress(badge);
            const progressText = getBadgeProgressText(badge);
            const requirementType =
              badge.requirements && badge.requirements.length > 0
                ? formatRequirementType(badge.requirements[0].type)
                : "";

            return (
              <View key={index} style={styles.progressBadgeItem}>
                <View style={styles.badgeIconContainer}>
                  <Ionicons name={badge.icon as any} size={24} color={Colors.primary} />
                </View>
                <View style={styles.badgeContent}>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>

                  <View style={styles.badgeProgressContainer}>
                    <View style={styles.badgeProgressBar}>
                      <View style={[styles.badgeProgressFill, { width: `${progress}%` }]} />
                    </View>
                    <View style={styles.badgeProgressTextContainer}>
                      <Text style={styles.badgeProgressType}>{requirementType}</Text>
                      <Text style={styles.badgeProgressText}>{progressText}</Text>
                    </View>
                  </View>
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
  );
};

const styles = StyleSheet.create({
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
  badgeUpdateInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  badgeUpdateText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
    fontStyle: "italic",
  },
  badgesContainer: {
    marginTop: 8,
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
});

export default BadgesSection;
