// components/AdvancedAnalysis/AnalysisSummary.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, NeutralColors } from "../../../constants/colours";
import { AdvancedTravelAnalysis } from "../../../types/LearnScreen/TravelAnalysisTypes";

type AnalysisSummaryProps = {
  analysis: AdvancedTravelAnalysis;
};

const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({ analysis }) => {
  const getQualityLabel = (quality: number): string => {
    if (quality >= 80) return "Excellent";
    if (quality >= 60) return "Good";
    if (quality >= 40) return "Average";
    return "Limited";
  };

  const getQualityStyle = (quality: number) => {
    if (quality >= 80) return styles.qualityExcellent;
    if (quality >= 60) return styles.qualityGood;
    if (quality >= 40) return styles.qualityAverage;
    return styles.qualityLimited;
  };

  return (
    <View style={styles.summaryContainer}>
      <LinearGradient
        colors={["#2C3E50", "#4CA1AF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryGradient}
      >
        <View style={styles.summaryHeader}>
          <View style={styles.qualitySection}>
            <Text style={styles.qualityLabel}>Analysis Quality</Text>
            <View style={[styles.qualityBadge, getQualityStyle(analysis.analysisQuality)]}>
              <Text style={styles.qualityText}>{getQualityLabel(analysis.analysisQuality)}</Text>
            </View>
          </View>

          <View style={styles.confidenceSection}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <View style={styles.confidenceBar}>
              <View style={[styles.confidenceFill, { width: `${analysis.confidenceScore}%` }]} />
            </View>
            <View style={styles.confidenceValue}>
              <Text style={styles.confidenceText}>{analysis.confidenceScore}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryMetadata}>
          <View style={styles.metadataItem}>
            <Ionicons name="calendar" size={14} color="#FFFFFF" />
            <Text style={styles.metadataText}>Analyzed {analysis.basedOnPlaces} places</Text>
          </View>

          <View style={styles.metadataItem}>
            <Ionicons name="time" size={14} color="#FFFFFF" />
            <Text style={styles.metadataText}>
              Last updated: {new Date(analysis.lastRefreshed).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: NeutralColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  summaryGradient: {
    padding: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  qualitySection: {
    flex: 1,
    marginRight: 12,
  },
  qualityLabel: {
    fontSize: 12,
    color: `${NeutralColors.white}CC`, // 80% opacity
    marginBottom: 6,
  },
  qualityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: `${NeutralColors.white}33`, // 20% opacity
  },
  qualityExcellent: {
    backgroundColor: `${Colors.success}80`, // 50% opacity
  },
  qualityGood: {
    backgroundColor: `${Colors.info}80`, // 50% opacity
  },
  qualityAverage: {
    backgroundColor: `${Colors.warning}80`, // 50% opacity
  },
  qualityLimited: {
    backgroundColor: `${Colors.danger}80`, // 50% opacity
  },
  qualityText: {
    fontSize: 12,
    fontWeight: "600",
    color: NeutralColors.white,
  },
  confidenceSection: {
    flex: 1,
  },
  confidenceLabel: {
    fontSize: 12,
    color: `${NeutralColors.white}CC`, // 80% opacity
    marginBottom: 6,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: `${NeutralColors.white}33`, // 20% opacity
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  confidenceFill: {
    height: "100%",
    backgroundColor: NeutralColors.white,
    borderRadius: 4,
  },
  confidenceValue: {
    alignItems: "flex-end",
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "600",
    color: NeutralColors.white,
  },
  summaryMetadata: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 12,
    color: NeutralColors.white,
    marginLeft: 6,
  },
});

export default AnalysisSummary;
