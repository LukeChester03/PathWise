// components/LearnScreen/AdvancedTravelAnalysisCard.tsx
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

// Required number of places to unlock the feature
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

  // Check if the feature is unlocked based on number of visited places
  const isUnlocked = visitedPlaces.length >= REQUIRED_PLACES;

  // Number of places still needed to unlock
  const placesNeeded = REQUIRED_PLACES - visitedPlaces.length;

  // Initial data loading - check Firebase and initialize
  useEffect(() => {
    if (isUnlocked) {
      checkFirebaseDataAndInitialize();
    } else {
      setLoading(false); // No need to show loading if feature is locked
    }
  }, [isUnlocked]);

  // Set up polling for progress during generation
  useEffect(() => {
    if (generating) {
      const progressInterval = setInterval(checkGenerationProgress, 2000);
      return () => clearInterval(progressInterval);
    }
  }, [generating]);

  // Check generation progress
  const checkGenerationProgress = async () => {
    try {
      const progressInfo = await getAdvancedAnalysisProgress();
      if (progressInfo) {
        setProgress(progressInfo);

        // If generation is complete, refresh the analysis data
        if (!progressInfo.isGenerating && progressInfo.progress === 100) {
          await loadAnalysisData();
          setGenerating(false);
        }
      }
    } catch (error) {
      console.error("Error checking generation progress:", error);
    }
  };

  // Load analysis data
  const loadAnalysisData = async () => {
    try {
      // First, directly check Firebase for existing analysis data
      const firebaseData = await getLatestAnalysisFromFirestore();
      setFirebaseDataExists(!!firebaseData);

      // Load analysis from cache/Firebase
      const analysisData = await getAdvancedTravelAnalysis();
      if (analysisData) {
        setAnalysis(analysisData);
      }

      // Load request limits (for generate button)
      const limits = await checkAdvancedAnalysisRequestLimit();
      setRequestLimits(limits);
    } catch (err) {
      console.error("Error loading analysis data:", err);
      setError("Failed to load analysis data");
    }
  };

  // Check if data exists in Firebase and initialize the component
  const checkFirebaseDataAndInitialize = async () => {
    try {
      setLoading(true);
      setError(null);

      await loadAnalysisData();

      // Check if generation is in progress
      const progressInfo = await getAdvancedAnalysisProgress();
      if (progressInfo && progressInfo.isGenerating) {
        setGenerating(true);
        setProgress(progressInfo);
      }

      // Check if we should trigger an automatic update
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

  // Generate new analysis
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

      // Reset progress
      setProgress({
        isGenerating: true,
        progress: 0,
        stage: "Starting analysis generation",
      });

      // Start the generation process
      await generateAdvancedTravelAnalysis(visitedPlaces);

      // The actual analysis data will be loaded when progress polling detects completion
      setFirebaseDataExists(true);

      // Update request limits
      const limits = await checkAdvancedAnalysisRequestLimit();
      setRequestLimits(limits);
    } catch (err: any) {
      console.error("Error generating analysis:", err);
      setError(err.message || "Failed to generate analysis");
      setGenerating(false);
    }
  };

  // Navigate to full analysis screen - only allowed if analysis exists
  const navigateToAdvancedAnalysis = () => {
    if (!isUnlocked || !analysis || !firebaseDataExists || generating) return;

    // @ts-ignore - Type will be fixed when navigation types are updated
    navigation.navigate("AdvancedTravelAnalysis");
  };

  // Render locked state
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

  // Render unlocked but no analysis state or generating state
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

          {/* Progress indicator */}
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

  // Render loading state
  const renderLoading = () => (
    <View style={styles.contentContainer}>
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={styles.loadingText}>Loading travel insights...</Text>
    </View>
  );

  // Render error state
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

  // Render preview content
  const renderContent = () => {
    if (!analysis || generating) return renderUnlockedNoAnalysisState();

    // Check if we have personality data to show
    const hasPersonalityData = analysis.behavioralAnalysis?.travelPersonality;
    // Get primary archetype if available
    const primaryArchetype = analysis.comparativeAnalysis?.archetypeAnalysis?.primaryArchetype;
    // Get top recommendation if available
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

  // Determine which content to show based on state
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

  // Determine the appropriate footer text based on state
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

  // Determine if the card should be clickable (only after analysis is generated)
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
    opacity: 0.85, // Slightly dimmed to indicate locked
  },
  disabledCardContainer: {
    opacity: 0.95, // Slightly dimmed to indicate not clickable
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
    backgroundColor: "rgba(34, 197, 94, 0.3)", // success with opacity
  },
  qualityGood: {
    backgroundColor: "rgba(6, 182, 212, 0.3)", // info with opacity
  },
  qualityAverage: {
    backgroundColor: "rgba(245, 158, 11, 0.3)", // warning with opacity
  },
  qualityLimited: {
    backgroundColor: "rgba(239, 68, 68, 0.3)", // danger with opacity
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
  // Loading state styles
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 12,
  },
  // Error state styles
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
  // Locked state styles
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
  // Empty state styles
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
  // Generate button styles
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
  // Progress indicator styles
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
