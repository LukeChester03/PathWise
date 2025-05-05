import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, StatusBar, Text } from "react-native";
import { Colors } from "../constants/colours";
import {
  getAvailableQuizzes,
  getKnowledgeQuestStats,
  refreshQuizzes,
  getAllQuizResults,
} from "../services/LearnScreen/knowledgeQuestService";
import { Quiz, QuizResult, KnowledgeQuestStats } from "../types/LearnScreen/KnowledgeQuestTypes";
import { TravelBadge } from "../types/LearnScreen/TravelProfileTypes";
import { getAllUserBadges } from "../services/LearnScreen/badgeService";
import Header from "../components/Global/Header";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";

import StatsHeader from "../components/LearnScreen/KnowledgeQuestSection/StatsHeader";
import TabBar, { TabType } from "../components/LearnScreen/KnowledgeQuestSection/TabBar";
import QuizzesTabContent from "../components/LearnScreen/KnowledgeQuestSection/QuizzesTabContent";
import ResultsTabContent from "../components/LearnScreen/KnowledgeQuestSection/ResultsTabContent";
import BadgesTabContent from "../components/LearnScreen/KnowledgeQuestSection/BadgesTabContent";

const KnowledgeQuestScreen = ({ navigation }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState<KnowledgeQuestStats | null>(null);
  const [recentResults, setRecentResults] = useState<QuizResult[]>([]);
  const [badges, setBadges] = useState<TravelBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("quizzes");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (navigation.route && navigation.route.params && navigation.route.params.activeTab) {
      setActiveTab(navigation.route.params.activeTab as TabType);
    }
  }, [navigation.route]);

  const loadData = async () => {
    try {
      setLoading(true);

      let userStats;
      let availableQuizzes;
      let results;
      let userBadges;

      try {
        userStats = await getKnowledgeQuestStats();
        setStats(userStats);
      } catch (statsError) {
        console.error("Error loading quiz stats:", statsError);
      }

      try {
        availableQuizzes = await getAvailableQuizzes(30);
        const uniqueQuizMap = new Map<string, Quiz>();
        availableQuizzes.forEach((quiz) => {
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

        uniqueQuizzes.sort((a, b) => (a.completions || 0) - (b.completions || 0));

        const finalQuizzes = uniqueQuizzes.slice(0, 20);

        console.log(
          `Found ${availableQuizzes.length} quizzes, deduplicated to ${uniqueQuizzes.length}, showing ${finalQuizzes.length}`
        );
        setQuizzes(finalQuizzes);
      } catch (quizzesError) {
        console.error("Error loading available quizzes:", quizzesError);
      }

      try {
        results = await getAllQuizResults(5);
        setRecentResults(results);
      } catch (resultsError) {
        console.error("Error loading quiz results:", resultsError);
      }

      try {
        userBadges = await getAllUserBadges();
        const quizBadges = userBadges.filter((badge) =>
          badge.requirements.some((req) =>
            ["quizCount", "quizStreak", "quizScore", "quizCorrect", "quizAccuracy"].includes(
              req.type
            )
          )
        );
        setBadges(quizBadges);
      } catch (badgesError) {
        console.error("Error loading badges:", badgesError);
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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
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

    switch (activeTab) {
      case "quizzes":
        return (
          <QuizzesTabContent
            quizzes={quizzes}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onStartQuiz={handleStartQuiz}
          />
        );
      case "results":
        return (
          <ResultsTabContent
            results={recentResults}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onStartQuiz={() => setActiveTab("quizzes")}
          />
        );
      case "badges":
        return (
          <BadgesTabContent
            badges={badges}
            refreshing={refreshing}
            onRefresh={loadData}
            onStartQuiz={() => setActiveTab("quizzes")}
          />
        );
      default:
        return null;
    }
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

        <StatsHeader stats={stats} />
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
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
});

export default KnowledgeQuestScreen;
