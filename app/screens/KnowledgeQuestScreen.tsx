// screens/KnowledgeQuestScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  StatusBar,
  SafeAreaView,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../constants/colours";
import {
  getAvailableQuizzes,
  getKnowledgeQuestStats,
  refreshQuizzes,
  getAllQuizResults,
} from "../services/LearnScreen/knowledgeQuestService";
import { Quiz, QuizResult, KnowledgeQuestStats } from "../types/LearnScreen/KnowledgeQuestTypes";
import QuizCard from "../components/LearnScreen/KnowledgeQuestSection/QuizCard";
import Header from "../components/Global/Header";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";

const KnowledgeQuestScreen = ({ navigation }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState<KnowledgeQuestStats | null>(null);
  const [recentResults, setRecentResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("quizzes");
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Check if route.params exists and contains activeTab
    if (navigation.route && navigation.route.params && navigation.route.params.activeTab) {
      setActiveTab(navigation.route.params.activeTab);
    }
  }, [navigation.route]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Make separate calls instead of Promise.all for better error handling
      let userStats;
      let availableQuizzes;
      let results;

      try {
        userStats = await getKnowledgeQuestStats();
        setStats(userStats);
      } catch (statsError) {
        console.error("Error loading quiz stats:", statsError);
      }

      try {
        availableQuizzes = await getAvailableQuizzes(20);
        setQuizzes(availableQuizzes);
      } catch (quizzesError) {
        console.error("Error loading available quizzes:", quizzesError);
      }

      try {
        results = await getAllQuizResults(5); // Pass number directly
        setRecentResults(results);
      } catch (resultsError) {
        console.error("Error loading quiz results:", resultsError);
      }
    } catch (error) {
      console.error("Error loading Knowledge Quest data:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshQuizzes();
      await loadData();
    } catch (error) {
      console.error("Error refreshing quizzes:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleStartQuiz = (quiz: Quiz) => {
    navigation.navigate("QuizSession", { quizId: quiz.id });
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={["#8B5CF6", "#6366F1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.statsContainer}>
            {stats ? (
              <>
                <View style={styles.topStatsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.level}</Text>
                    <Text style={styles.statLabel}>Level</Text>
                  </View>

                  <View style={styles.levelProgressContainer}>
                    <View style={styles.levelProgress}>
                      <View
                        style={[
                          styles.levelProgressFill,
                          { width: `${100 - (stats.pointsToNextLevel / 150) * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.levelProgressText}>
                      {stats.pointsToNextLevel} points to next level
                    </Text>
                  </View>
                </View>

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
                    <Text style={styles.statValue}>{stats.streakDays}</Text>
                    <Text style={styles.statLabel}>Day Streak</Text>
                  </View>
                </View>
              </>
            ) : (
              <ActivityIndicator color="#FFFFFF" size="small" />
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderTabs = () => {
    return (
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "quizzes" && styles.activeTab]}
          onPress={() => setActiveTab("quizzes")}
        >
          <Ionicons
            name="help-circle"
            size={18}
            color={activeTab === "quizzes" ? "#6366F1" : "#6B7280"}
          />
          <Text style={[styles.tabText, activeTab === "quizzes" && styles.activeTabText]}>
            Quizzes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "results" && styles.activeTab]}
          onPress={() => setActiveTab("results")}
        >
          <Ionicons
            name="trophy"
            size={18}
            color={activeTab === "results" ? "#6366F1" : "#6B7280"}
          />
          <Text style={[styles.tabText, activeTab === "results" && styles.activeTabText]}>
            Results
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "badges" && styles.activeTab]}
          onPress={() => setActiveTab("badges")}
        >
          <Ionicons
            name="ribbon"
            size={18}
            color={activeTab === "badges" ? "#6366F1" : "#6B7280"}
          />
          <Text style={[styles.tabText, activeTab === "badges" && styles.activeTabText]}>
            Badges
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Knowledge Quest data...</Text>
        </View>
      );
    }

    if (activeTab === "quizzes") {
      return renderQuizzesTab();
    } else if (activeTab === "results") {
      return renderResultsTab();
    } else if (activeTab === "badges") {
      return renderBadgesTab();
    }
  };

  const renderQuizzesTab = () => {
    if (quizzes.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="help-circle-outline" size={60} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>No Quizzes Available</Text>
          <Text style={styles.emptyStateText}>
            We couldn't find any quizzes. Pull down to refresh and generate new quizzes.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.refreshButtonText}>Refresh Quizzes</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Group quizzes by category
    const quizzesByCategory = quizzes.reduce((acc, quiz) => {
      if (!acc[quiz.category]) {
        acc[quiz.category] = [];
      }
      acc[quiz.category].push(quiz);
      return acc;
    }, {} as Record<string, Quiz[]>);

    return (
      <View style={styles.quizzesContainer}>
        <FlatList
          data={Object.entries(quizzesByCategory)}
          renderItem={({ item: [category, categoryQuizzes] }) => (
            <View style={styles.categorySection}>
              <Text style={styles.categoryTitle}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
              <FlatList
                data={categoryQuizzes}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => <QuizCard quiz={item} onStartQuiz={handleStartQuiz} />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.quizCardContainer}
              />
            </View>
          )}
          keyExtractor={(item) => item[0]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={() => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Quizzes</Text>
              <TouchableOpacity style={styles.refreshIconButton} onPress={handleRefresh}>
                <Ionicons name="refresh" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    );
  };

  const renderResultsTab = () => {
    if (recentResults.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="trophy-outline" size={60} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>No Quiz Results Yet</Text>
          <Text style={styles.emptyStateText}>Complete a quiz to see your results here.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => setActiveTab("quizzes")}>
            <Ionicons name="play" size={16} color="#FFFFFF" />
            <Text style={styles.refreshButtonText}>Start a Quiz</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.sectionTitle}>Recent Results</Text>

        {recentResults.map((result) => (
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
                <Text style={styles.resultDetailText}>
                  {Math.round(result.timeSpent / 1000)} seconds
                </Text>
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
        ))}
      </View>
    );
  };

  const renderBadgesTab = () => {
    // This would be fetched from badge service
    const quizBadges = stats?.badges || [];

    return (
      <View style={styles.badgesContainer}>
        <Text style={styles.sectionTitle}>Quiz Badges</Text>

        {quizBadges.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="ribbon-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Badges Earned Yet</Text>
            <Text style={styles.emptyStateText}>
              Complete quizzes to earn badges for your achievements.
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={() => setActiveTab("quizzes")}>
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>Start a Quiz</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.comingSoonText}>
            Badges feature will display here once you earn them!
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScreenWithNavBar>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      <View style={styles.container}>
        <Header
          title="Knowledge Quest"
          subtitle="Test your travel knowledge"
          showBackButton
          onBackPress={() => navigation.goBack()}
          showIcon={false}
          iconName="school"
          iconColor="#6366F1"
          showHelp={false}
        />

        {renderHeader()}
        {renderTabs()}
        {renderContent()}
      </View>
    </ScreenWithNavBar>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  headerGradient: {
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  statsContainer: {
    padding: 16,
  },
  topStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statCard: {
    alignItems: "center",
    marginRight: 16,
  },
  levelProgressContainer: {
    flex: 1,
  },
  levelProgress: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  levelProgressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  levelProgressText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 8,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 4,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#6366F1",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  quizzesContainer: {
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
  },
  refreshIconButton: {
    padding: 8,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 12,
  },
  quizCardContainer: {
    paddingRight: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4B5563",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366F1",
    padding: 12,
    borderRadius: 10,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
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
  badgesContainer: {
    flex: 1,
    padding: 16,
  },
  comingSoonText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 40,
    fontStyle: "italic",
  },
});

export default KnowledgeQuestScreen;
