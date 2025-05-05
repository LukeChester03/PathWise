import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TravelProfile, TravelBadge } from "../../../types/LearnScreen/TravelProfileTypes";
import { Colors, NeutralColors, AccentColors } from "../../../constants/colours";
import { getAllUserBadges } from "../../../services/LearnScreen/badgeService";
import GradientCard from "../../Global/GradientCard";

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

  if (!profile.firstVisitDate) {
    console.log("TravelTimelineComponent: No firstVisitDate in profile");
    return null;
  }

  const firstVisitDate = new Date(profile.firstVisitDate);
  if (isNaN(firstVisitDate.getTime())) {
    console.log(`TravelTimelineComponent: Invalid firstVisitDate: ${profile.firstVisitDate}`);
    return null;
  }

  const now = new Date();
  const daysSinceFirstVisit = Math.floor(
    (now.getTime() - firstVisitDate.getTime()) / (1000 * 60 * 60 * 24)
  );

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

  const firstVisitGradient = [Colors.primary, adjustColorBrightness(Colors.primary, 30)];
  const badgeGradient = [Colors.secondary, adjustColorBrightness(Colors.secondary, 30)];
  const currentJourneyGradient = [
    AccentColors.accent1,
    adjustColorBrightness(AccentColors.accent1, 30),
  ];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.headerContainer}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Ionicons
            name="time-outline"
            size={22}
            color={Colors.primary}
            style={styles.headerIcon}
          />
          <Text style={styles.headerTitle}>Your Travel Journey</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={Colors.primary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.timelineContent}>
          <View style={styles.timelineLine} />

          <View style={styles.timelineEvent}>
            <View style={styles.dotContainer}>
              <View style={[styles.timelineDot, styles.primaryDot]} />
            </View>

            <View style={styles.cardContainer}>
              <GradientCard
                gradientColors={firstVisitGradient}
                title="First Place Visited"
                icon="flag"
                compact={true}
                cardStyle={styles.timelineCard}
                gradientStart={{ x: 0, y: 0 }}
                gradientEnd={{ x: 0, y: 1 }}
              >
                <View>
                  <Text style={styles.timelineDate}>{formatDate(firstVisitDate)}</Text>
                  <Text style={styles.timelineText}>
                    Your journey began {daysSinceFirstVisit} days ago
                  </Text>
                </View>
              </GradientCard>
            </View>
          </View>

          {completedBadgesCount > 0 && (
            <View style={styles.timelineEvent}>
              <View style={styles.dotContainer}>
                <View style={[styles.timelineDot, styles.secondaryDot]} />
              </View>

              <View style={styles.cardContainer}>
                <GradientCard
                  gradientColors={badgeGradient}
                  title="First Achievement"
                  icon="ribbon"
                  compact={true}
                  cardStyle={styles.timelineCard}
                  gradientStart={{ x: 0, y: 0 }}
                  gradientEnd={{ x: 0, y: 1 }}
                >
                  <View>
                    {completedBadges[0]?.dateEarned && (
                      <Text style={styles.timelineDate}>
                        {formatDate(new Date(completedBadges[0].dateEarned))}
                      </Text>
                    )}
                    <Text style={styles.timelineText}>
                      {completedBadges[0]?.name || "Achievement"} earned
                    </Text>
                  </View>
                </GradientCard>
              </View>
            </View>
          )}

          <View style={styles.timelineEvent}>
            <View style={styles.dotContainer}>
              <View style={[styles.timelineDot, styles.accentDot]} />
            </View>

            <View style={styles.cardContainer}>
              <GradientCard
                gradientColors={currentJourneyGradient}
                title="Current Journey"
                icon="navigate"
                compact={true}
                cardStyle={styles.timelineCard}
                gradientStart={{ x: 0, y: 0 }}
                gradientEnd={{ x: 0, y: 1 }}
              >
                <View>
                  <Text style={styles.timelineDate}>{formatDate(now)}</Text>
                  <Text style={styles.timelineText}>{daysSinceFirstVisit} days of exploration</Text>
                  {completedBadgesCount > 0 && (
                    <View style={styles.badgeCounter}>
                      <Text style={styles.badgeCounterText}>
                        {completedBadgesCount} badge{completedBadgesCount !== 1 ? "s" : ""} earned
                      </Text>
                    </View>
                  )}
                </View>
              </GradientCard>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

function adjustColorBrightness(hex: string, percent: number): string {
  hex = hex.replace(/^\s*#|\s*$/g, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const adjustR = Math.floor((r * (100 + percent)) / 100);
  const adjustG = Math.floor((g * (100 + percent)) / 100);
  const adjustB = Math.floor((b * (100 + percent)) / 100);

  const clampR = Math.min(255, Math.max(0, adjustR));
  const clampG = Math.min(255, Math.max(0, adjustG));
  const clampB = Math.min(255, Math.max(0, adjustB));

  return `#${clampR.toString(16).padStart(2, "0")}${clampG.toString(16).padStart(2, "0")}${clampB
    .toString(16)
    .padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: {},
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: NeutralColors.gray800,
  },
  timelineContent: {
    position: "relative",
    paddingLeft: 16,
    paddingTop: 8,
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
    marginBottom: 16,
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
    borderColor: "#FFFFFF",
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
  cardContainer: {
    flex: 1,
  },
  timelineCard: {
    marginBottom: 0,
  },
  timelineDate: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: 6,
  },
  timelineText: {
    fontSize: 14,
    color: "white",
    fontWeight: "400",
    lineHeight: 20,
  },
  badgeCounter: {
    marginTop: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  badgeCounterText: {
    fontSize: 13,
    color: "white",
    fontWeight: "500",
  },
});

export default TravelTimelineComponent;
