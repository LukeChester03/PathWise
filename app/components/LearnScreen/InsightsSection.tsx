// components/LearnScreen/InsightsSection.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, NeutralColors } from "../../constants/colours";
import SectionHeader from "./SectionHeader";

interface InsightsSectionProps {
  recentInsights: string[];
}

const InsightsSection: React.FC<InsightsSectionProps> = ({ recentInsights }) => {
  return (
    <View style={styles.section}>
      <SectionHeader title="Personalized Insights" icon="bulb" color={Colors.primary} />

      <View style={styles.insightsListContainer}>
        {recentInsights.length > 0 ? (
          recentInsights.map((insight, index) => (
            <View key={index} style={styles.personalizedInsightItem}>
              <Ionicons
                name="sparkles"
                size={18}
                color={Colors.primary}
                style={styles.insightIcon}
              />
              <Text style={styles.personalizedInsightText}>{insight}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyInsightsContainer}>
            <Ionicons name="bulb-outline" size={24} color={Colors.primary} />
            <Text style={styles.emptyInsightsText}>
              Visit more places to receive personalized insights about your travel patterns
            </Text>
          </View>
        )}
      </View>
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
  insightsListContainer: {
    marginTop: 12,
  },
  personalizedInsightItem: {
    flexDirection: "row",
    backgroundColor: NeutralColors.gray100,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  insightIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  personalizedInsightText: {
    flex: 1,
    fontSize: 14,
    color: NeutralColors.gray700,
    lineHeight: 20,
  },
  emptyInsightsContainer: {
    padding: 16,
    alignItems: "center",
    backgroundColor: NeutralColors.gray100,
    borderRadius: 12,
  },
  emptyInsightsText: {
    marginTop: 8,
    fontSize: 14,
    color: NeutralColors.gray700,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default InsightsSection;
