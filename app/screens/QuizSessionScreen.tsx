// screens/QuizSessionScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Animated,
  Alert,
  BackHandler,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../constants/colours";
import {
  getQuizById,
  recordQuizCompletion,
  getKnowledgeQuestStats,
} from "../services/LearnScreen/knowledgeQuestService";
import { Quiz, QuizResult } from "../types/LearnScreen/KnowledgeQuestTypes";
import { useFocusEffect } from "@react-navigation/native";
import Header from "../components/Global/Header";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import QuizAnalysis from "../components/LearnScreen/KnowledgeQuestSection/QuizAnalysis";
import {
  checkScoreBadges,
  updateQuizBadgeProgress,
} from "../services/LearnScreen/knowledgeQuestBadgeService";
import { getAllUserBadges } from "../services/LearnScreen/badgeService";
import { TravelBadge } from "../types/LearnScreen/TravelProfileTypes";
import BadgeEarnedNotification from "../components/LearnScreen/KnowledgeQuestSection/BadgeEarnedNotification";
import { awardQuizCompletionXP, awardBadgeCompletionXP } from "../services/Levelling/quizXpService";
import XPEarnedNotification from "../components/LearnScreen/KnowledgeQuestSection/XpEarnedNotification";

// Define result flow steps
type ResultStep = "QUIZ" | "RESULTS" | "XP" | "BADGE";

