import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TravelProfile } from "../../../types/LearnScreen/TravelProfileTypes";
import { Colors, NeutralColors } from "../../../constants/colours";
import SectionHeader from "../SectionHeader";

interface TravelPatternsSectionProps {
  profile: TravelProfile;
  expanded: boolean;
  toggleExpanded: () => void;
}

const TravelPatternsSection: React.FC<TravelPatternsSectionProps> = ({
  profile,
  expanded,
  toggleExpanded,
}) => {
  return (
    <TouchableOpacity style={styles.section} onPress={toggleExpanded}>
      <SectionHeader
        title="Travel Patterns"
        icon="analytics"
        color={Colors.primary}
        rightElement={
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={22}
            color={Colors.primary}
          />
        }
      />

      {expanded && (
        <View style={styles.patternsContainer}>
          <View style={styles.frequencySection}>
            <Text style={styles.subsectionTitle}>Visit Frequency</Text>

            <View style={styles.frequencyItem}>
              <View style={styles.frequencyHeader}>
                <Text style={styles.frequencyLabel}>Preferred Day</Text>
                <Text style={styles.frequencyValue}>{profile.visitFrequency.weekdays.most}</Text>
              </View>
              <View style={styles.frequencyBarContainer}>
                <View
                  style={[
                    styles.frequencyBar,
                    { width: `${profile.visitFrequency.weekdays.percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.frequencyInsight}>{profile.visitFrequency.weekdays.insight}</Text>
            </View>

            <View style={styles.frequencyItem}>
              <View style={styles.frequencyHeader}>
                <Text style={styles.frequencyLabel}>Time of Day</Text>
                <Text style={styles.frequencyValue}>{profile.visitFrequency.timeOfDay.most}</Text>
              </View>
              <View style={styles.frequencyBarContainer}>
                <View
                  style={[
                    styles.frequencyBar,
                    { width: `${profile.visitFrequency.timeOfDay.percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.frequencyInsight}>
                {profile.visitFrequency.timeOfDay.insight}
              </Text>
            </View>

            <View style={styles.frequencyItem}>
              <View style={styles.frequencyHeader}>
                <Text style={styles.frequencyLabel}>Season</Text>
                <Text style={styles.frequencyValue}>{profile.visitFrequency.season.most}</Text>
              </View>
              <View style={styles.frequencyBarContainer}>
                <View
                  style={[
                    styles.frequencyBar,
                    { width: `${profile.visitFrequency.season.percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.frequencyInsight}>{profile.visitFrequency.season.insight}</Text>
            </View>
          </View>

          <View style={styles.insightsContainer}>
            <Text style={styles.subsectionTitle}>Behavioral Insights</Text>

            {profile.patterns.length > 0 ? (
              profile.patterns.map((pattern, index) => (
                <View key={index} style={styles.insightItem}>
                  <View style={styles.insightBullet} />
                  <Text style={styles.insightText}>{pattern}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>
                Continue exploring to reveal your travel patterns
              </Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
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
  patternsContainer: {
    marginTop: 16,
  },
  frequencySection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: NeutralColors.gray800,
    marginBottom: 12,
  },
  frequencyItem: {
    marginBottom: 12,
  },
  frequencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  frequencyLabel: {
    fontSize: 14,
    color: NeutralColors.gray700,
  },
  frequencyValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  frequencyBarContainer: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    marginBottom: 6,
  },
  frequencyBar: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  frequencyInsight: {
    fontSize: 12,
    fontStyle: "italic",
    color: NeutralColors.gray600,
  },
  insightsContainer: {
    marginBottom: 8,
  },
  insightItem: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-start",
  },
  insightBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
    marginRight: 10,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: NeutralColors.gray700,
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    fontStyle: "italic",
    textAlign: "center",
    padding: 12,
  },
});

export default TravelPatternsSection;
