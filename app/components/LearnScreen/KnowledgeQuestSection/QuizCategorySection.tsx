// components/LearnScreen/KnowledgeQuestSection/QuizCategorySection.tsx
import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { Quiz } from "../../../types/LearnScreen/KnowledgeQuestTypes";
import QuizCard from "./QuizCard";

interface QuizCategorySectionProps {
  category: string;
  quizzes: Quiz[];
  onStartQuiz: (quiz: Quiz) => void;
  showRegion?: boolean;
}

const QuizCategorySection: React.FC<QuizCategorySectionProps> = ({
  category,
  quizzes,
  onStartQuiz,
  showRegion = false,
}) => {
  // Get regions from the first quiz if any (for region-specific quizzes)
  const regions =
    quizzes.length > 0
      ? quizzes[0].relatedRegions?.filter((r) => r !== "World" && r !== "world")
      : [];

  return (
    <View style={styles.categorySection}>
      <Text style={styles.categoryTitle}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Text>

      {showRegion && regions && regions.length > 0 && (
        <Text style={styles.regionSubtitle}>Based on {regions.join(", ")}</Text>
      )}

      <FlatList
        data={quizzes}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <QuizCard quiz={item} onStartQuiz={onStartQuiz} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.quizCardContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 4,
  },
  regionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: -2,
    marginBottom: 8,
    fontStyle: "italic",
  },
  quizCardContainer: {
    paddingRight: 16,
  },
});

export default QuizCategorySection;
