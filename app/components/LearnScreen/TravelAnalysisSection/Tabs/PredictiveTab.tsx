// components/AdvancedAnalysis/tabs/PredictiveTab.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, NeutralColors } from "../../../../constants/colours";
import SectionCard, { NoDataText } from "../SectionCard";
import TabContainer from "../TabContainer";

type PredictiveTabProps = {
  predictiveAnalysis: any; // Use proper type from your TravelAnalysisTypes
};

const PredictiveTab: React.FC<PredictiveTabProps> = ({ predictiveAnalysis }) => {
  if (!predictiveAnalysis) return null;

  return (
    <TabContainer>
      <SectionCard
        title="Recommended Destinations"
        description="Places you might enjoy based on your travel history"
        icon="navigate"
      >
        {predictiveAnalysis.recommendedDestinations &&
        predictiveAnalysis.recommendedDestinations.length > 0 ? (
          <View style={styles.recommendationsContainer}>
            {predictiveAnalysis.recommendedDestinations.map((destination: any, index: number) => (
              <View key={index} style={styles.recommendationCard}>
                <View style={styles.recommendationHeader}>
                  <Text style={styles.recommendationName}>{destination.name}</Text>
                  <View
                    style={[
                      styles.recommendationConfidence,
                      destination.confidenceScore >= 80
                        ? styles.highConfidence
                        : destination.confidenceScore >= 60
                        ? styles.mediumConfidence
                        : styles.lowConfidence,
                    ]}
                  >
                    <Text style={styles.recommendationConfidenceText}>
                      {destination.confidenceScore}% match
                    </Text>
                  </View>
                </View>

                <Text style={styles.recommendationTimeframe}>
                  Best time to visit: {destination.bestTimeToVisit || "Any time"}
                </Text>

                {destination.reasoningFactors && destination.reasoningFactors.length > 0 && (
                  <View style={styles.recommendationFactors}>
                    <Text style={styles.recommendationFactorsLabel}>Why you might like it:</Text>
                    {destination.reasoningFactors.map((factor: string, idx: number) => (
                      <View key={idx} style={styles.recommendationFactorItem}>
                        <View style={styles.recommendationFactorDot} />
                        <Text style={styles.recommendationFactorText}>{factor}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.interestLevelContainer}>
                  <Text style={styles.interestLevelLabel}>Predicted Interest Level</Text>
                  <View style={styles.interestLevelBar}>
                    <View
                      style={[
                        styles.interestLevelFill,
                        { width: `${destination.expectedInterestLevel}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.interestLevelValue}>
                    {destination.expectedInterestLevel}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <NoDataText text="No recommended destinations available" />
        )}
      </SectionCard>

      {/* Note: You can add additional predictive tab sections here if needed,
          such as trends, interest evolution, etc. */}
    </TabContainer>
  );
};

const styles = StyleSheet.create({
  recommendationsContainer: {
    marginTop: 16,
  },
  recommendationCard: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  recommendationName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  recommendationConfidence: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highConfidence: {
    backgroundColor: `${Colors.success}33`, // 20% opacity
  },
  mediumConfidence: {
    backgroundColor: `${Colors.info}33`, // 20% opacity
  },
  lowConfidence: {
    backgroundColor: `${Colors.danger}33`, // 20% opacity
  },
  recommendationConfidenceText: {
    fontSize: 12,
    fontWeight: "600",
  },
  recommendationTimeframe: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginBottom: 8,
  },
  recommendationFactors: {
    marginBottom: 12,
  },
  recommendationFactorsLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 6,
  },
  recommendationFactorItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  recommendationFactorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  recommendationFactorText: {
    fontSize: 14,
    color: NeutralColors.gray600,
  },
  interestLevelContainer: {
    marginTop: 4,
  },
  interestLevelLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  interestLevelBar: {
    height: 6,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  interestLevelFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  interestLevelValue: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
    textAlign: "right",
  },
});

export default PredictiveTab;
