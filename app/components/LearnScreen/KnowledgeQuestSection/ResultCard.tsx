// components/LearnScreen/KnowledgeQuestSection/ResultCard.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { QuizResult } from "../../../types/LearnScreen/KnowledgeQuestTypes";

interface ResultCardProps {
  result: QuizResult;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  return (
    <View key={result.id} style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{result.title}</Text>
        <View
          style={[
            styles.scoreBadge,
            result.score >= 80
              ? styles.highScore
              : result.score >= 60
              ? styles.mediumScore
              : styles.lowScore,
          ]}
        >
          <Text style={styles.scoreText}>{result.score}%</Text>
        </View>
      </View>

      <View style={styles.resultDetails}>
        <View style={styles.resultDetail}>
          <Ionicons name="checkmark-circle" size={14} color="#6366F1" />
          <Text style={styles.resultDetailText}>
            {result.correctAnswers} of {result.totalQuestions} correct
          </Text>
        </View>
        <View style={styles.resultDetail}>
          <Ionicons name="time" size={14} color="#6366F1" />
          <Text style={styles.resultDetailText}>{Math.round(result.timeSpent / 1000)} seconds</Text>
        </View>
        <View style={styles.resultDetail}>
          <Ionicons name="calendar" size={14} color="#6366F1" />
          <Text style={styles.resultDetailText}>
            {new Date(result.completedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <LinearGradient
        colors={["#E0E7FF", "#C7D2FE"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.resultCategoryBadge}
      >
        <Text style={styles.resultCategoryText}>
          {result.category.charAt(0).toUpperCase() + result.category.slice(1)}
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    position: "relative",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highScore: {
    backgroundColor: "#ECFDF5",
  },
  mediumScore: {
    backgroundColor: "#FEF3C7",
  },
  lowScore: {
    backgroundColor: "#FEE2E2",
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "700",
  },
  resultDetails: {
    marginBottom: 12,
  },
  resultDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  resultDetailText: {
    fontSize: 14,
    color: "#4B5563",
    marginLeft: 8,
  },
  resultCategoryBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 12,
  },
  resultCategoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F46E5",
  },
});

export default ResultCard;
