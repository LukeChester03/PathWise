import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { TravelProfile, TravelBadge } from "../../types/LearnScreen/TravelProfileTypes";
import { Colors, NeutralColors, AccentColors } from "../../constants/colours";
import { getAllUserBadges } from "../../services/LearnScreen/badgeService";

interface TravelTimelineComponentProps {
  profile: TravelProfile | null;
}

const TravelTimelineComponent: React.FC<TravelTimelineComponentProps> = ({ profile }) => {
  const [badges, setBadges] = useState<TravelBadge[]>([]);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const fetchedBadges = await getAllUserBadges();
        setBadges(fetchedBadges);
      } catch (error) {
        console.error("Error fetching badges in TravelTimelineComponent:", error);
      }
    };

    fetchBadges();
  }, []);

  if (!profile) return null;

  // If we have first visit date, create a timeline
  if (!profile.firstVisitDate) return null;

  const firstVisitDate = new Date(profile.firstVisitDate);
  const now = new Date();
  const daysSinceFirstVisit = Math.floor(
    (now.getTime() - firstVisitDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceFirstVisit < 1) return null;

  const completedBadges = badges.filter((b) => b.completed);
  const completedBadgesCount = completedBadges.length;

  return (
    <View style={styles.timelineContainer}>
      <Text style={styles.subsectionTitle}>Your Travel Journey</Text>

      <View style={styles.timelineContent}>
        <View style={styles.timelineLine} />

        <View style={styles.timelineEvent}>
          <View style={[styles.timelineDot, { backgroundColor: Colors.primary }]} />
          <View style={styles.timelineTextContainer}>
            <Text style={styles.timelineDate}>{firstVisitDate.toLocaleDateString()}</Text>
            <Text style={styles.timelineText}>First Place Visited</Text>
          </View>
        </View>

        {completedBadgesCount > 0 && (
          <View style={styles.timelineEvent}>
            <View style={[styles.timelineDot, { backgroundColor: Colors.secondary }]} />
            <View style={styles.timelineTextContainer}>
              <Text style={styles.timelineText}>
                First Badge Earned: {completedBadges[0]?.name || "Achievement"}
              </Text>
              <Text style={styles.timelineDate}>
                {completedBadges[0]?.dateEarned
                  ? new Date(completedBadges[0].dateEarned).toLocaleDateString()
                  : ""}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.timelineEvent}>
          <View style={[styles.timelineDot, { backgroundColor: AccentColors.accent1 }]} />
          <View style={styles.timelineTextContainer}>
            <Text style={styles.timelineDate}>{now.toLocaleDateString()}</Text>
            <Text style={styles.timelineText}>{daysSinceFirstVisit} days of exploration</Text>
            {completedBadgesCount > 0 && (
              <Text style={styles.timelineSubtext}>
                {completedBadgesCount} badge{completedBadgesCount !== 1 ? "s" : ""} earned
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timelineContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: NeutralColors.gray800,
    marginBottom: 12,
  },
  timelineContent: {
    position: "relative",
    paddingLeft: 24,
    marginTop: 16,
  },
  timelineLine: {
    position: "absolute",
    left: 8,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: NeutralColors.gray300,
  },
  timelineEvent: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "flex-start",
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: "absolute",
    left: -8,
    top: 4,
    borderWidth: 2,
    borderColor: NeutralColors.white,
  },
  timelineTextContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    flex: 1,
  },
  timelineDate: {
    fontSize: 12,
    color: NeutralColors.gray500,
    marginBottom: 4,
  },
  timelineText: {
    fontSize: 14,
    color: Colors.text,
  },
  timelineSubtext: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginTop: 4,
  },
});

export default TravelTimelineComponent;
