// components/LearnScreen/KnowledgeQuest/KnowledgeQuestCard.tsx
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Animated } from "react-native";
import {
  getAvailableQuizzes,
  getKnowledgeQuestStats,
} from "../../../services/LearnScreen/knowledgeQuestService";
import { Quiz, KnowledgeQuestStats } from "../../../types/LearnScreen/KnowledgeQuestTypes";

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
  const [stats, setStats] = useState<KnowledgeQuestStats | null>(null);
  const [featuredQuiz, setFeaturedQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load stats
        const userStats = await getKnowledgeQuestStats();
        setStats(userStats);

        // Get a featured quiz
        const quizzes = await getAvailableQuizzes(5);
        if (quizzes.length > 0) {
          // Find a quiz that hasn't been completed yet, or use the first one
          const uncompletedQuiz = quizzes.find((quiz) => !quiz.lastCompletedAt);
          setFeaturedQuiz(uncompletedQuiz || quizzes[0]);
        }
      } catch (error) {
        console.error("Error loading Knowledge Quest data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleStartQuiz = () => {
    if (featuredQuiz) {
      onStartQuiz(featuredQuiz);
    }
  };

  const handleViewAll = () => {
    navigation.navigate("KnowledgeQuestScreen");
  };

  if (loading) {
    return (
      <Animated.View
        style={[
          styles.knowledgeQuestCard,
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
        <LinearGradient
          colors={["#8B5CF6", "#6366F1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.knowledgeQuestGradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading quizzes...</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.knowledgeQuestCard,
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
      <LinearGradient
        colors={["#8B5CF6", "#6366F1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.knowledgeQuestGradient}
      >
        <View style={styles.knowledgeQuestContent}>
          <View style={styles.knowledgeQuestHeader}>
            <Text style={styles.knowledgeQuestTitle}>Knowledge Quest</Text>
            <View style={styles.knowledgeQuestBadge}>
              <Ionicons name="school" size={12} color="#FFFFFF" />
              <Text style={styles.knowledgeQuestBadgeText}>Fun Learning</Text>
            </View>
          </View>

          <Text style={styles.knowledgeQuestDescription}>
            Test your knowledge about places you've visited and earn badges!
          </Text>

          {stats && (
            <View style={styles.knowledgeQuestStatsRow}>
              <View style={styles.knowledgeQuestStat}>
                <Text style={styles.knowledgeQuestStatValue}>{stats.totalQuizzesTaken}</Text>
                <Text style={styles.knowledgeQuestStatLabel}>Quizzes</Text>
              </View>

              <View style={styles.knowledgeQuestStat}>
                <Text style={styles.knowledgeQuestStatValue}>{stats.accuracy}%</Text>
                <Text style={styles.knowledgeQuestStatLabel}>Accuracy</Text>
              </View>

              <View style={styles.knowledgeQuestStat}>
                <Text style={styles.knowledgeQuestStatValue}>{stats.level}</Text>
                <Text style={styles.knowledgeQuestStatLabel}>Level</Text>
              </View>
            </View>
          )}

          {featuredQuiz ? (
            <View style={styles.featuredQuizContainer}>
              <Text style={styles.featuredQuizLabel}>Featured Quiz</Text>
              <Text style={styles.featuredQuizTitle}>{featuredQuiz.title}</Text>
              <View style={styles.featuredQuizDetails}>
                <View style={styles.featuredQuizDetail}>
                  <Ionicons name="help-circle" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.featuredQuizDetailText}>
                    {featuredQuiz.questions.length} questions
                  </Text>
                </View>
                <View style={styles.featuredQuizDetail}>
                  <Ionicons name="speedometer" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.featuredQuizDetailText}>{featuredQuiz.difficulty}</Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.noQuizText}>No quizzes available. Check back soon!</Text>
          )}

          <View style={styles.buttonContainer}>
            {featuredQuiz && (
              <TouchableOpacity style={styles.startKnowledgeQuestButton} onPress={handleStartQuiz}>
                <Text style={styles.startKnowledgeQuestButtonText}>Start Quiz</Text>
                <Ionicons name="play" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll}>
              <Text style={styles.viewAllButtonText}>View All Quizzes</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  knowledgeQuestCard: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  knowledgeQuestGradient: {
    borderRadius: 16,
  },
  knowledgeQuestContent: {
    padding: 20,
  },
  knowledgeQuestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  knowledgeQuestTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  knowledgeQuestBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  knowledgeQuestBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  knowledgeQuestDescription: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 16,
  },
  knowledgeQuestStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  knowledgeQuestStat: {
    alignItems: "center",
    flex: 1,
  },
  knowledgeQuestStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  knowledgeQuestStatLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 8,
    fontSize: 14,
  },
  featuredQuizContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  featuredQuizLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  featuredQuizTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  featuredQuizDetails: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  featuredQuizDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  featuredQuizDetailText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginLeft: 4,
  },
  noQuizText: {
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginVertical: 16,
    fontStyle: "italic",
  },
  buttonContainer: {
    gap: 12,
  },
  startKnowledgeQuestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 12,
  },
  startKnowledgeQuestButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
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
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginRight: 6,
  },
});

export default KnowledgeQuestCard;
