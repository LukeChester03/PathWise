// components/AdvancedAnalysis/tabs/TemporalTab.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, NeutralColors } from "../../../../constants/colours";
import SectionCard, { NoDataText } from "../SectionCard";
import TabContainer from "../TabContainer";

type TemporalTabProps = {
  temporalAnalysis: any; // Use proper type from your TravelAnalysisTypes
};

const TemporalTab: React.FC<TemporalTabProps> = ({ temporalAnalysis }) => {
  if (!temporalAnalysis) return null;

  return (
    <TabContainer>
      <SectionCard
        title="Annual Travel Progression"
        description="How your travel patterns have evolved year by year"
        icon="analytics"
      >
        {temporalAnalysis.yearlyProgression &&
        Object.keys(temporalAnalysis.yearlyProgression).length > 0 ? (
          <View style={styles.yearlyProgressionChart}>
            {Object.entries(temporalAnalysis.yearlyProgression)
              .sort((a, b) => a[0].localeCompare(b[0])) // Sort by year
              .map(([year, yearData]: [string, any]) => {
                if (!yearData) return null;

                // Find the maximum value for scaling
                const allVisits = Object.values(temporalAnalysis.yearlyProgression || {}).map(
                  (data: any) => data?.totalVisits || 0
                );
                const maxVisits = Math.max(...allVisits, 1); // Avoid division by zero

                const barHeight = (yearData.totalVisits / maxVisits) * 100;

                return (
                  <View key={year} style={styles.yearlyBarContainer}>
                    <View style={styles.yearlyBarInfo}>
                      <Text style={styles.yearlyBarCount}>{yearData.totalVisits}</Text>
                    </View>
                    <View style={styles.yearlyBarWrapper}>
                      <View style={[styles.yearlyBar, { height: `${barHeight}%` }]} />
                    </View>
                    <Text style={styles.yearlyBarLabel}>{year}</Text>
                  </View>
                );
              })}
          </View>
        ) : (
          <NoDataText text="No yearly progression data available" />
        )}
      </SectionCard>

      <SectionCard
        title="Seasonal Patterns"
        description="Your travel preferences across different seasons"
        icon="calendar"
      >
        {temporalAnalysis.seasonalPatterns ? (
          <View style={styles.seasonalPatternsContainer}>
            {Object.entries(temporalAnalysis.seasonalPatterns).map(
              ([season, data]: [string, any]) => {
                if (!data) return null;

                return (
                  <View key={season} style={styles.seasonalPattern}>
                    <View style={styles.seasonalHeader}>
                      <Text style={styles.seasonalName}>
                        {season.charAt(0).toUpperCase() + season.slice(1)}
                      </Text>
                      <Text style={styles.seasonalPercentage}>{data.visitPercentage}%</Text>
                    </View>

                    <View style={styles.seasonalBarContainer}>
                      <View
                        style={[
                          styles.seasonalBar,
                          { width: `${data.visitPercentage}%` },
                          season === "winter" && styles.winterBar,
                          season === "spring" && styles.springBar,
                          season === "summer" && styles.summerBar,
                          season === "fall" && styles.fallBar,
                        ]}
                      />
                    </View>

                    <View style={styles.seasonalDetails}>
                      <Text style={styles.seasonalDetailText}>
                        Top categories:{" "}
                        {(data.preferredCategories || []).slice(0, 2).join(", ") || "None"}
                      </Text>
                      <Text style={styles.seasonalDetailText}>
                        Avg. duration: {data.averageDuration || "Unknown"}
                      </Text>
                    </View>
                  </View>
                );
              }
            )}
          </View>
        ) : (
          <NoDataText text="No seasonal patterns data available" />
        )}
      </SectionCard>

      <SectionCard
        title="Monthly Distribution"
        description="Your travel frequency throughout the year"
        icon="stats-chart"
      >
        {temporalAnalysis.monthlyDistribution &&
        Object.keys(temporalAnalysis.monthlyDistribution).length > 0 ? (
          <View style={styles.monthlyDistributionContainer}>
            {Object.entries(temporalAnalysis.monthlyDistribution).map(
              ([month, percentage]: [string, any]) => (
                <View key={month} style={styles.monthItem}>
                  <Text style={styles.monthName}>{month.substring(0, 3)}</Text>
                  <View style={styles.monthBarContainer}>
                    <View style={[styles.monthBar, { height: `${percentage * 4}%` }]} />
                  </View>
                  <Text style={styles.monthPercentage}>{percentage?.toFixed(1)}%</Text>
                </View>
              )
            )}
          </View>
        ) : (
          <NoDataText text="No monthly distribution data available" />
        )}
      </SectionCard>
    </TabContainer>
  );
};

const styles = StyleSheet.create({
  yearlyProgressionChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 200,
    marginTop: 16,
  },
  yearlyBarContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 2,
  },
  yearlyBarInfo: {
    marginBottom: 4,
  },
  yearlyBarCount: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "600",
  },
  yearlyBarWrapper: {
    width: "70%",
    height: 150,
    justifyContent: "flex-end",
  },
  yearlyBar: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  yearlyBarLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginTop: 8,
  },
  seasonalPatternsContainer: {
    marginTop: 16,
  },
  seasonalPattern: {
    marginBottom: 16,
  },
  seasonalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  seasonalName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  seasonalPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  seasonalBarContainer: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  seasonalBar: {
    height: "100%",
    borderRadius: 4,
  },
  winterBar: {
    backgroundColor: Colors.info,
  },
  springBar: {
    backgroundColor: Colors.success,
  },
  summerBar: {
    backgroundColor: Colors.warning,
  },
  fallBar: {
    backgroundColor: Colors.danger,
  },
  seasonalDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  seasonalDetailText: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  monthlyDistributionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 120,
    alignItems: "flex-end",
    paddingTop: 16,
  },
  monthItem: {
    alignItems: "center",
    flex: 1,
  },
  monthName: {
    fontSize: 10,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  monthBarContainer: {
    width: 8,
    height: 80,
    justifyContent: "flex-end",
  },
  monthBar: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  monthPercentage: {
    fontSize: 10,
    color: NeutralColors.gray600,
    marginTop: 4,
  },
});

export default TemporalTab;
