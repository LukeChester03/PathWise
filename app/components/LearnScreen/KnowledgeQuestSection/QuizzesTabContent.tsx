import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Quiz } from "../../../types/LearnScreen/KnowledgeQuestTypes";
import QuizCategorySection from "./QuizCategorySection";
import EmptyState from "./EmptyState";

interface QuizzesTabContentProps {
  quizzes: Quiz[];
  refreshing: boolean;
  onRefresh: () => void;
  onStartQuiz: (quiz: Quiz) => void;
}

const QuizzesTabContent: React.FC<QuizzesTabContentProps> = ({
  quizzes,
  refreshing,
  onRefresh,
  onStartQuiz,
}) => {
  if (quizzes.length === 0) {
    return (
      <EmptyState
        icon="help-circle-outline"
        title="No Quizzes Available"
        message="We couldn't find any quizzes. Pull down to refresh and generate new quizzes."
        buttonText="Refresh Quizzes"
        buttonIcon="refresh"
        onButtonPress={onRefresh}
      />
    );
  }

  //checks they are no duplicate quizzes
  const uniqueQuizMap = new Map<string, Quiz>();
  quizzes.forEach((quiz) => {
    if (!uniqueQuizMap.has(quiz.id)) {
      uniqueQuizMap.set(quiz.id, quiz);
    } else {
      const existingQuiz = uniqueQuizMap.get(quiz.id)!;
      if ((quiz.completions || 0) > (existingQuiz.completions || 0)) {
        uniqueQuizMap.set(quiz.id, quiz);
      }
    }
  });

  const uniqueQuizzes = Array.from(uniqueQuizMap.values());

  const regionQuizzes: Quiz[] = [];
  const generalQuizzes: Quiz[] = [];

  uniqueQuizzes.forEach((quiz) => {
    if (
      quiz.relatedRegions &&
      quiz.relatedRegions.length > 0 &&
      !quiz.relatedRegions.includes("World") &&
      !quiz.relatedRegions.includes("world")
    ) {
      regionQuizzes.push(quiz);
    } else {
      generalQuizzes.push(quiz);
    }
  });

  // Group quizzes by category
  const regionQuizzesByCategory = regionQuizzes.reduce((acc, quiz) => {
    if (!acc[quiz.category]) {
      acc[quiz.category] = [];
    }
    acc[quiz.category].push(quiz);
    return acc;
  }, {} as Record<string, Quiz[]>);

  const generalQuizzesByCategory = generalQuizzes.reduce((acc, quiz) => {
    if (!acc[quiz.category]) {
      acc[quiz.category] = [];
    }
    acc[quiz.category].push(quiz);
    return acc;
  }, {} as Record<string, Quiz[]>);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={true}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Quizzes ({uniqueQuizzes.length})</Text>
        <TouchableOpacity style={styles.refreshIconButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={16} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <View style={styles.quizExplanationCard}>
        <Ionicons name="information-circle" size={22} color="#6366F1" style={styles.infoIcon} />
        <Text style={styles.quizExplanationText}>
          Quizzes are based on places you've visited. Discover more locations to unlock
          region-specific quizzes!
        </Text>
      </View>

      {Object.keys(regionQuizzesByCategory).length > 0 ? (
        <View style={styles.quizGroupContainer}>
          <View style={styles.quizGroupHeader}>
            <Ionicons name="location" size={18} color="#6366F1" />
            <Text style={styles.quizGroupTitle}>Region-Specific Quizzes</Text>
          </View>

          {Object.entries(regionQuizzesByCategory).map(([category, categoryQuizzes]) => (
            <QuizCategorySection
              key={`region-${category}`}
              category={category}
              quizzes={categoryQuizzes}
              onStartQuiz={onStartQuiz}
              showRegion={true}
            />
          ))}
        </View>
      ) : (
        <View style={styles.noRegionQuizzesContainer}>
          <Ionicons name="map-outline" size={40} color="#9CA3AF" />
          <Text style={styles.noRegionQuizzesTitle}>No Region-Specific Quizzes Yet</Text>
          <Text style={styles.noRegionQuizzesText}>
            Visit more places to unlock quizzes based on your travels!
          </Text>
        </View>
      )}

      {Object.keys(generalQuizzesByCategory).length > 0 && (
        <View style={styles.quizGroupContainer}>
          <View style={styles.quizGroupHeader}>
            <Ionicons name="globe" size={18} color="#6366F1" />
            <Text style={styles.quizGroupTitle}>General Travel Quizzes</Text>
          </View>

          {Object.entries(generalQuizzesByCategory).map(([category, categoryQuizzes]) => (
            <QuizCategorySection
              key={`general-${category}`}
              category={category}
              quizzes={categoryQuizzes}
              onStartQuiz={onStartQuiz}
              showRegion={false}
            />
          ))}
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  refreshIconButton: {
    padding: 8,
  },
  quizExplanationCard: {
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  infoIcon: {
    marginRight: 10,
  },
  quizExplanationText: {
    flex: 1,
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  quizGroupContainer: {
    marginBottom: 24,
  },
  quizGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  quizGroupTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 8,
  },
  noRegionQuizzesContainer: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  noRegionQuizzesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 12,
    marginBottom: 6,
  },
  noRegionQuizzesText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    maxWidth: "80%",
  },
});

export default QuizzesTabContent;
