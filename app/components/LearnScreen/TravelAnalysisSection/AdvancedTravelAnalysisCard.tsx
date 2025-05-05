import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Colors, NeutralColors } from "../../../constants/colours";
import {
  getAdvancedTravelAnalysis,
  checkAdvancedAnalysisRequestLimit,
  generateAdvancedTravelAnalysis,
  checkAndPerformAutomaticUpdate,
  getLatestAnalysisFromFirestore,
  getAdvancedAnalysisProgress,
} from "../../../services/LearnScreen/aiTravelAnalysisService";
import {
  AdvancedTravelAnalysis,
  AnalysisRequestLimitInfo,
  AnalysisGenerationProgress,
} from "../../../types/LearnScreen/TravelAnalysisTypes";
import { VisitedPlaceDetails } from "../../../types/MapTypes";

const REQUIRED_PLACES = 5;

interface AdvancedTravelAnalysisCardProps {
  cardAnimation: Animated.Value;
  visitedPlaces: VisitedPlaceDetails[];
}

const AdvancedTravelAnalysisCard: React.FC<AdvancedTravelAnalysisCardProps> = ({
  cardAnimation,
  visitedPlaces,
}) => {
  const navigation = useNavigation();
  const [analysis, setAnalysis] = useState<AdvancedTravelAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [requestLimits, setRequestLimits] = useState<AnalysisRequestLimitInfo>({
    canRequest: true,
    requestsRemaining: 2,
  });
  const [firebaseDataExists, setFirebaseDataExists] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<AnalysisGenerationProgress | null>(null);
  const isUnlocked = visitedPlaces.length >= REQUIRED_PLACES;
  const placesNeeded = REQUIRED_PLACES - visitedPlaces.length;

  useEffect(() => {
    if (isUnlocked) {
      checkFirebaseDataAndInitialize();
    } else {
      setLoading(false);
    }
  }, [isUnlocked]);

  useEffect(() => {
    if (generating) {
      const progressInterval = setInterval(checkGenerationProgress, 2000);
      return () => clearInterval(progressInterval);
    }
  }, [generating]);

  const checkGenerationProgress = async () => {
    try {
      const progressInfo = await getAdvancedAnalysisProgress();
      if (progressInfo) {
        setProgress(progressInfo);

        if (!progressInfo.isGenerating && progressInfo.progress === 100) {
          await loadAnalysisData();
          setGenerating(false);
        }
      }
    } catch (error) {
      console.error("Error checking generation progress:", error);
    }
  };

  const loadAnalysisData = async () => {
    try {
      const firebaseData = await getLatestAnalysisFromFirestore();
      setFirebaseDataExists(!!firebaseData);

      const analysisData = await getAdvancedTravelAnalysis();
      if (analysisData) {
        setAnalysis(analysisData);
      }

      const limits = await checkAdvancedAnalysisRequestLimit();
      setRequestLimits(limits);
    } catch (err) {
      console.error("Error loading analysis data:", err);
      setError("Failed to load analysis data");
    }
  };

  const checkFirebaseDataAndInitialize = async () => {
    try {
      setLoading(true);
      setError(null);

      await loadAnalysisData();
      const progressInfo = await getAdvancedAnalysisProgress();
      if (progressInfo && progressInfo.isGenerating) {
        setGenerating(true);
        setProgress(progressInfo);
      }

      if (isUnlocked && visitedPlaces.length > 0 && firebaseDataExists) {
        checkAndPerformAutomaticUpdate(visitedPlaces);
      }
    } catch (err) {
      console.error("Error initializing data:", err);
      setError("Failed to load analysis data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAnalysis = async () => {
    if (!isUnlocked) return;

    try {
      if (!requestLimits.canRequest) {
        setError(
          `You've reached your daily limit. Try again ${
            requestLimits.nextAvailableTime
              ? `after ${new Date(requestLimits.nextAvailableTime).toLocaleTimeString()}`
              : "tomorrow"
          }`
        );
        return;
      }

      setGenerating(true);
      setError(null);

      setProgress({
        isGenerating: true,
        progress: 0,
        stage: "Starting analysis generation",
      });
      await generateAdvancedTravelAnalysis(visitedPlaces);
      setFirebaseDataExists(true);

      const limits = await checkAdvancedAnalysisRequestLimit();
      setRequestLimits(limits);
    } catch (err: any) {
      console.error("Error generating analysis:", err);
      setError(err.message || "Failed to generate analysis");
      setGenerating(false);
    }
  };

  const navigateToAdvancedAnalysis = () => {
    if (!isUnlocked || !analysis || !firebaseDataExists || generating) return;

    navigation.navigate("AdvancedTravelAnalysis");
  };

  const renderLockedState = () => (
    <View style={styles.contentContainer}>
      <View style={styles.lockIconContainer}>
        <Ionicons name="lock-closed" size={40} color="#FFFFFF" />
      </View>
      <Text style={styles.lockedTitle}>Advanced Analysis Locked</Text>
      <Text style={styles.lockedText}>
        Visit {placesNeeded} more {placesNeeded === 1 ? "place" : "places"} to unlock advanced
        travel analysis.
      </Text>
    </View>
  );

  const renderUnlockedNoAnalysisState = () => (
    <View style={styles.contentContainer}>
      <Ionicons name="analytics-outline" size={40} color="#FFFFFF" />

      {generating ? (
        <>
          <Text style={styles.emptyTitle}>Generating Analysis</Text>
          <Text style={styles.emptyText}>
            Our AI is analyzing your travel patterns and generating insights. This may take a few
            moments.
          </Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress?.progress || 0}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {progress?.progress || 0}% - {progress?.stage || "Processing..."}
            </Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>Travel Analysis Available</Text>
          <Text style={styles.emptyText}>
            {firebaseDataExists === false
              ? "You've unlocked advanced travel analysis! Generate your first analysis to discover patterns in your travel history."
              : "Your travel analysis needs to be generated. Analyze your travel patterns with our AI-powered insights."}
          </Text>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerateAnalysis}
            disabled={!requestLimits.canRequest || generating}
          >
            <Text style={styles.generateButtonText}>Generate Analysis</Text>
            <Ionicons name="analytics" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderLoading = () => (
    <View style={styles.contentContainer}>
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={styles.loadingText}>Loading travel insights...</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.contentContainer}>
      <Ionicons name="analytics-outline" size={36} color="#FFFFFF" />
      <Text style={styles.errorTitle}>Analysis Unavailable</Text>
      <Text style={styles.errorText}>
        {error || "We couldn't load your travel analysis. Please try again later."}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={checkFirebaseDataAndInitialize}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (!analysis || generating) return renderUnlockedNoAnalysisState();

    const hasPersonalityData = analysis.behavioralAnalysis?.travelPersonality;
    const primaryArchetype = analysis.comparativeAnalysis?.archetypeAnalysis?.primaryArchetype;
    const topRecommendation = analysis.predictiveAnalysis?.recommendedDestinations?.[0];

    return (
      <View style={styles.contentContainer}>
        <View style={styles.qualityBadgeContainer}>
          <View
            style={[
              styles.qualityBadge,
              analysis.analysisQuality >= 80
                ? styles.qualityExcellent
                : analysis.analysisQuality >= 60
                ? styles.qualityGood
                : analysis.analysisQuality >= 40
                ? styles.qualityAverage
                : styles.qualityLimited,
            ]}
          >
            <Text style={styles.qualityText}>
              {analysis.analysisQuality >= 80
                ? "Excellent"
                : analysis.analysisQuality >= 60
                ? "Good"
                : analysis.analysisQuality >= 40
                ? "Average"
                : "Limited"}{" "}
              Quality
            </Text>
          </View>
        </View>

        <Text style={styles.analysisTitle}>Travel Analysis</Text>

        {hasPersonalityData && (
          <View style={styles.insightContainer}>
            <View style={styles.personalityTypeContainer}>
              <Text style={styles.personalityType}>{primaryArchetype || "Explorer"}</Text>
              <Text style={styles.personalitySubtitle}>Your travel archetype</Text>
            </View>

            {/* Show just a couple key personality traits */}
            <View style={styles.traitsContainer}>
              <View style={styles.traitItem}>
                <Text style={styles.traitLabel}>Adventurousness</Text>
                <View style={styles.traitBarContainer}>
                  <View
                    style={[
                      styles.traitBar,
                      {
                        width: `${analysis.behavioralAnalysis.travelPersonality.adventurousness}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.traitItem}>
                <Text style={styles.traitLabel}>Spontaneity</Text>
                <View style={styles.traitBarContainer}>
                  <View
                    style={[
                      styles.traitBar,
                      {
                        width: `${
                          analysis.behavioralAnalysis.explorationStyle?.spontaneityScore || 50
                        }%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {topRecommendation && (
          <View style={styles.recommendationPreview}>
            <Text style={styles.recommendationLabel}>Top Recommendation</Text>
            <Text style={styles.recommendationName}>{topRecommendation.name}</Text>
            <View style={styles.matchContainer}>
              <Text style={styles.matchText}>{topRecommendation.confidenceScore}% match</Text>
            </View>
          </View>
        )}

        <View style={styles.aiContainer}>
          <Ionicons name="flash" size={12} color="#FFFFFF" />
          <Text style={styles.aiText}>AI-Generated Analysis</Text>
        </View>
      </View>
    );
  };

  const renderCardContent = () => {
    if (!isUnlocked) {
      return renderLockedState();
    } else if (loading) {
      return renderLoading();
    } else if (error) {
      return renderError();
    } else if (!analysis || firebaseDataExists === false || generating) {
      return renderUnlockedNoAnalysisState();
    } else {
      return renderContent();
    }
  };

  const getFooterText = () => {
    if (!isUnlocked) {
      return "Keep exploring to unlock";
    } else if (loading) {
      return "Please wait...";
    } else if (error) {
      return "Travel analysis unavailable";
    } else if (generating) {
      return "Generating analysis...";
    } else if (!analysis || firebaseDataExists === false) {
      return "Generate your first analysis";
    } else {
      return "View complete travel analysis";
    }
  };

  const isCardClickable = isUnlocked && analysis && firebaseDataExists && !generating;

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
      <TouchableOpacity
        style={[
          styles.cardContainer,
          !isUnlocked && styles.lockedCardContainer,
          !isCardClickable && styles.disabledCardContainer,
        ]}
        activeOpacity={isCardClickable ? 0.9 : 1}
        onPress={isCardClickable ? navigateToAdvancedAnalysis : undefined}
        disabled={!isCardClickable}
      >
        <LinearGradient
          colors={[NeutralColors.gray800, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {renderCardContent()}

          <View style={styles.footer}>
            <Text style={styles.footerText}>{getFooterText()}</Text>
            <View
              style={[styles.arrowContainer, !isCardClickable && styles.disabledArrowContainer]}
            >
              <Ionicons
                name={
                  isUnlocked && analysis && !generating
                    ? "arrow-forward"
                    : generating
                    ? "time-outline"
                    : "lock-closed"
                }
                size={16}
                color="#FFFFFF"
              />
            </View>
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  lockedCardContainer: {
    opacity: 0.85,
  },
  disabledCardContainer: {
    opacity: 0.95,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  gradient: {
    minHeight: 220,
    justifyContent: "space-between",
  },
  contentContainer: {
    padding: 24,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  qualityBadgeContainer: {
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
  },
  qualityExcellent: {
    backgroundColor: "rgba(34, 197, 94, 0.3)",
  },
  qualityGood: {
    backgroundColor: "rgba(6, 182, 212, 0.3)",
  },
  qualityAverage: {
    backgroundColor: "rgba(245, 158, 11, 0.3)",
  },
  qualityLimited: {
    backgroundColor: "rgba(239, 68, 68, 0.3)",
  },
  qualityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  analysisTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  insightContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 16,
  },
  personalityTypeContainer: {
    marginBottom: 12,
  },
  personalityType: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  personalitySubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  traitsContainer: {
    gap: 10,
  },
  traitItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  traitLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    width: "40%",
  },
  traitBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  traitBar: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  recommendationPreview: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  recommendationLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  recommendationName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  matchContainer: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  matchText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  aiContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  aiText: {
    fontSize: 10,
    color: "#FFFFFF",
    marginLeft: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    padding: 16,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  arrowContainer: {
    width: 32,
    height: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledArrowContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 12,
    marginBottom: 8,
  },
  lockedText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginRight: 8,
  },
  progressContainer: {
    width: "100%",
    marginTop: 16,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
});

export default AdvancedTravelAnalysisCard;
