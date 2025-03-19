// components/LearnScreen/AdvancedTravelAnalysisCard.tsx
import React, { useState, useEffect, useRef } from "react";
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
  getAdvancedAnalysisProgress,
  checkAdvancedAnalysisRequestLimit,
  generateAdvancedTravelAnalysis,
} from "../../../services/LearnScreen/aiTravelAnalysisService";
import {
  AdvancedTravelAnalysis,
  AnalysisRequestLimitInfo,
  AnalysisGenerationProgress,
} from "../../../types/LearnScreen/TravelAnalysisTypes";
import { VisitedPlaceDetails } from "../../../types/MapTypes";

interface AdvancedTravelAnalysisCardProps {
  cardAnimation: Animated.Value;
  visitedPlaces: VisitedPlaceDetails[];
  expandedFeatures: {
    advancedAnalysis: boolean;
  };
  toggleFeatureExpansion: (feature: string) => void;
}

const AdvancedTravelAnalysisCard: React.FC<AdvancedTravelAnalysisCardProps> = ({
  cardAnimation,
  visitedPlaces,
  expandedFeatures,
  toggleFeatureExpansion,
}) => {
  const navigation = useNavigation();
  const [analysis, setAnalysis] = useState<AdvancedTravelAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestLimits, setRequestLimits] = useState<AnalysisRequestLimitInfo>({
    canRequest: true,
    requestsRemaining: 2,
  });
  const [progress, setProgress] = useState<AnalysisGenerationProgress | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadAnalysis();
    loadRequestLimits();

    // Set up progress polling
    const progressInterval = setInterval(loadProgress, 3000);
    return () => clearInterval(progressInterval);
  }, []);

  // Create pulsing animation for AI badge
  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    const pulseLoop = Animated.loop(pulse);
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
      pulseAnim.setValue(1);
    };
  }, []);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const analysisData = await getAdvancedTravelAnalysis();

      if (analysisData) {
        setAnalysis(analysisData);
      } else {
        // If no analysis exists yet, use default data
        setError("No advanced analysis available. Generate your first analysis!");
      }
    } catch (err) {
      console.error("Error loading advanced travel analysis:", err);
      setError("Failed to load advanced travel analysis");
    } finally {
      setLoading(false);
    }
  };

  const loadRequestLimits = async () => {
    try {
      const limits = await checkAdvancedAnalysisRequestLimit();
      setRequestLimits(limits);
    } catch (error) {
      console.error("Error checking request limits:", error);
    }
  };

  const loadProgress = async () => {
    try {
      const progressInfo = await getAdvancedAnalysisProgress();
      if (progressInfo) {
        setProgress(progressInfo);

        // If we have progress info and it's generating, set the appropriate states
        if (progressInfo.isGenerating) {
          setLoading(true);
        } else if (progressInfo.progress === 100) {
          // If completed, reload the analysis
          await loadAnalysis();
          await loadRequestLimits();
        }
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  };

  const handleGenerateAnalysis = async () => {
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

      if (visitedPlaces.length === 0) {
        setError("Visit some places first to generate an analysis");
        return;
      }

      setLoading(true);
      setError(null);
      setRefreshing(true);

      // Start the generation process
      await generateAdvancedTravelAnalysis(visitedPlaces);

      // The analysis will be loaded when the progress polling detects completion
    } catch (err: any) {
      console.error("Error generating advanced travel analysis:", err);
      setError(err.message || "Failed to generate analysis");
      setLoading(false);
      setRefreshing(false);
    }
  };

  const navigateToAdvancedAnalysis = () => {
    // @ts-ignore - Type will be fixed when navigation types are updated
    navigation.navigate("AdvancedTravelAnalysis");
  };

  const renderProgressIndicator = () => {
    if (!progress || !progress.isGenerating) return null;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress.progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress.stage}</Text>
        <Text style={styles.progressPercentage}>{Math.round(progress.progress)}%</Text>
      </View>
    );
  };

  const renderRequestLimitsBadge = () => {
    return (
      <View
        style={[
          styles.requestLimitBadge,
          requestLimits.requestsRemaining === 0 && styles.requestLimitBadgeWarning,
        ]}
      >
        <Ionicons
          name={requestLimits.requestsRemaining > 0 ? "refresh" : "time-outline"}
          size={14}
          color={NeutralColors.white}
        />
        <Text style={styles.requestLimitText}>{requestLimits.requestsRemaining} left</Text>
      </View>
    );
  };

  // Render top behavioral insights
  const renderBehavioralInsights = () => {
    if (!analysis || !analysis.behavioralAnalysis) return null;

    return (
      <View>
        {/* Exploration Style Card */}
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Travel Personality</Text>

          <View style={styles.personalitySection}>
            <View style={styles.personalityItem}>
              <Text style={styles.personalityLabel}>Spontaneity</Text>
              <View style={styles.personalityScaleContainer}>
                <View
                  style={[
                    styles.personalityScale,
                    { width: `${analysis.behavioralAnalysis.explorationStyle.spontaneityScore}%` },
                  ]}
                />
              </View>
              <Text style={styles.personalityValue}>
                {analysis.behavioralAnalysis.explorationStyle.spontaneityScore}%
              </Text>
            </View>

            <View style={styles.personalityItem}>
              <Text style={styles.personalityLabel}>Variety Seeking</Text>
              <View style={styles.personalityScaleContainer}>
                <View
                  style={[
                    styles.personalityScale,
                    { width: `${analysis.behavioralAnalysis.explorationStyle.varietySeeking}%` },
                  ]}
                />
              </View>
              <Text style={styles.personalityValue}>
                {analysis.behavioralAnalysis.explorationStyle.varietySeeking}%
              </Text>
            </View>

            <View style={styles.personalityItem}>
              <Text style={styles.personalityLabel}>Adventurousness</Text>
              <View style={styles.personalityScaleContainer}>
                <View
                  style={[
                    styles.personalityScale,
                    { width: `${analysis.behavioralAnalysis.travelPersonality.adventurousness}%` },
                  ]}
                />
              </View>
              <Text style={styles.personalityValue}>
                {analysis.behavioralAnalysis.travelPersonality.adventurousness}%
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render comparative analysis insights
  const renderComparativeInsights = () => {
    if (!analysis || !analysis.comparativeAnalysis) return null;

    return (
      <View style={styles.comparativeSection}>
        <View style={styles.archetypeContainer}>
          <View style={styles.archetypeItem}>
            <Text style={styles.archetypeLabel}>Primary Archetype</Text>
            <Text style={styles.archetypeValue}>
              {analysis.comparativeAnalysis.archetypeAnalysis.primaryArchetype}
            </Text>
            <View style={styles.archetypeScoreContainer}>
              <View
                style={[
                  styles.archetypeScore,
                  { width: `${analysis.comparativeAnalysis.archetypeAnalysis.archetypeScore}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.archetypeItem}>
            <Text style={styles.archetypeLabel}>Secondary Archetype</Text>
            <Text style={styles.archetypeValue}>
              {analysis.comparativeAnalysis.archetypeAnalysis.secondaryArchetype}
            </Text>
            <View style={styles.archetypeScoreContainer}>
              <View
                style={[
                  styles.archetypeScore,
                  { width: `${analysis.comparativeAnalysis.archetypeAnalysis.secondaryScore}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {expandedFeatures.advancedAnalysis &&
          analysis.comparativeAnalysis.uniquenessFactors.length > 0 && (
            <View style={styles.uniquenessSection}>
              <Text style={styles.sectionLabel}>What Makes You Unique</Text>
              {analysis.comparativeAnalysis.uniquenessFactors.slice(0, 2).map((factor, index) => (
                <View key={index} style={styles.uniquenessFactor}>
                  <Text style={styles.uniquenessFactorText}>{factor.factor}</Text>
                  <View style={styles.uniquenessScoreContainer}>
                    <View
                      style={[styles.uniquenessScore, { width: `${factor.uniquenessScore}%` }]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
      </View>
    );
  };

  // Render recommended destinations
  const renderRecommendations = () => {
    if (!analysis || analysis.predictiveAnalysis.recommendedDestinations.length === 0) return null;

    const topRecommendation = analysis.predictiveAnalysis.recommendedDestinations[0];

    return (
      <View style={styles.recommendationSection}>
        <Text style={styles.recommendationTitle}>Top Recommendation</Text>
        <View style={styles.topRecommendation}>
          <View style={styles.recommendationHeader}>
            <Text style={styles.recommendationName}>{topRecommendation.name}</Text>
            <View style={styles.recommendationScore}>
              <Text style={styles.recommendationScoreText}>
                {topRecommendation.confidenceScore}% match
              </Text>
            </View>
          </View>

          <Text style={styles.recommendationTimeframe}>
            Best time to visit: {topRecommendation.bestTimeToVisit}
          </Text>

          {expandedFeatures.advancedAnalysis && topRecommendation.reasoningFactors.length > 0 && (
            <View style={styles.recommendationFactors}>
              <Text style={styles.factorsLabel}>Why this matches you:</Text>
              {topRecommendation.reasoningFactors.slice(0, 2).map((factor, index) => (
                <View key={index} style={styles.factorItem}>
                  <View style={styles.factorDot} />
                  <Text style={styles.factorText}>{factor}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.card,
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
        colors={[NeutralColors.gray800, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Animated.View
              style={[
                styles.aiBadge,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Ionicons name="analytics" size={16} color={NeutralColors.white} />
              <Text style={styles.aiBadgeText}>AI</Text>
            </Animated.View>
            <Text style={styles.title}>Advanced Travel Analysis</Text>
          </View>

          {renderRequestLimitsBadge()}
        </View>
      </LinearGradient>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {progress?.isGenerating
              ? "Generating advanced analysis..."
              : "Loading your advanced analysis..."}
          </Text>
          {renderProgressIndicator()}
        </View>
      ) : error && !analysis ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerateAnalysis}
            disabled={!requestLimits.canRequest || loading}
          >
            <Text style={styles.generateButtonText}>Generate Analysis</Text>
            <Ionicons name="analytics" size={16} color={NeutralColors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <TouchableOpacity
            style={styles.expandHeader}
            onPress={() => toggleFeatureExpansion("advancedAnalysis")}
          >
            <Text style={styles.expandDescription}>
              Deep analytical insights into your travel patterns and behaviors
            </Text>
            <Ionicons
              name={expandedFeatures.advancedAnalysis ? "chevron-up" : "chevron-down"}
              size={20}
              color={Colors.primary}
            />
          </TouchableOpacity>

          {/* Confidence Score and Quality Badge */}
          <View style={styles.analysisMetrics}>
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>Analysis Confidence</Text>
              <View style={styles.confidenceBar}>
                <View
                  style={[styles.confidenceFill, { width: `${analysis?.confidenceScore || 0}%` }]}
                />
              </View>
              <Text style={styles.confidenceValue}>{analysis?.confidenceScore || 0}%</Text>
            </View>

            <View style={styles.qualityContainer}>
              <Text style={styles.qualityLabel}>Quality</Text>
              <View
                style={[
                  styles.qualityBadge,
                  analysis?.analysisQuality && analysis.analysisQuality >= 80
                    ? styles.qualityExcellent
                    : analysis?.analysisQuality && analysis.analysisQuality >= 60
                    ? styles.qualityGood
                    : analysis?.analysisQuality && analysis.analysisQuality >= 40
                    ? styles.qualityAverage
                    : styles.qualityLimited,
                ]}
              >
                <Text style={styles.qualityText}>
                  {analysis?.analysisQuality && analysis.analysisQuality >= 80
                    ? "Excellent"
                    : analysis?.analysisQuality && analysis.analysisQuality >= 60
                    ? "Good"
                    : analysis?.analysisQuality && analysis.analysisQuality >= 40
                    ? "Average"
                    : "Limited"}
                </Text>
              </View>
            </View>
          </View>

          {/* Show expanded sections if expanded is true */}
          {expandedFeatures.advancedAnalysis && (
            <View style={styles.expandedContent}>
              {renderBehavioralInsights()}
              {renderComparativeInsights()}
              {renderRecommendations()}
            </View>
          )}

          {/* View Complete Analysis Button */}
          <TouchableOpacity style={styles.viewButton} onPress={navigateToAdvancedAnalysis}>
            <Text style={styles.viewButtonText}>View Complete Analysis</Text>
            <Ionicons name="arrow-forward" size={16} color={NeutralColors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Refresh Analysis button (only show if we have existing analysis) */}
      {analysis && !analysis.isGenerating && !loading && (
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleGenerateAnalysis}
          disabled={!requestLimits.canRequest || loading}
        >
          <Ionicons
            name="refresh"
            size={16}
            color={requestLimits.canRequest ? Colors.primary : NeutralColors.gray400}
          />
          <Text
            style={[
              styles.refreshButtonText,
              !requestLimits.canRequest && styles.refreshButtonTextDisabled,
            ]}
          >
            Refresh Analysis
          </Text>
        </TouchableOpacity>
      )}

      {refreshing && (
        <View style={styles.refreshOverlay}>
          <ActivityIndicator size="large" color={NeutralColors.white} />
          <Text style={styles.refreshText}>Generating new analysis...</Text>
          {renderProgressIndicator()}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: NeutralColors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: "hidden",
  },
  headerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${NeutralColors.white}33`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: NeutralColors.white,
    marginLeft: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: NeutralColors.white,
  },
  requestLimitBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${NeutralColors.white}33`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requestLimitBadgeWarning: {
    backgroundColor: `${Colors.warning}4D`,
  },
  requestLimitText: {
    fontSize: 12,
    fontWeight: "600",
    color: NeutralColors.white,
    marginLeft: 4,
  },
  contentContainer: {
    padding: 20,
  },
  expandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  expandDescription: {
    fontSize: 14,
    color: NeutralColors.gray600,
    flex: 1,
    marginRight: 10,
  },
  analysisMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  confidenceContainer: {
    flex: 1,
    marginRight: 12,
  },
  confidenceLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: NeutralColors.gray200,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  confidenceFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
    textAlign: "right",
  },
  qualityContainer: {
    alignItems: "flex-end",
  },
  qualityLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  qualityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: NeutralColors.gray200,
  },
  qualityExcellent: {
    backgroundColor: `${Colors.success}26`,
  },
  qualityGood: {
    backgroundColor: `${Colors.info}26`,
  },
  qualityAverage: {
    backgroundColor: `${Colors.warning}26`,
  },
  qualityLimited: {
    backgroundColor: `${Colors.danger}26`,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: "600",
    color: NeutralColors.gray700,
  },
  expandedContent: {
    marginBottom: 16,
  },
  insightCard: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  personalitySection: {
    gap: 8,
  },
  personalityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  personalityLabel: {
    fontSize: 13,
    color: NeutralColors.gray600,
    width: "30%",
  },
  personalityScaleContainer: {
    flex: 1,
    height: 6,
    backgroundColor: NeutralColors.gray200,
    borderRadius: 3,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  personalityScale: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  personalityValue: {
    fontSize: 12,
    fontWeight: "600",
    color: NeutralColors.gray600,
    width: "10%",
    textAlign: "right",
  },
  comparativeSection: {
    marginBottom: 12,
  },
  archetypeContainer: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  archetypeItem: {
    marginBottom: 8,
  },
  archetypeLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginBottom: 2,
  },
  archetypeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  archetypeScoreContainer: {
    height: 6,
    backgroundColor: NeutralColors.gray200,
    borderRadius: 3,
    overflow: "hidden",
  },
  archetypeScore: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  uniquenessSection: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 12,
    padding: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: NeutralColors.gray600,
    marginBottom: 8,
  },
  uniquenessFactor: {
    marginBottom: 8,
  },
  uniquenessFactorText: {
    fontSize: 13,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  uniquenessScoreContainer: {
    height: 6,
    backgroundColor: NeutralColors.gray200,
    borderRadius: 3,
    overflow: "hidden",
  },
  uniquenessScore: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  recommendationSection: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 12,
    padding: 12,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  topRecommendation: {},
  recommendationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  recommendationName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  recommendationScore: {
    backgroundColor: `${Colors.success}26`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendationScoreText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.success,
  },
  recommendationTimeframe: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginBottom: 8,
  },
  recommendationFactors: {
    marginTop: 8,
  },
  factorsLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  factorItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  factorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  factorText: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  viewButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: NeutralColors.white,
    marginRight: 6,
  },
  loadingContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: NeutralColors.gray600,
    textAlign: "center",
    marginBottom: 16,
  },
  progressContainer: {
    width: "100%",
    alignItems: "center",
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: NeutralColors.gray200,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  errorContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  errorText: {
    fontSize: 15,
    color: NeutralColors.gray600,
    textAlign: "center",
    marginBottom: 20,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: NeutralColors.white,
    marginRight: 8,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    paddingVertical: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.primary,
    marginLeft: 6,
  },
  refreshButtonTextDisabled: {
    color: NeutralColors.gray400,
  },
  refreshOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${Colors.primary}E6`,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  refreshText: {
    color: NeutralColors.white,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 16,
  },
});

export default AdvancedTravelAnalysisCard;
