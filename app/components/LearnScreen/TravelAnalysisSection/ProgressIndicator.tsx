import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, NeutralColors } from "../../../constants/colours";
import { AnalysisGenerationProgress } from "../../../types/LearnScreen/TravelAnalysisTypes";

type ProgressIndicatorProps = {
  progress: AnalysisGenerationProgress;
};

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ progress }) => {
  if (!progress.isGenerating) return null;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress.progress}%` }]} />
      </View>
      <Text style={styles.progressText}>{progress.stage}</Text>
      <Text style={styles.progressPercentage}>{Math.round(progress.progress)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    marginTop: 16,
    width: "100%",
    alignItems: "center",
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginBottom: 4,
    textAlign: "center",
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
    textAlign: "center",
  },
});

export default ProgressIndicator;
