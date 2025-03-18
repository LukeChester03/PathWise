import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { TravelProfile, TravelBadge } from "../../types/LearnScreen/TravelProfileTypes";
import { Colors, NeutralColors, AccentColors } from "../../constants/colours";
import { getAllUserBadges } from "../../services/LearnScreen/badgeService";

interface TravelTimelineComponentProps {
  profile: TravelProfile | null;
}

const TravelTimelineComponent: React.FC<TravelTimelineComponentProps> = ({ profile }) => {
  const [badges, setBadges] = useState<TravelBadge[]>([]);
  const [expanded, setExpanded] = useState<boolean>(true);

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

  if (!profile) {
    console.log("TravelTimelineComponent: No profile available");
    return null;
  }

  // Log the firstVisitDate to help diagnose issues
  console.log(`TravelTimelineComponent: firstVisitDate from profile: ${profile.firstVisitDate}`);

  if (!profile.firstVisitDate) {
    console.log("TravelTimelineComponent: No firstVisitDate in profile");
    return null;
  }

  const firstVisitDate = new Date(profile.firstVisitDate);
  // Validate the date is valid
  if (isNaN(firstVisitDate.getTime())) {
    console.log(`TravelTimelineComponent: Invalid firstVisitDate: ${profile.firstVisitDate}`);
    return null;
  }

  const now = new Date();
  const daysSinceFirstVisit = Math.floor(
    (now.getTime() - firstVisitDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Log for diagnostic purposes
  console.log(`TravelTimelineComponent: Days since first visit: ${daysSinceFirstVisit}`);

  // Only hide component if days since first visit is negative
  if (daysSinceFirstVisit < 0) {
    console.log("TravelTimelineComponent: First visit date is in the future");
    return null;
  }

  const completedBadges = badges.filter((b) => b.completed);
  const completedBadgesCount = completedBadges.length;

  const formatDate = (date: Date) => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
        year: "numeric",
      };
      return date.toLocaleDateString(undefined, options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  return (
    <View style={styles.timelineContainer}>
      <TouchableOpacity
        style={styles.headerContainer}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.subsectionTitle}>Your Travel Journey</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.timelineContent}>
          <View style={styles.timelineLine} />

          <View style={styles.timelineEvent}>
            <View style={styles.dotContainer}>
              <View style={[styles.timelineDot, styles.primaryDot]} />
            </View>
            <View style={[styles.timelineTextContainer, styles.firstVisitCard]}>
              <Text style={styles.timelineHeading}>First Place Visited</Text>
              <Text style={styles.timelineDate}>{formatDate(firstVisitDate)}</Text>
              <Text style={styles.timelineText}>
                Your journey began {daysSinceFirstVisit} days ago
              </Text>
            </View>
          </View>

          {completedBadgesCount > 0 && (
            <View style={styles.timelineEvent}>
              <View style={styles.dotContainer}>
                <View style={[styles.timelineDot, styles.secondaryDot]} />
              </View>
              <View style={[styles.timelineTextContainer, styles.badgeCard]}>
                <Text style={styles.timelineHeading}>First Achievement</Text>
                {completedBadges[0]?.dateEarned && (
                  <Text style={styles.timelineDate}>
                    {formatDate(new Date(completedBadges[0].dateEarned))}
                  </Text>
                )}
                <Text style={styles.timelineText}>
                  {completedBadges[0]?.name || "Achievement"} earned
                </Text>
              </View>
            </View>
          )}

          <View style={styles.timelineEvent}>
            <View style={styles.dotContainer}>
              <View style={[styles.timelineDot, styles.accentDot]} />
            </View>
            <View style={[styles.timelineTextContainer, styles.currentCard]}>
              <Text style={styles.timelineHeading}>Current Journey</Text>
              <Text style={styles.timelineDate}>{formatDate(now)}</Text>
              <Text style={styles.timelineText}>{daysSinceFirstVisit} days of exploration</Text>
              {completedBadgesCount > 0 && (
                <View style={styles.badgeCounter}>
                  <Text style={styles.timelineSubtext}>
                    {completedBadgesCount} badge{completedBadgesCount !== 1 ? "s" : ""} earned
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  timelineContainer: {
    marginVertical: 16,
    backgroundColor: NeutralColors.white,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: NeutralColors.gray200,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray200,
    backgroundColor: NeutralColors.white,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: NeutralColors.gray800,
  },
  expandCollapseText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
  },
  timelineContent: {
    position: "relative",
    paddingLeft: 24,
    paddingVertical: 16,
    paddingRight: 16,
    backgroundColor: NeutralColors.white,
  },
  timelineLine: {
    position: "absolute",
    left: 8,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: NeutralColors.gray300,
  },
  timelineEvent: {
    flexDirection: "row",
    marginBottom: 24,
    alignItems: "flex-start",
  },
  dotContainer: {
    marginRight: 12,
    zIndex: 1,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: NeutralColors.white,
    position: "relative",
    left: -8,
  },
  primaryDot: {
    backgroundColor: Colors.primary,
  },
  secondaryDot: {
    backgroundColor: Colors.secondary,
  },
  accentDot: {
    backgroundColor: AccentColors.accent1,
  },
  timelineTextContainer: {
    padding: 16,
    backgroundColor: NeutralColors.white,
    borderRadius: 10,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: NeutralColors.gray200,
  },
  firstVisitCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  badgeCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  currentCard: {
    borderLeftWidth: 3,
    borderLeftColor: AccentColors.accent1,
  },
  timelineHeading: {
    fontSize: 16,
    fontWeight: "600",
    color: NeutralColors.gray800,
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: NeutralColors.gray500,
    marginBottom: 6,
  },
  timelineText: {
    fontSize: 14,
    color: Colors.text,
  },
  timelineSubtext: {
    fontSize: 13,
    color: NeutralColors.gray700,
  },
  badgeCounter: {
    marginTop: 8,
    backgroundColor: NeutralColors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: NeutralColors.gray200,
  },
});

export default TravelTimelineComponent;
