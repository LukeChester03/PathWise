// components/AdvancedAnalysis/tabs/BehavioralTab.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, NeutralColors } from "../../../../constants/colours";
import SectionCard, { NoDataText } from "../SectionCard";
import TabContainer from "../TabContainer";

type BehavioralTabProps = {
  behavioralAnalysis: any; // Use proper type from your TravelAnalysisTypes
};

const BehavioralTab: React.FC<BehavioralTabProps> = ({ behavioralAnalysis }) => {
  if (!behavioralAnalysis) return null;

  return (
    <TabContainer>
      <SectionCard
        title="Exploration Style"
        description="Your approach to discovering new places"
        icon="footsteps"
      >
        {behavioralAnalysis.explorationStyle ? (
          <View style={styles.explorationStyleContainer}>
            <View style={styles.explorationMetric}>
              <View style={styles.explorationMetricHeader}>
                <Text style={styles.explorationMetricLabel}>Spontaneity</Text>
                <Text style={styles.explorationMetricValue}>
                  {Math.round(behavioralAnalysis.explorationStyle.spontaneityScore)}%
                </Text>
              </View>
              <View style={styles.explorationMetricScale}>
                <View
                  style={[
                    styles.explorationMetricFill,
                    { width: `${behavioralAnalysis.explorationStyle.spontaneityScore}%` },
                  ]}
                />
              </View>
              <View style={styles.explorationMetricLabels}>
                <Text style={styles.explorationMetricMinLabel}>Planned</Text>
                <Text style={styles.explorationMetricMaxLabel}>Spontaneous</Text>
              </View>
            </View>

            <View style={styles.explorationMetric}>
              <View style={styles.explorationMetricHeader}>
                <Text style={styles.explorationMetricLabel}>Variety Seeking</Text>
                <Text style={styles.explorationMetricValue}>
                  {Math.round(behavioralAnalysis.explorationStyle.varietySeeking)}%
                </Text>
              </View>
              <View style={styles.explorationMetricScale}>
                <View
                  style={[
                    styles.explorationMetricFill,
                    { width: `${behavioralAnalysis.explorationStyle.varietySeeking}%` },
                  ]}
                />
              </View>
              <View style={styles.explorationMetricLabels}>
                <Text style={styles.explorationMetricMinLabel}>Consistent</Text>
                <Text style={styles.explorationMetricMaxLabel}>Varied</Text>
              </View>
            </View>

            <View style={styles.explorationMetric}>
              <View style={styles.explorationMetricHeader}>
                <Text style={styles.explorationMetricLabel}>Novelty Preference</Text>
                <Text style={styles.explorationMetricValue}>
                  {Math.round(behavioralAnalysis.explorationStyle.noveltyPreference)}%
                </Text>
              </View>
              <View style={styles.explorationMetricScale}>
                <View
                  style={[
                    styles.explorationMetricFill,
                    { width: `${behavioralAnalysis.explorationStyle.noveltyPreference}%` },
                  ]}
                />
              </View>
              <View style={styles.explorationMetricLabels}>
                <Text style={styles.explorationMetricMinLabel}>Familiar</Text>
                <Text style={styles.explorationMetricMaxLabel}>Novel</Text>
              </View>
            </View>

            <View style={styles.returnVisitContainer}>
              <Text style={styles.returnVisitLabel}>Return Visit Rate</Text>
              <Text style={styles.returnVisitValue}>
                {Math.round(behavioralAnalysis.explorationStyle.returnVisitRate)}%
              </Text>
            </View>
          </View>
        ) : (
          <NoDataText text="No exploration style data available" />
        )}
      </SectionCard>

      <SectionCard
        title="Travel Personality"
        description="Your travel characteristics and preferences"
        icon="person"
      >
        {behavioralAnalysis.travelPersonality ? (
          <View style={styles.personalityTraitsContainer}>
            <View style={styles.personalityTrait}>
              <Text style={styles.personalityTraitLabel}>Openness</Text>
              <View style={styles.personalityTraitScaleContainer}>
                <View style={styles.personalityTraitScale}>
                  <View
                    style={[
                      styles.personalityTraitFill,
                      { width: `${behavioralAnalysis.travelPersonality.openness}%` },
                    ]}
                  />
                </View>
                <Text style={styles.personalityTraitValue}>
                  {Math.round(behavioralAnalysis.travelPersonality.openness)}%
                </Text>
              </View>
            </View>

            <View style={styles.personalityTrait}>
              <Text style={styles.personalityTraitLabel}>Cultural Engagement</Text>
              <View style={styles.personalityTraitScaleContainer}>
                <View style={styles.personalityTraitScale}>
                  <View
                    style={[
                      styles.personalityTraitFill,
                      { width: `${behavioralAnalysis.travelPersonality.cultureEngagement}%` },
                    ]}
                  />
                </View>
                <Text style={styles.personalityTraitValue}>
                  {Math.round(behavioralAnalysis.travelPersonality.cultureEngagement)}%
                </Text>
              </View>
            </View>

            <View style={styles.personalityTrait}>
              <Text style={styles.personalityTraitLabel}>Social Orientation</Text>
              <View style={styles.personalityTraitScaleContainer}>
                <View style={styles.personalityTraitScale}>
                  <View
                    style={[
                      styles.personalityTraitFill,
                      { width: `${behavioralAnalysis.travelPersonality.socialOrientation}%` },
                    ]}
                  />
                </View>
                <Text style={styles.personalityTraitValue}>
                  {Math.round(behavioralAnalysis.travelPersonality.socialOrientation)}%
                </Text>
              </View>
            </View>

            <View style={styles.personalityTrait}>
              <Text style={styles.personalityTraitLabel}>Activity Level</Text>
              <View style={styles.personalityTraitScaleContainer}>
                <View style={styles.personalityTraitScale}>
                  <View
                    style={[
                      styles.personalityTraitFill,
                      { width: `${behavioralAnalysis.travelPersonality.activityLevel}%` },
                    ]}
                  />
                </View>
                <Text style={styles.personalityTraitValue}>
                  {Math.round(behavioralAnalysis.travelPersonality.activityLevel)}%
                </Text>
              </View>
            </View>

            <View style={styles.personalityTrait}>
              <Text style={styles.personalityTraitLabel}>Adventurousness</Text>
              <View style={styles.personalityTraitScaleContainer}>
                <View style={styles.personalityTraitScale}>
                  <View
                    style={[
                      styles.personalityTraitFill,
                      { width: `${behavioralAnalysis.travelPersonality.adventurousness}%` },
                    ]}
                  />
                </View>
                <Text style={styles.personalityTraitValue}>
                  {Math.round(behavioralAnalysis.travelPersonality.adventurousness)}%
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <NoDataText text="No travel personality data available" />
        )}
      </SectionCard>

      <SectionCard
        title="Motivational Factors"
        description="What drives your travel decisions"
        icon="flame"
      >
        {behavioralAnalysis.motivationalFactors &&
        behavioralAnalysis.motivationalFactors.length > 0 ? (
          <View style={styles.motivationalFactorsContainer}>
            {behavioralAnalysis.motivationalFactors.map((factor: any, index: number) => (
              <View key={index} style={styles.motivationalFactor}>
                <View style={styles.motivationalFactorHeader}>
                  <Text style={styles.motivationalFactorName}>{factor.factor}</Text>
                  <Text style={styles.motivationalFactorStrength}>
                    {Math.round(factor.strength)}%
                  </Text>
                </View>
                <View style={styles.motivationalFactorScale}>
                  <View style={[styles.motivationalFactorFill, { width: `${factor.strength}%` }]} />
                </View>
                <Text style={styles.motivationalFactorInsight}>{factor.insight}</Text>
              </View>
            ))}
          </View>
        ) : (
          <NoDataText text="No motivational factors data available" />
        )}
      </SectionCard>

      <SectionCard
        title="Decision Patterns"
        description="How you make travel choices"
        icon="analytics"
      >
        {behavioralAnalysis.decisionPatterns ? (
          <View style={styles.decisionPatternsContainer}>
            <View style={styles.decisionMetrics}>
              <View style={styles.decisionMetric}>
                <Text style={styles.decisionMetricLabel}>Decision Speed</Text>
                <View style={styles.decisionMetricScale}>
                  <View
                    style={[
                      styles.decisionMetricFill,
                      { width: `${behavioralAnalysis.decisionPatterns.decisionSpeed}%` },
                    ]}
                  />
                </View>
                <View style={styles.decisionMetricLabels}>
                  <Text style={styles.decisionMetricMinLabel}>Deliberate</Text>
                  <Text style={styles.decisionMetricMaxLabel}>Quick</Text>
                </View>
              </View>

              <View style={styles.decisionMetric}>
                <Text style={styles.decisionMetricLabel}>Consistency</Text>
                <View style={styles.decisionMetricScale}>
                  <View
                    style={[
                      styles.decisionMetricFill,
                      { width: `${behavioralAnalysis.decisionPatterns.consistencyScore}%` },
                    ]}
                  />
                </View>
                <View style={styles.decisionMetricLabels}>
                  <Text style={styles.decisionMetricMinLabel}>Variable</Text>
                  <Text style={styles.decisionMetricMaxLabel}>Consistent</Text>
                </View>
              </View>
            </View>

            {behavioralAnalysis.decisionPatterns.influenceFactors ? (
              <View style={styles.influenceFactorsContainer}>
                <Text style={styles.influenceFactorsLabel}>Key Influence Factors:</Text>
                <View style={styles.influenceFactorsTags}>
                  {behavioralAnalysis.decisionPatterns.influenceFactors.map(
                    (factor: string, index: number) => (
                      <View key={index} style={styles.influenceFactorTag}>
                        <Text style={styles.influenceFactorTagText}>{factor}</Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            ) : null}

            {behavioralAnalysis.decisionPatterns.insight && (
              <View style={styles.decisionInsight}>
                <Text style={styles.decisionInsightText}>
                  {behavioralAnalysis.decisionPatterns.insight}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <NoDataText text="No decision patterns data available" />
        )}
      </SectionCard>
    </TabContainer>
  );
};

const styles = StyleSheet.create({
  explorationStyleContainer: {
    marginTop: 16,
  },
  explorationMetric: {
    marginBottom: 16,
  },
  explorationMetricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  explorationMetricLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  explorationMetricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  explorationMetricScale: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  explorationMetricFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  explorationMetricLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  explorationMetricMinLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  explorationMetricMaxLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  returnVisitContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: NeutralColors.gray100,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  returnVisitLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  returnVisitValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  },
  personalityTraitsContainer: {
    marginTop: 16,
  },
  personalityTrait: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  personalityTraitLabel: {
    width: "40%",
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
    paddingRight: 2,
  },
  personalityTraitScaleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  personalityTraitScale: {
    flex: 1,
    height: 10,
    backgroundColor: NeutralColors.gray200,
    borderRadius: 5,
    overflow: "hidden",
    marginRight: 8,
  },
  personalityTraitFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 5,
  },
  personalityTraitValue: {
    width: 40,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
    textAlign: "right",
  },
  motivationalFactorsContainer: {
    marginTop: 16,
  },
  motivationalFactor: {
    marginBottom: 16,
  },
  motivationalFactorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  motivationalFactorName: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  motivationalFactorStrength: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  motivationalFactorScale: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  motivationalFactorFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  motivationalFactorInsight: {
    fontSize: 13,
    color: NeutralColors.gray600,
    fontStyle: "italic",
  },
  decisionPatternsContainer: {
    marginTop: 16,
  },
  decisionMetrics: {
    marginBottom: 16,
  },
  decisionMetric: {
    marginBottom: 12,
  },
  decisionMetricLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  decisionMetricScale: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  decisionMetricFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  decisionMetricLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  decisionMetricMinLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  decisionMetricMaxLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  influenceFactorsContainer: {
    marginBottom: 16,
  },
  influenceFactorsLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  influenceFactorsTags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  influenceFactorTag: {
    backgroundColor: `${Colors.primary}26`, // 15% opacity
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  influenceFactorTagText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.primary,
  },
  decisionInsight: {
    padding: 12,
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
  },
  decisionInsightText: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: "italic",
    textAlign: "center",
  },
});

export default BehavioralTab;