const QuizSessionScreen = ({ navigation, route }) => {
  const { quizId } = route.params;
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [answers, setAnswers] = useState<
    {
      questionId: string;
      selectedAnswerIndex: number;
      isCorrect: boolean;
      timeSpent: number;
    }[]
  >([]);
  const [showingExplanation, setShowingExplanation] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<TravelBadge[]>([]);
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);
  const [earnedXP, setEarnedXP] = useState<{
    totalXP: number;
    breakdown: { reason: string; amount: number }[];
  }>({ totalXP: 0, breakdown: [] });
  const [badgeXP, setBadgeXP] = useState<number>(0);

  // Track which step of the result flow we're in
  const [resultStep, setResultStep] = useState<ResultStep>("QUIZ");

  const scrollViewRef = useRef<ScrollView>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadQuiz();

    // Record question start time
    setQuestionStartTime(Date.now());
  }, []);

  useEffect(() => {
    // Scroll to top when moving to a new question
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
    }
  }, [currentQuestionIndex]);

  // Scroll to the bottom to make "Next" button visible when explanation shows
  useEffect(() => {
    if (showingExplanation && scrollViewRef.current) {
      // Use setTimeout to ensure the explanation view has rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [showingExplanation]);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (!quizComplete) {
          Alert.alert("Quit Quiz?", "Your progress will be lost if you leave now.", [
            { text: "Stay", style: "cancel" },
            { text: "Quit", style: "destructive", onPress: () => navigation.goBack() },
          ]);
          return true;
        }
        return false;
      };

      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [quizComplete])
  );

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const loadedQuiz = await getQuizById(quizId);

      if (!loadedQuiz) {
        Alert.alert("Error", "Could not load quiz. Please try again later.");
        navigation.goBack();
        return;
      }

      setQuiz(loadedQuiz);
    } catch (error) {
      console.error("Error loading quiz:", error);
      Alert.alert("Error", "Could not load quiz. Please try again later.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (!answerSubmitted) {
      setSelectedAnswerIndex(answerIndex);
    }
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswerIndex === null || answerSubmitted || !quiz) return;

    // Calculate time spent on question
    const timeSpent = Date.now() - questionStartTime;

    // Get current question
    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isCorrect = selectedAnswerIndex === currentQuestion.correctAnswerIndex;

    // Add answer to answers array
    setAnswers([
      ...answers,
      {
        questionId: currentQuestion.id,
        selectedAnswerIndex,
        isCorrect,
        timeSpent,
      },
    ]);

    // Mark answer as submitted
    setAnswerSubmitted(true);

    // Show explanation
    setShowingExplanation(true);
  };

  const handleNextQuestion = () => {
    if (!quiz) return;

    // Animate transition to next question
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // If this was the last question, complete the quiz
      if (currentQuestionIndex === quiz.questions.length - 1) {
        handleQuizCompletion();
      } else {
        // Otherwise, move to next question
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswerIndex(null);
        setAnswerSubmitted(false);
        setShowingExplanation(false);
        setQuestionStartTime(Date.now());

        // Reset animations
        slideAnim.setValue(50);

        // Animate in new question
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });
  };

  const handleQuizCompletion = async () => {
    if (!quiz) return;

    try {
      console.log("[SESSION DEBUG] Starting quiz completion for quiz:", quiz.id);

      // Ensure quiz has necessary properties before proceeding
      const completeQuiz = {
        ...quiz,
        id: quiz.id || `local_${Date.now()}`,
        title: quiz.title || "Untitled Quiz",
        difficulty: quiz.difficulty || "medium",
        category: quiz.category || "general",
        createdAt: quiz.createdAt || new Date().toISOString(),
        expiresAt: quiz.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        completions: quiz.completions || 0,
        relatedRegions: quiz.relatedRegions || ["Unknown"],
      };

      // Record quiz completion
      try {
        console.log("[SESSION DEBUG] Calling recordQuizCompletion");
        const result = await recordQuizCompletion(completeQuiz, answers);
        console.log("[SESSION DEBUG] Quiz result:", result);

        // Set the quiz result state
        setQuizResult(result);
      } catch (recordError) {
        console.error("[SESSION DEBUG] Error in recordQuizCompletion:", recordError);

        // Create a fallback result if recordQuizCompletion fails
        const correctAnswers = answers.filter((a) => a.isCorrect).length;
        const score = Math.round((correctAnswers / quiz.questions.length) * 100);
        const totalTimeSpent = answers.reduce((total, answer) => total + answer.timeSpent, 0);

        const fallbackResult: QuizResult = {
          id: `fallback_${Date.now()}`,
          quizId: quiz.id,
          title: quiz.title,
          score,
          correctAnswers,
          totalQuestions: quiz.questions.length,
          completedAt: new Date().toISOString(),
          timeSpent: totalTimeSpent,
          difficulty: quiz.difficulty,
          category: quiz.category,
        };

        setQuizResult(fallbackResult);
      }

      // Get user stats for XP calculation
      try {
        const stats = await getKnowledgeQuestStats();

        // Award XP for quiz completion
        const xpResult = await awardQuizCompletionXP(
          quiz,
          quizResult || {
            id: `temp_${Date.now()}`,
            quizId: quiz.id,
            title: quiz.title,
            score: Math.round(
              (answers.filter((a) => a.isCorrect).length / quiz.questions.length) * 100
            ),
            correctAnswers: answers.filter((a) => a.isCorrect).length,
            totalQuestions: quiz.questions.length,
            completedAt: new Date().toISOString(),
            timeSpent: answers.reduce((total, answer) => total + answer.timeSpent, 0),
            difficulty: quiz.difficulty,
            category: quiz.category,
          },
          stats.totalQuizzesTaken,
          false,
          stats.streakDays
        );
        setEarnedXP(xpResult);
      } catch (xpError) {
        console.error("[SESSION DEBUG] Error awarding XP:", xpError);
        setEarnedXP({ totalXP: 0, breakdown: [] });
      }

      // Check and award badges
      try {
        const earnedBadgeIds = await updateQuizBadgeProgress();
        const scoreBadgeIds = await checkScoreBadges(
          quizResult?.score ||
            Math.round((answers.filter((a) => a.isCorrect).length / quiz.questions.length) * 100)
        );

        // Combine all earned badge IDs
        const allBadgeIds = [...earnedBadgeIds, ...scoreBadgeIds];

        if (allBadgeIds.length > 0) {
          // Fetch full badge details for earned badges
          const allBadges = await getAllUserBadges();
          const completedBadges = allBadges.filter((badge) => allBadgeIds.includes(badge.id));

          if (completedBadges.length > 0) {
            setEarnedBadges(completedBadges);

            // Award XP for each badge earned
            let totalBadgeXP = 0;
            for (const badge of completedBadges) {
              try {
                const badgeXP = await awardBadgeCompletionXP(badge.name);
                totalBadgeXP += badgeXP;
              } catch (badgeXpError) {
                console.error("[SESSION DEBUG] Error awarding badge XP:", badgeXpError);
              }
            }
            setBadgeXP(totalBadgeXP);
          }
        }
      } catch (badgeError) {
        console.error("[SESSION DEBUG] Error processing badges:", badgeError);
      }

      // Important: Set these AFTER all async operations to ensure state is set correctly
      setQuizComplete(true);
      setResultStep("RESULTS");

      // Wait a moment before animations to ensure state has updated
      setTimeout(() => {
        // Reset animation for results screen
        fadeAnim.setValue(0);
        slideAnim.setValue(50);

        // Animate in results
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }, 100);
    } catch (error) {
      console.error("[SESSION DEBUG] Critical error in quiz completion:", error);

      // Still show results even if there's an error
      setQuizComplete(true);
      setResultStep("RESULTS");

      // Create a basic result if needed
      if (!quizResult) {
        const correctAnswers = answers.filter((a) => a.isCorrect).length;
        const score = Math.round((correctAnswers / quiz.questions.length) * 100);
        const totalTimeSpent = answers.reduce((total, answer) => total + answer.timeSpent, 0);

        setQuizResult({
          id: `error_${Date.now()}`,
          quizId: quiz.id,
          title: quiz.title,
          score,
          correctAnswers,
          totalQuestions: quiz.questions.length,
          completedAt: new Date().toISOString(),
          timeSpent: totalTimeSpent,
          difficulty: quiz.difficulty,
          category: quiz.category,
        });
      }

      // Reset animation for results screen
      setTimeout(() => {
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }, 100);
    }
  };

  const handleContinueToXP = () => {
    // Move to XP screen if earned XP
    if (earnedXP.totalXP > 0) {
      setResultStep("XP");
    }
    // Otherwise, move to badge screen if earned badges
    else if (earnedBadges.length > 0) {
      setResultStep("BADGE");
      setCurrentBadgeIndex(0);
    }
    // If no XP or badges, stay on results
  };

  const handleXPContinue = () => {
    // Move to badge screen if earned badges
    if (earnedBadges.length > 0) {
      setResultStep("BADGE");
      setCurrentBadgeIndex(0);
    } else {
      // Go back to results if no badges
      setResultStep("RESULTS");
    }
  };

  const handleBadgeContinue = () => {
    // If there are more badges to show, show the next one
    if (currentBadgeIndex < earnedBadges.length - 1) {
      setCurrentBadgeIndex((prevIndex) => prevIndex + 1);
    } else {
      // No more badges, go back to results
      setResultStep("RESULTS");
    }
  };

  const handleViewAllBadges = () => {
    navigation.navigate("KnowledgeQuestScreen", { activeTab: "badges" });
  };

  const renderProgressBar = () => {
    if (!quiz) return null;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressTextContainer}>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </Text>

          {quiz.difficulty && (
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>
                {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderQuestion = () => {
    if (!quiz) return null;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isCorrect = selectedAnswerIndex === currentQuestion.correctAnswerIndex;

    return (
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
      >
        <Animated.View
          style={[
            styles.questionContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Question Text */}
          <Text style={styles.questionText}>{currentQuestion.question}</Text>

          {/* Answer Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedAnswerIndex === index && styles.optionSelected,
                  answerSubmitted &&
                    selectedAnswerIndex === index &&
                    (isCorrect ? styles.optionCorrect : styles.optionIncorrect),
                  answerSubmitted &&
                    index === currentQuestion.correctAnswerIndex &&
                    selectedAnswerIndex !== currentQuestion.correctAnswerIndex &&
                    styles.optionCorrect,
                ]}
                onPress={() => handleAnswerSelect(index)}
                disabled={answerSubmitted}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedAnswerIndex === index && styles.optionTextSelected,
                    answerSubmitted &&
                      selectedAnswerIndex === index &&
                      (isCorrect ? styles.optionTextCorrect : styles.optionTextIncorrect),
                    answerSubmitted &&
                      index === currentQuestion.correctAnswerIndex &&
                      selectedAnswerIndex !== currentQuestion.correctAnswerIndex &&
                      styles.optionTextCorrect,
                  ]}
                >
                  {option}
                </Text>

                {answerSubmitted &&
                  (index === currentQuestion.correctAnswerIndex ? (
                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                  ) : (
                    selectedAnswerIndex === index && (
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    )
                  ))}
              </TouchableOpacity>
            ))}
          </View>

          {/* Explanation */}
          {showingExplanation && (
            <View
              style={[
                styles.explanationContainer,
                isCorrect ? styles.explanationCorrect : styles.explanationIncorrect,
              ]}
            >
              <Text
                style={[
                  styles.explanationLabel,
                  isCorrect ? styles.explanationLabelCorrect : styles.explanationLabelIncorrect,
                ]}
              >
                {isCorrect ? "Correct!" : "Incorrect"}
              </Text>
              <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
            </View>
          )}

          {/* Submit/Next Button */}
          {!answerSubmitted ? (
            <TouchableOpacity
              style={[
                styles.submitButton,
                selectedAnswerIndex === null && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitAnswer}
              disabled={selectedAnswerIndex === null}
            >
              <Text style={styles.submitButtonText}>Submit Answer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.nextButton,
                isCorrect ? styles.nextButtonCorrect : styles.nextButtonIncorrect,
              ]}
              onPress={handleNextQuestion}
            >
              <Text style={styles.nextButtonText}>
                {currentQuestionIndex === quiz.questions.length - 1
                  ? "See Results"
                  : "Next Question"}
              </Text>
              <Ionicons
                name={
                  currentQuestionIndex === quiz.questions.length - 1 ? "trophy" : "arrow-forward"
                }
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    );
  };

  const renderResults = () => {
    // Add debug logging
    console.log("Rendering results:", { quizResult, quiz, quizComplete, resultStep });

    if (!quizResult || !quiz) {
      console.log("Quiz result or quiz is null, can't render results");
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading results...</Text>
        </View>
      );
    }

    const accuracy = (quizResult.correctAnswers / quizResult.totalQuestions) * 100;
    let message = "";
    let color = "";

    if (accuracy >= 80) {
      message = "Excellent! You're a travel expert!";
      color = "#10B981";
    } else if (accuracy >= 60) {
      message = "Good job! Keep exploring to learn more.";
      color = "#FBBF24";
    } else {
      message = "Keep learning! Try another quiz to improve.";
      color = "#EF4444";
    }

    return (
      <ScrollView style={styles.scrollContainer}>
        <Animated.View
          style={[
            styles.resultsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={["#8B5CF6", "#6366F1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.resultsHeader}
          >
            <View style={styles.trophyContainer}>
              <Ionicons name="trophy" size={60} color="#FFFFFF" />
            </View>
            <Text style={styles.resultsTitle}>Quiz Complete!</Text>
            <Text style={styles.resultsScore}>{quizResult.score}%</Text>
          </LinearGradient>

          <View style={styles.resultsContent}>
            <Text style={[styles.resultsMessage, { color }]}>{message}</Text>

            <View style={styles.resultsStatsContainer}>
              <View style={styles.resultsStat}>
                <Text style={styles.resultsStatValue}>{quizResult.correctAnswers}</Text>
                <Text style={styles.resultsStatLabel}>Correct</Text>
              </View>
              <View style={styles.resultsStatDivider} />
              <View style={styles.resultsStat}>
                <Text style={styles.resultsStatValue}>
                  {quizResult.totalQuestions - quizResult.correctAnswers}
                </Text>
                <Text style={styles.resultsStatLabel}>Incorrect</Text>
              </View>
              <View style={styles.resultsStatDivider} />
              <View style={styles.resultsStat}>
                <Text style={styles.resultsStatValue}>
                  {Math.round(quizResult.timeSpent / 1000)}
                </Text>
                <Text style={styles.resultsStatLabel}>Seconds</Text>
              </View>
            </View>

            {/* Toggle Analysis Button */}
            <TouchableOpacity
              style={styles.analysisToggleButton}
              onPress={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
            >
              <Text style={styles.analysisToggleText}>
                {showDetailedAnalysis ? "Hide Detailed Analysis" : "Show Detailed Analysis"}
              </Text>
              <Ionicons
                name={showDetailedAnalysis ? "chevron-up" : "chevron-down"}
                size={18}
                color="#6366F1"
              />
            </TouchableOpacity>

            {/* Detailed Analysis */}
            {showDetailedAnalysis && (
              <QuizAnalysis quiz={quiz} answers={answers} result={quizResult} />
            )}

            <View style={styles.resultsButtonsContainer}>
              <TouchableOpacity
                style={[styles.resultsButton, styles.tryAgainButton]}
                onPress={() => {
                  setCurrentQuestionIndex(0);
                  setSelectedAnswerIndex(null);
                  setAnswerSubmitted(false);
                  setShowingExplanation(false);
                  setQuizComplete(false);
                  setQuizResult(null);
                  setAnswers([]);
                  setQuestionStartTime(Date.now());
                  setShowDetailedAnalysis(false);
                  setResultStep("QUIZ");

                  // Reset animations
                  fadeAnim.setValue(1);
                  slideAnim.setValue(0);
                }}
              >
                <Ionicons name="refresh" size={18} color="#6366F1" />
                <Text style={styles.tryAgainButtonText}>Try Again</Text>
              </TouchableOpacity>

              {(earnedXP.totalXP > 0 || earnedBadges.length > 0) && (
                <TouchableOpacity
                  style={[styles.resultsButton, styles.backToQuizzesButton]}
                  onPress={handleContinueToXP}
                >
                  <Ionicons
                    name={earnedXP.totalXP > 0 ? "flash" : "ribbon"}
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.backToQuizzesButtonText}>
                    {earnedXP.totalXP > 0 ? "View Rewards" : "View Badges"}
                  </Text>
                </TouchableOpacity>
              )}

              {earnedXP.totalXP === 0 && earnedBadges.length === 0 && (
                <TouchableOpacity
                  style={[styles.resultsButton, styles.backToQuizzesButton]}
                  onPress={() => navigation.navigate("KnowledgeQuestScreen")}
                >
                  <Ionicons name="list" size={18} color="#FFFFFF" />
                  <Text style={styles.backToQuizzesButtonText}>All Quizzes</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    );
  };

  const renderXPEarned = () => {
    return (
      <ScrollView style={styles.scrollContainer}>
        <XPEarnedNotification
          totalXP={earnedXP.totalXP}
          breakdown={earnedXP.breakdown}
          onDismiss={handleXPContinue}
        />
      </ScrollView>
    );
  };

  const renderBadgeEarned = () => {
    return (
      <ScrollView style={styles.scrollContainer}>
        {earnedBadges.length > 0 && currentBadgeIndex < earnedBadges.length && (
          <BadgeEarnedNotification
            badge={earnedBadges[currentBadgeIndex]}
            xpEarned={badgeXP / earnedBadges.length} // Distribute XP evenly among badges
            onDismiss={handleBadgeContinue}
            onViewAllBadges={handleViewAllBadges}
          />
        )}
      </ScrollView>
    );
  };

  // Helper function to truncate quiz title if too long
  const getTruncatedTitle = () => {
    if (!quiz) return "Knowledge Quest";
    return quiz.title.length > 20 ? quiz.title.substring(0, 20) + "..." : quiz.title;
  };

  // Helper to determine subtitle based on current state
  const getSubtitle = () => {
    if (!quizComplete) {
      return `Question ${currentQuestionIndex + 1} of ${quiz?.questions.length || 0}`;
    }

    switch (resultStep) {
      case "RESULTS":
        return "Quiz Complete";
      case "XP":
        return "XP Earned";
      case "BADGE":
        return "Badge Earned";
      default:
        return "Quiz Complete";
    }
  };

  if (loading) {
    return (
      <ScreenWithNavBar>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Header
          title="Knowledge Quest"
          subtitle="Loading quiz..."
          showBackButton
          onBackPress={() => navigation.goBack()}
          showIcon
          iconName="school"
          iconColor="#6366F1"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading quiz...</Text>
        </View>
      </ScreenWithNavBar>
    );
  }

  return (
    <ScreenWithNavBar>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header
        title={getTruncatedTitle()}
        subtitle={getSubtitle()}
        showBackButton
        onBackPress={() => {
          if (quizComplete) {
            navigation.goBack();
          } else {
            Alert.alert("Quit Quiz?", "Your progress will be lost if you leave now.", [
              { text: "Stay", style: "cancel" },
              { text: "Quit", style: "destructive", onPress: () => navigation.goBack() },
            ]);
          }
        }}
        showIcon
        iconName="school"
        iconColor="#6366F1"
      />

      <View style={styles.container}>
        {!quizComplete ? (
          <>
            {renderProgressBar()}
            {renderQuestion()}
          </>
        ) : (
          <>
            {resultStep === "RESULTS" && renderResults()}
            {resultStep === "XP" && renderXPEarned()}
            {resultStep === "BADGE" && renderBadgeEarned()}
          </>
        )}
      </View>
    </ScreenWithNavBar>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 30, // Add padding to ensure space at the bottom
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  progressTextContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6366F1",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 3,
  },
  questionContainer: {
    padding: 16,
  },
  questionText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 24,
    lineHeight: 26,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionSelected: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  optionCorrect: {
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  optionIncorrect: {
    borderColor: "#EF4444",
    backgroundColor: "#FEE2E2",
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: "#4B5563",
    marginRight: 8,
  },
  optionTextSelected: {
    color: "#4338CA",
    fontWeight: "600",
  },
  optionTextCorrect: {
    color: "#047857",
    fontWeight: "600",
  },
  optionTextIncorrect: {
    color: "#B91C1C",
    fontWeight: "600",
  },
  explanationContainer: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
  },
  explanationCorrect: {
    backgroundColor: "#ECFDF5",
  },
  explanationIncorrect: {
    backgroundColor: "#FEF2F2",
  },
  explanationLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  explanationLabelCorrect: {
    color: "#047857",
  },
  explanationLabelIncorrect: {
    color: "#B91C1C",
  },
  explanationText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: "#6366F1",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#C7D2FE",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  nextButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  nextButtonCorrect: {
    backgroundColor: "#10B981",
  },
  nextButtonIncorrect: {
    backgroundColor: "#6366F1",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginRight: 8,
  },
  resultsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    margin: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultsHeader: {
    alignItems: "center",
    paddingVertical: 32,
  },
  trophyContainer: {
    width: 90,
    height: 90,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  resultsScore: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  resultsContent: {
    padding: 24,
  },
  resultsMessage: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
  },
  resultsStatsContainer: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  resultsStat: {
    flex: 1,
    alignItems: "center",
  },
  resultsStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  resultsStatLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  resultsStatDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },
  analysisToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
  },
  analysisToggleText: {
    color: "#6366F1",
    fontWeight: "600",
    marginRight: 8,
  },
  resultsButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  resultsButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
  },
  tryAgainButton: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  tryAgainButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
  },
  backToQuizzesButton: {
    backgroundColor: "#6366F1",
  },
  backToQuizzesButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
  },
});

export default QuizSessionScreen;
