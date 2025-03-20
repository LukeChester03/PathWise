// components/LearnScreen/KnowledgeQuestSection/BadgesTabContent.tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { TravelBadge } from "../../../types/LearnScreen/TravelProfileTypes";
import BadgeItem from "./BadgeItem";
import EmptyState from "./EmptyState";

interface BadgesTabContentProps {
  badges: TravelBadge[];
  refreshing: boolean;
  onRefresh: () => void;
  onStartQuiz: () => void;
}

const BadgesTabContent: React.FC<BadgesTabContentProps> = ({
  badges,
  refreshing,
  onRefresh,
  onStartQuiz,
}) => {
  // Filter quiz-related badges
  const quizBadges = badges.filter((badge) =>
    badge.requirements.some((req) =>
      ["quizCount", "quizStreak", "quizScore", "quizCorrect", "quizAccuracy"].includes(req.type)
    )
  );

  if (quizBadges.length === 0) {
    return (
      <EmptyState
        icon="ribbon-outline"
        title="No Badges Earned Yet"
        message="Complete quizzes to earn badges for your achievements."
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
      <Text style={styles.sectionTitle}>Quiz Badges</Text>

      <View style={styles.badgesGrid}>
        {quizBadges.map((badge) => (
          <BadgeItem key={badge.id} badge={badge} />
        ))}
      </View>

      {/* Add padding at bottom for better scrolling */}
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
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
  },
});

export default BadgesTabContent;
