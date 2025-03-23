// components/AdvancedAnalysis/tabs/TemporalTab.tsx
import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Colors, NeutralColors } from "../../../../constants/colours";
import SectionCard, { NoDataText } from "../SectionCard";
import TabContainer from "../TabContainer";

type TemporalTabProps = {
  temporalAnalysis: any; // Use proper type from your TravelAnalysisTypes
};

// Define month order to ensure consistent display
const MONTH_ORDER = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Get screen width for responsive calculations
const screenWidth = Dimensions.get("window").width;

const TemporalTab: React.FC<TemporalTabProps> = ({ temporalAnalysis }) => {
  if (!temporalAnalysis) return null;

  // Helper function to format category names (tourist_attraction → Tourist Attraction)
  const formatCategoryName = (category: string): string => {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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
                      <View
                        style={[styles.yearlyBar, { height: `${barHeight}%` }, styles.barShadow]}
                      />
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
                          styles.barShadow,
                        ]}
                      />
                    </View>

                    <View style={styles.seasonalDetails}>
                      <Text style={styles.seasonalDetailText}>
                        Top categories:{" "}
                        {(data.preferredCategories || [])
                          .map(formatCategoryName)
                          .slice(0, 2)
                          .join(", ") || "None"}
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
          <View style={styles.monthlyDistributionWrapper}>
            <View style={styles.monthlyDistributionContainer}>
              {MONTH_ORDER.map((month) => {
                const percentage = temporalAnalysis.monthlyDistribution[month] || 0;
                // Find the maximum percentage for better scaling
                const maxPercentage = Math.max(
                  ...Object.values(temporalAnalysis.monthlyDistribution).map((val: any) =>
                    typeof val === "number" ? val : 0
                  ),
                  1
                );

                // Scale the bar height based on the maximum percentage
                // This ensures the tallest bar is at 100% and others are proportional
                const heightPercentage = Math.max((percentage / maxPercentage) * 100, 5);

                return (
                  <View key={month} style={styles.monthItem}>
                    <Text style={styles.monthPercentage}>
                      {percentage > 0 ? Math.round(percentage) + "%" : ""}
                    </Text>
                    <View style={styles.monthBarContainer}>
                      <View
                        style={[
                          styles.monthBar,
                          { height: `${heightPercentage}%` },
                          styles.barShadow,
                          percentage === 0 && styles.emptyBar,
                        ]}
                      />
                    </View>
                    <Text style={styles.monthName}>{month.substring(0, 3)}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.chartGuides}>
              <View style={styles.chartAxisY} />
              <View style={styles.chartAxisX} />
            </View>
          </View>
        ) : (
          <NoDataText text="No monthly distribution data available" />
        )}
      </SectionCard>

      {/* Add dominant category formatting in yearly progression insights if needed */}
      {temporalAnalysis.yearlyProgression &&
        Object.entries(temporalAnalysis.yearlyProgression).length > 0 && (
          <SectionCard
            title="Annual Category Insights"
            description="Dominant travel categories by year"
            icon="ribbon"
          >
            <View style={styles.yearlyInsightsContainer}>
              {Object.entries(temporalAnalysis.yearlyProgression)
                .sort((a, b) => a[0].localeCompare(b[0])) // Sort by year
                .map(([year, yearData]: [string, any]) => {
                  if (!yearData || !yearData.dominantCategory) return null;

                  return (
                    <View key={year} style={styles.yearlyInsightItem}>
                      <Text style={styles.yearlyInsightYear}>{year}</Text>
                      <View style={styles.yearlyInsightContent}>
                        <Text style={styles.yearlyInsightCategory}>
                          {formatCategoryName(yearData.dominantCategory)}
                        </Text>
                        {yearData.topDestination && (
                          <Text style={styles.yearlyInsightDestination}>
                            Top: {yearData.topDestination}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
            </View>
          </SectionCard>
        )}
    </TabContainer>
  );
};

const styles = StyleSheet.create({
  // Yearly Progression Styles
  yearlyProgressionChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 220,
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 10,
    position: "relative",
  },
  yearlyBarContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  yearlyBarInfo: {
    marginBottom: 6,
  },
  yearlyBarCount: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "600",
  },
  yearlyBarWrapper: {
    width: "75%",
    height: 160,
    justifyContent: "flex-end",
  },
  yearlyBar: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  yearlyBarLabel: {
    fontSize: 13,
    color: NeutralColors.gray700,
    marginTop: 8,
    fontWeight: "500",
  },

  // Seasonal Patterns Styles
  seasonalPatternsContainer: {
    marginTop: 20,
  },
  seasonalPattern: {
    marginBottom: 20,
  },
  seasonalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  seasonalName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  seasonalPercentage: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
  },
  seasonalBarContainer: {
    height: 10,
    backgroundColor: NeutralColors.gray200,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 10,
  },
  seasonalBar: {
    height: "100%",
    borderRadius: 5,
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
    fontSize: 13,
    color: NeutralColors.gray700,
  },

  // Monthly Distribution Styles
  monthlyDistributionWrapper: {
    marginTop: 16,
    marginBottom: 10,
    paddingLeft: 10,
    paddingRight: 5,
    paddingBottom: 20,
    height: 200,
    position: "relative",
  },
  monthlyDistributionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 160,
    alignItems: "flex-end",
    zIndex: 2,
  },
  monthItem: {
    alignItems: "center",
    width: (screenWidth - 60) / 12, // Responsive width based on screen size
  },
  monthName: {
    fontSize: 12,
    color: NeutralColors.gray700,
    marginTop: 8,
    fontWeight: "500",
  },
  monthBarContainer: {
    width: "60%",
    height: 140,
    justifyContent: "flex-end",
  },
  monthBar: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  monthPercentage: {
    fontSize: 11,
    color: NeutralColors.gray600,
    marginBottom: 5,
    height: 15,
  },
  emptyBar: {
    backgroundColor: NeutralColors.gray300,
  },

  // Yearly Insights Styles
  yearlyInsightsContainer: {
    marginTop: 16,
    marginBottom: 10,
  },
  yearlyInsightItem: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray200,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  yearlyInsightYear: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    width: 60,
  },
  yearlyInsightContent: {
    flex: 1,
  },
  yearlyInsightCategory: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
    marginBottom: 4,
  },
  yearlyInsightDestination: {
    fontSize: 13,
    color: NeutralColors.gray600,
  },

  // Common Styles
  barShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  chartGuides: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 20,
    top: 0,
    zIndex: 1,
  },
  chartAxisY: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: NeutralColors.gray300,
  },
  chartAxisX: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: NeutralColors.gray300,
  },
});

export default TemporalTab;
