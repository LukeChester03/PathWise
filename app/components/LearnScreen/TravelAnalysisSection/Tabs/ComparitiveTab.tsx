import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, NeutralColors } from "../../../../constants/colours";
import SectionCard, { NoDataText } from "../SectionCard";
import TabContainer from "../TabContainer";

type ComparativeTabProps = {
  comparativeAnalysis: any;
};

const ComparativeTab: React.FC<ComparativeTabProps> = ({ comparativeAnalysis }) => {
  if (!comparativeAnalysis) return null;

  return (
    <TabContainer>
      <SectionCard
        title="Persona Comparison"
        description="How your travel style compares to common traveler personas"
        icon="people"
      >
        {comparativeAnalysis.personaComparison ? (
          <View style={styles.personaComparisonContainer}>
            <View style={styles.similarPersonaSection}>
              <Text style={styles.similarPersonaLabel}>Most Similar Travel Persona</Text>
              <Text style={styles.similarPersonaValue}>
                {comparativeAnalysis.personaComparison.mostSimilarPersona}
              </Text>

              <View style={styles.similarityScoreContainer}>
                <Text style={styles.similarityScoreLabel}>Similarity Score</Text>
                <View style={styles.similarityScoreBar}>
                  <View
                    style={[
                      styles.similarityScoreFill,
                      { width: `${comparativeAnalysis.personaComparison.similarityScore}%` },
                    ]}
                  />
                </View>
                <Text style={styles.similarityScoreValue}>
                  {comparativeAnalysis.personaComparison.similarityScore}%
                </Text>
              </View>
            </View>

            {comparativeAnalysis.personaComparison.keyDifferences &&
              comparativeAnalysis.personaComparison.keyDifferences.length > 0 && (
                <View style={styles.keyDifferencesContainer}>
                  <Text style={styles.keyDifferencesLabel}>Key Differences</Text>
                  <View style={styles.differencesList}>
                    {comparativeAnalysis.personaComparison.keyDifferences.map(
                      (difference: string, index: number) => (
                        <View key={index} style={styles.differenceItem}>
                          <View style={styles.differenceDot} />
                          <Text style={styles.differenceText}>{difference}</Text>
                        </View>
                      )
                    )}
                  </View>
                </View>
              )}
          </View>
        ) : (
          <NoDataText text="No persona comparison data available" />
        )}
      </SectionCard>
    </TabContainer>
  );
};

const styles = StyleSheet.create({
  personaComparisonContainer: {
    marginTop: 16,
  },
  similarPersonaSection: {
    marginBottom: 16,
  },
  similarPersonaLabel: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  similarPersonaValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  similarityScoreContainer: {
    marginTop: 8,
  },
  similarityScoreLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  similarityScoreBar: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  similarityScoreFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  similarityScoreValue: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
    textAlign: "right",
  },
  keyDifferencesContainer: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  keyDifferencesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  differencesList: {},
  differenceItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  differenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  differenceText: {
    fontSize: 14,
    color: Colors.text,
  },
});

export default ComparativeTab;
