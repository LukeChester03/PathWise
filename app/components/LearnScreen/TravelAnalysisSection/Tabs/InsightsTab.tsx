import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, NeutralColors } from "../../../../constants/colours";
import SectionCard, { NoDataText } from "../SectionCard";
import TabContainer from "../TabContainer";

type InsightsTabProps = {
  analyticalInsights: any;
};

const InsightsTab: React.FC<InsightsTabProps> = ({ analyticalInsights }) => {
  if (!analyticalInsights) return null;

  return (
    <TabContainer>
      <SectionCard
        title="Key Insights"
        description="Important observations about your travel behavior"
        icon="key"
      >
        {analyticalInsights.keyInsights && analyticalInsights.keyInsights.length > 0 ? (
          <View style={styles.keyInsightsContainer}>
            {analyticalInsights.keyInsights.map((insight: any, index: number) => (
              <View key={index} style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <View style={styles.insightConfidence}>
                    <Text style={styles.insightConfidenceText}>{insight.confidenceScore}%</Text>
                  </View>
                </View>

                <Text style={styles.insightDescription}>{insight.description}</Text>

                <View style={styles.insightTagsContainer}>
                  <Text style={styles.insightCategoryLabel}>{insight.category}</Text>
                  {insight.tags && (
                    <View style={styles.insightTags}>
                      {insight.tags.map((tag: string, idx: number) => (
                        <View key={idx} style={styles.insightTag}>
                          <Text style={styles.insightTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <NoDataText text="No key insights available" />
        )}
      </SectionCard>
    </TabContainer>
  );
};

const styles = StyleSheet.create({
  keyInsightsContainer: {
    marginTop: 16,
  },
  insightCard: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  insightConfidence: {
    backgroundColor: `${Colors.primary}33`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  insightConfidenceText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  insightDescription: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  insightTagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  insightCategoryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: NeutralColors.gray600,
    backgroundColor: NeutralColors.gray300,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  insightTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
  },
  insightTag: {
    backgroundColor: `${Colors.primary}26`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  insightTagText: {
    fontSize: 12,
    color: Colors.primary,
  },
});

export default InsightsTab;
