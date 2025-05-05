import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Animated } from "react-native";
import {
  getAvailableQuizzes,
  getKnowledgeQuestStats,
} from "../../../services/LearnScreen/knowledgeQuestService";
import { Quiz, KnowledgeQuestStats } from "../../../types/LearnScreen/KnowledgeQuestTypes";

const { width } = Dimensions.get("window");

interface KnowledgeQuestCardProps {
  cardAnimation: Animated.Value;
  navigation: any;
  onStartQuiz: (quiz: Quiz) => void;
}

const KnowledgeQuestCard = ({
  cardAnimation,
  navigation,
  onStartQuiz,
}: KnowledgeQuestCardProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<KnowledgeQuestStats | null>(null);
  const [featuredQuiz, setFeaturedQuiz] = useState<Quiz | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const userStats = await getKnowledgeQuestStats();
      setStats(userStats);

      const availableQuizzes = await getAvailableQuizzes(5);
      setQuizzes(availableQuizzes);

      if (availableQuizzes.length > 0) {
        const uncompletedQuiz = availableQuizzes.find((quiz) => !quiz.lastCompletedAt);
        setFeaturedQuiz(uncompletedQuiz || availableQuizzes[0]);
      }
    } catch (error) {
      console.error("Error loading Knowledge Quest data:", error);
      setError("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    if (featuredQuiz) {
      onStartQuiz(featuredQuiz);
    }
  };

  const handleViewAll = () => {
    navigation.navigate("KnowledgeQuestScreen");
  };

  // Render loading state
  const renderLoading = () => (
    <View style={styles.contentContainer}>
      <ActivityIndicator size="small" color="#FFFFFF" />
      <Text style={styles.loadingText}>Loading quizzes...</Text>
    </View>
  );

  // Render error state
  const renderError = () => (
    <View style={styles.contentContainer}>
      <Ionicons name="alert-circle-outline" size={32} color="#FFFFFF" />
      <Text style={styles.errorTitle}>Oops!</Text>
      <Text style={styles.errorText}>We couldn't load your quizzes</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadData}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.contentContainer}>
      <Ionicons name="school-outline" size={36} color="#FFFFFF" />
      <Text style={styles.emptyTitle}>Start Learning</Text>
      <Text style={styles.emptyText}>
        Take quizzes to test your travel knowledge and earn badges
      </Text>
    </View>
  );

  const renderContent = () => {
    if (!featuredQuiz) return renderEmpty();

    return (
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.cardTitle}>Knowledge Quest</Text>
            <View style={styles.badgeContainer}>
              <Ionicons name="school" size={12} color="#FFFFFF" />
              <Text style={styles.badgeText}>Fun Learning</Text>
            </View>
          </View>

          {stats && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalQuizzesTaken}</Text>
                <Text style={styles.statLabel}>Quizzes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.accuracy}%</Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.level}</Text>
                <Text style={styles.statLabel}>Level</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.featuredContainer}>
          <Text style={styles.featuredLabel}>Featured Quiz</Text>
          <Text style={styles.featuredTitle}>{featuredQuiz.title}</Text>

          <View style={styles.quizDetails}>
            <View style={styles.quizDetail}>
              <Ionicons name="help-circle" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.quizDetailText}>{featuredQuiz.questions.length} questions</Text>
            </View>
            <View style={styles.quizDetail}>
              <Ionicons name="speedometer" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.quizDetailText}>
                {featuredQuiz.difficulty.charAt(0).toUpperCase() + featuredQuiz.difficulty.slice(1)}
              </Text>
            </View>
            <View style={styles.quizDetail}>
              <Ionicons name="time" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.quizDetailText}>~{featuredQuiz.questions.length * 1.5} min</Text>
            </View>
          </View>

          <Text style={styles.quizDescription} numberOfLines={2}>
            {featuredQuiz.description}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: cardAnimation,
          transform: [
            {
              translateY: cardAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity style={styles.cardContainer} activeOpacity={0.9} onPress={handleViewAll}>
        <LinearGradient
          colors={["#6366F1", "#4F46E5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? renderLoading() : error ? renderError() : renderContent()}

          <View style={styles.footer}>
            {!loading && !error && featuredQuiz && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartQuiz}
                activeOpacity={0.8}
              >
                <Text style={styles.startButtonText}>Start Quiz</Text>
                <Ionicons name="play" size={16} color="#4F46E5" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={handleViewAll}
              activeOpacity={0.8}
            >
              <Text style={styles.viewAllText}>
                {quizzes.length > 0 ? `View All (${quizzes.length})` : "Browse Quizzes"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: -8,
    marginBottom: 24,
  },
  cardContainer: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  gradient: {
    minHeight: 220,
    justifyContent: "space-between",
  },
  contentContainer: {
    padding: 24,
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
  },
  statDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
  },
  featuredContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  featuredLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  quizDetails: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  quizDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  quizDetailText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginLeft: 4,
  },
  quizDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255, 255, 255, 0.9)",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    gap: 12,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
    marginRight: 6,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginRight: 6,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 12,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "center",
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});

export default KnowledgeQuestCard;
