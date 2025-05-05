import React from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { QuizResult } from "../../../types/LearnScreen/KnowledgeQuestTypes";
import ResultCard from "./ResultCard";
import EmptyState from "./EmptyState";

interface ResultsTabContentProps {
  results: QuizResult[];
  refreshing: boolean;
  onRefresh: () => void;
  onStartQuiz: () => void;
}

const ResultsTabContent: React.FC<ResultsTabContentProps> = ({
  results,
  refreshing,
  onRefresh,
  onStartQuiz,
}) => {
  if (results.length === 0) {
    return (
      <EmptyState
        icon="trophy-outline"
        title="No Quiz Results Yet"
        message="Complete a quiz to see your results here."
        buttonText="Start a Quiz"
        buttonIcon="play"
        onButtonPress={onStartQuiz}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={true}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.sectionTitle}>Recent Results</Text>

      {results.map((result) => (
        <ResultCard key={result.id} result={result} />
      ))}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
});

export default ResultsTabContent;
