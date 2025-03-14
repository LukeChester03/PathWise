import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colours";
import { AiGeneratedContent } from "../../services/Gemini/placeAiService";

interface HistoricalTimelineProps {
  aiContent: AiGeneratedContent | null;
  fontSize: {
    body: number;
    subtitle: number;
  };
}

const HistoricalTimeline: React.FC<HistoricalTimelineProps> = ({ aiContent, fontSize }) => {
  if (aiContent?.isGenerating) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={styles.loadingText}>Discovering historical information...</Text>
        </View>
      </View>
    );
  }

  if (!aiContent?.historicalFacts || aiContent.historicalFacts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Ionicons name="time" size={20} color={Colors.primary} style={styles.headerIcon} />
        <Text style={[styles.title, { fontSize: fontSize.subtitle }]}>Historical Timeline</Text>
      </View>

      <View style={styles.timelineContainer}>
        {aiContent.historicalFacts.map((fact, index) => (
          <View key={index} style={styles.timelineItem}>
            {/* Timeline connector */}
            <View style={styles.timelineConnector}>
              <View style={styles.timelineDot} />
              {index < aiContent.historicalFacts.length - 1 && <View style={styles.timelineLine} />}
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
              <Text style={[styles.factText, { fontSize: fontSize.body }]}>{fact}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerIcon: {
    marginRight: 8,
  },
  title: {
    fontWeight: "600",
    color: "#333",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#777",
  },
  timelineContainer: {
    padding: 16,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  timelineConnector: {
    width: 24,
    alignItems: "center",
    marginRight: 8,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#e0e0e0",
    position: "absolute",
    top: 12,
    bottom: -20,
    left: 5,
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 4,
  },
  factText: {
    color: "#444",
    lineHeight: 22,
  },
});

export default HistoricalTimeline;
