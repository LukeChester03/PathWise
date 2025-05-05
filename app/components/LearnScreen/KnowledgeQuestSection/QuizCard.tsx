import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Quiz } from "../../../types/LearnScreen/KnowledgeQuestTypes";

interface QuizCardProps {
  quiz: Quiz;
  onStartQuiz: (quiz: Quiz) => void;
}

const QuizCard = ({ quiz, onStartQuiz }: QuizCardProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "#10B981";
      case "medium":
        return "#FBBF24";
      case "hard":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "history":
        return "time";
      case "culture":
        return "people";
      case "geography":
        return "map";
      case "art":
        return "color-palette";
      case "food":
        return "restaurant";
      default:
        return "help-circle";
    }
  };

  const isCompleted = quiz.lastCompletedAt !== undefined;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onStartQuiz(quiz)}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: `${getDifficultyColor(quiz.difficulty)}20` },
          ]}
        >
          <Ionicons
            name={getCategoryIcon(quiz.category)}
            size={14}
            color={getDifficultyColor(quiz.difficulty)}
          />
          <Text style={[styles.categoryText, { color: getDifficultyColor(quiz.difficulty) }]}>
            {quiz.category.charAt(0).toUpperCase() + quiz.category.slice(1)}
          </Text>
        </View>

        {isCompleted && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{quiz.title}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {quiz.description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.infoItem}>
          <Ionicons name="help-circle" size={14} color="#6B7280" />
          <Text style={styles.infoText}>{quiz.questions.length} questions</Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="speedometer" size={14} color="#6B7280" />
          <Text style={styles.infoText}>{quiz.difficulty}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={() => onStartQuiz(quiz)}>
        <Text style={styles.startButtonText}>Start Quiz</Text>
        <Ionicons name="play" size={14} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 250,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completedText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#10B981",
    marginLeft: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    height: 40,
  },
  footer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  infoText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginRight: 6,
  },
});

export default QuizCard;
