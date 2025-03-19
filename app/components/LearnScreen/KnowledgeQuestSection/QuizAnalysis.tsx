// components/LearnScreen/KnowledgeQuestSection/QuizAnalysis.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Quiz, QuizResult } from "../../../types/LearnScreen/KnowledgeQuestTypes";

interface QuizAnalysisProps {
  quiz: Quiz;
  answers: {
    questionId: string;
    selectedAnswerIndex: number;
    isCorrect: boolean;
    timeSpent: number;
  }[];
  result: QuizResult;
}

const QuizAnalysis = ({ quiz, answers, result }: QuizAnalysisProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate category performance if available
  const categoryPerformance = React.useMemo(() => {
    if (quiz.category) {
      return {
        category: quiz.category,
        correct: result.correctAnswers,
        total: result.totalQuestions,
        percentage: Math.round((result.correctAnswers / result.totalQuestions) * 100),
      };
    }
    return null;
  }, [quiz, result]);

  // Calculate time metrics
  const timeMetrics = React.useMemo(() => {
    const totalTime = result.timeSpent;
    const avgTimePerQuestion = Math.round(totalTime / result.totalQuestions);
    const avgTimeCorrect =
      answers.filter((a) => a.isCorrect).reduce((sum, a) => sum + a.timeSpent, 0) /
      (answers.filter((a) => a.isCorrect).length || 1);
    const avgTimeIncorrect =
      answers.filter((a) => !a.isCorrect).reduce((sum, a) => sum + a.timeSpent, 0) /
      (answers.filter((a) => !a.isCorrect).length || 1);

    return {
      totalTime: totalTime,
      avgTimePerQuestion: avgTimePerQuestion,
      avgTimeCorrect: Math.round(avgTimeCorrect),
      avgTimeIncorrect: Math.round(avgTimeIncorrect),
    };
  }, [answers, result]);

  // Identify strength and weakness areas
  const performanceAnalysis = React.useMemo(() => {
    // Sort questions by correctness and time spent
    const sortedQuestions = [...answers].sort((a, b) => {
      // First sort by correctness
      if (a.isCorrect && !b.isCorrect) return 1;
      if (!a.isCorrect && b.isCorrect) return -1;

      // Then by time spent (ascending for incorrect, descending for correct)
      if (!a.isCorrect) return a.timeSpent - b.timeSpent;
      return b.timeSpent - a.timeSpent;
    });

    // Get questions that were answered incorrectly or took too long
    const incorrectAnswers = sortedQuestions.filter((a) => !a.isCorrect);
    const slowCorrectAnswers = sortedQuestions.filter(
      (a) => a.isCorrect && a.timeSpent > timeMetrics.avgTimePerQuestion * 1.5
    );

    // Find corresponding questions
    const weaknessQuestions = incorrectAnswers.map((a) => {
      const q = quiz.questions.find((q) => q.id === a.questionId);
      return {
        ...a,
        question: q?.question || "",
        correctAnswer: q?.options[q.correctAnswerIndex] || "",
        selectedAnswer: q?.options[a.selectedAnswerIndex] || "",
      };
    });

    const improvementQuestions = slowCorrectAnswers.map((a) => {
      const q = quiz.questions.find((q) => q.id === a.questionId);
      return {
        ...a,
        question: q?.question || "",
        timeSpent: Math.round(a.timeSpent / 1000), // Convert to seconds
      };
    });

    return {
      weaknessQuestions,
      improvementQuestions,
    };
  }, [answers, quiz, timeMetrics]);

  // Generate improvement suggestions
  const improvementSuggestions = React.useMemo(() => {
    const suggestions = [];

    // Add accuracy-based suggestions
    if (result.score < 60) {
      suggestions.push("Review the topic material before attempting more quizzes");
    } else if (result.score < 80) {
      suggestions.push("Focus on understanding explanations for questions you missed");
    }

    // Add time-based suggestions
    if (timeMetrics.avgTimePerQuestion > 20000) {
      // If avg > 20 seconds
      suggestions.push("Work on improving your response time");
    }

    // Add category-specific suggestions
    if (categoryPerformance && categoryPerformance.percentage < 70) {
      suggestions.push(`Spend more time learning about ${categoryPerformance.category}`);
    }

    // Add general suggestions
    suggestions.push("Take more quizzes to reinforce your knowledge");

    return suggestions;
  }, [result, timeMetrics, categoryPerformance]);

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Performance Summary</Text>

      <View style={styles.statsCards}>
        <View style={styles.statsCard}>
          <Text style={styles.statsValue}>{result.score}%</Text>
          <Text style={styles.statsLabel}>Overall Score</Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsValue}>{Math.round(result.timeSpent / 1000)}s</Text>
          <Text style={styles.statsLabel}>Total Time</Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsValue}>
            {Math.round(timeMetrics.avgTimePerQuestion / 1000)}s
          </Text>
          <Text style={styles.statsLabel}>Avg per Question</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Correct vs Incorrect</Text>
      <View style={styles.comparisonContainer}>
        <View style={styles.comparisonBar}>
          <View
            style={[styles.comparisonFill, styles.correctFill, { flex: result.correctAnswers }]}
          />
          <View
            style={[
              styles.comparisonFill,
              styles.incorrectFill,
              { flex: result.totalQuestions - result.correctAnswers },
            ]}
          />
        </View>
        <View style={styles.comparisonLabels}>
          <Text style={styles.comparisonLabel}>
            Correct: {result.correctAnswers}/{result.totalQuestions}
          </Text>
          <Text style={styles.comparisonLabel}>
            Incorrect: {result.totalQuestions - result.correctAnswers}/{result.totalQuestions}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Time Analysis</Text>
      <View style={styles.timeAnalysis}>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Average time on correct answers:</Text>
          <Text style={styles.timeValue}>{Math.round(timeMetrics.avgTimeCorrect / 1000)}s</Text>
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Average time on incorrect answers:</Text>
          <Text style={styles.timeValue}>{Math.round(timeMetrics.avgTimeIncorrect / 1000)}s</Text>
        </View>
      </View>

      {categoryPerformance && (
        <>
          <Text style={styles.sectionTitle}>Category Performance</Text>
          <View style={styles.categoryCard}>
            <Text style={styles.categoryName}>
              {categoryPerformance.category.charAt(0).toUpperCase() +
                categoryPerformance.category.slice(1)}
            </Text>
            <Text style={styles.categoryScore}>{categoryPerformance.percentage}% Accuracy</Text>
          </View>
        </>
      )}
    </View>
  );

  const renderWeaknessesTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Areas for Improvement</Text>

      {performanceAnalysis.weaknessQuestions.length > 0 ? (
        <FlatList
          data={performanceAnalysis.weaknessQuestions}
          renderItem={({ item }) => (
            <View style={styles.weaknessItem}>
              <Text style={styles.weaknessQuestion}>{item.question}</Text>
              <View style={styles.answerRow}>
                <Text style={styles.answerLabel}>Your answer:</Text>
                <Text style={styles.wrongAnswer}>{item.selectedAnswer}</Text>
              </View>
              <View style={styles.answerRow}>
                <Text style={styles.answerLabel}>Correct answer:</Text>
                <Text style={styles.correctAnswer}>{item.correctAnswer}</Text>
              </View>
              <View style={styles.timeIndicator}>
                <Ionicons name="time-outline" size={14} color="#6B7280" />
                <Text style={styles.timeIndicatorText}>{Math.round(item.timeSpent / 1000)}s</Text>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.questionId}
          contentContainerStyle={styles.weaknessList}
        />
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="checkmark-circle" size={50} color="#10B981" />
          <Text style={styles.emptyStateText}>Great job! No incorrect answers.</Text>
        </View>
      )}

      {performanceAnalysis.improvementQuestions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Correct But Slow</Text>
          <FlatList
            data={performanceAnalysis.improvementQuestions}
            renderItem={({ item }) => (
              <View style={styles.improvementItem}>
                <Text style={styles.improvementQuestion}>{item.question}</Text>
                <View style={styles.timeIndicator}>
                  <Ionicons name="time-outline" size={14} color="#6B7280" />
                  <Text style={styles.timeIndicatorText}>{item.timeSpent}s (above average)</Text>
                </View>
              </View>
            )}
            keyExtractor={(item) => item.questionId}
            contentContainerStyle={styles.improvementList}
          />
        </>
      )}
    </View>
  );

  const renderSuggestionsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>How to Improve</Text>

      <View style={styles.suggestionsContainer}>
        {improvementSuggestions.map((suggestion, index) => (
          <View key={index} style={styles.suggestionItem}>
            <View style={styles.suggestionIconContainer}>
              <Ionicons name="bulb" size={20} color="#6366F1" />
            </View>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        ))}
      </View>

      <View style={styles.nextStepsContainer}>
        <Text style={styles.nextStepsTitle}>Next Steps</Text>

        <TouchableOpacity style={styles.nextStepButton}>
          <Ionicons name="refresh" size={18} color="#6366F1" />
          <Text style={styles.nextStepButtonText}>Retry This Quiz</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nextStepButton}>
          <Ionicons name="search" size={18} color="#6366F1" />
          <Text style={styles.nextStepButtonText}>Find Similar Quizzes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.nextStepButton, styles.primaryButton]}>
          <Ionicons name="list" size={18} color="#FFFFFF" />
          <Text style={[styles.nextStepButtonText, styles.primaryButtonText]}>
            Return to All Quizzes
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && styles.activeTab]}
          onPress={() => setActiveTab("overview")}
        >
          <Ionicons
            name="stats-chart"
            size={18}
            color={activeTab === "overview" ? "#6366F1" : "#6B7280"}
          />
          <Text style={[styles.tabText, activeTab === "overview" && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "weaknesses" && styles.activeTab]}
          onPress={() => setActiveTab("weaknesses")}
        >
          <Ionicons
            name="alert-circle"
            size={18}
            color={activeTab === "weaknesses" ? "#6366F1" : "#6B7280"}
          />
          <Text style={[styles.tabText, activeTab === "weaknesses" && styles.activeTabText]}>
            Weaknesses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "suggestions" && styles.activeTab]}
          onPress={() => setActiveTab("suggestions")}
        >
          <Ionicons
            name="bulb"
            size={18}
            color={activeTab === "suggestions" ? "#6366F1" : "#6B7280"}
          />
          <Text style={[styles.tabText, activeTab === "suggestions" && styles.activeTabText]}>
            Improve
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "weaknesses" && renderWeaknessesTab()}
        {activeTab === "suggestions" && renderSuggestionsTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 16,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#6366F1",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginLeft: 6,
  },
  activeTabText: {
    color: "#6366F1",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
    marginTop: 8,
  },
  statsCards: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statsCard: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginHorizontal: 4,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6366F1",
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  comparisonContainer: {
    marginBottom: 20,
  },
  comparisonBar: {
    flexDirection: "row",
    height: 20,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
  },
  comparisonFill: {
    height: "100%",
  },
  correctFill: {
    backgroundColor: "#10B981",
  },
  incorrectFill: {
    backgroundColor: "#EF4444",
  },
  comparisonLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  comparisonLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  timeAnalysis: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  timeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  categoryCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
    marginBottom: 4,
  },
  categoryScore: {
    fontSize: 14,
    color: "#1F2937",
  },
  weaknessItem: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  weaknessQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  answerLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginRight: 8,
    width: 100,
  },
  wrongAnswer: {
    fontSize: 14,
    color: "#B91C1C",
    flex: 1,
  },
  correctAnswer: {
    fontSize: 14,
    color: "#047857",
    fontWeight: "500",
    flex: 1,
  },
  timeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  timeIndicatorText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  weaknessList: {
    paddingBottom: 12,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#10B981",
    marginTop: 12,
    textAlign: "center",
  },
  improvementItem: {
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  improvementQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  improvementList: {
    paddingBottom: 12,
  },
  suggestionsContainer: {
    marginBottom: 24,
  },
  suggestionItem: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
  },
  suggestionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: "#1F2937",
    flex: 1,
  },
  nextStepsContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 16,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  nextStepButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  nextStepButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: "#6366F1",
  },
  primaryButtonText: {
    color: "#FFFFFF",
  },
});

export default QuizAnalysis;
