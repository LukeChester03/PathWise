import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Colors } from "../../constants/colours";
import { AiGeneratedContent } from "../../services/Gemini/placeAiService";

interface HistoricalFactsSectionProps {
  aiContent: AiGeneratedContent | null;
  fontSize: {
    body: number;
  };
}

const HistoricalFactsSection: React.FC<HistoricalFactsSectionProps> = ({ aiContent, fontSize }) => {
  if (aiContent?.isGenerating) {
    return (
      <View style={styles.aiGeneratingContainer}>
        <ActivityIndicator color={Colors.primary} size="small" />
        <Text style={styles.aiGeneratingText}>Discovering historical information...</Text>
      </View>
    );
  }

  return (
    <>
      {aiContent?.historicalFacts.map((fact, index) => (
        <View key={index} style={styles.factItem}>
          <View style={styles.factBullet}>
            <Text style={styles.factBulletText}>{index + 1}</Text>
          </View>
          <Text style={[styles.factText, { fontSize: fontSize.body }]}>{fact}</Text>
        </View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  aiGeneratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  aiGeneratingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#777",
  },
  factItem: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  factBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 1,
  },
  factBulletText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  factText: {
    color: "#444",
    flex: 1,
    lineHeight: 20,
  },
});

export default HistoricalFactsSection;
