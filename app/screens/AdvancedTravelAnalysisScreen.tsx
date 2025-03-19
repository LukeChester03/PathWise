// screens/AdvancedTravelAnalysisScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { LinearGradient } from "expo-linear-gradient";
import { AccentColors, Colors, NeutralColors } from "../constants/colours";
import {
  getAdvancedTravelAnalysis,
  checkAdvancedAnalysisRequestLimit,
  getAdvancedAnalysisProgress,
  generateAdvancedTravelAnalysis,
} from "../services/LearnScreen/aiTravelAnalysisService";
import { getVisitedPlaces } from "../controllers/Map/visitedPlacesController";
import { VisitedPlaceDetails } from "../types/MapTypes";
import {
  AdvancedTravelAnalysis,
  AnalysisRequestLimitInfo,
  AnalysisGenerationProgress,
} from "../types/LearnScreen/TravelAnalysisTypes";
import Header from "../components/Global/Header";

// Tab sections for navigation
type TabSection = "temporal" | "spatial" | "behavioral" | "predictive" | "insights" | "comparative";

type AdvancedTravelAnalysisScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, "AdvancedTravelAnalysis">;
};

const { width } = Dimensions.get("window");

const AdvancedTravelAnalysisScreen: React.FC<AdvancedTravelAnalysisScreenProps> = ({
  navigation,
  route,
}) => {
  const [analysis, setAnalysis] = useState<AdvancedTravelAnalysis | null>(null);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlaceDetails[]>([]);
  const [activeTab, setActiveTab] = useState<TabSection>("temporal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [requestLimits, setRequestLimits] = useState<AnalysisRequestLimitInfo>({
    canRequest: true,
    requestsRemaining: 2,
  });
  const [progress, setProgress] = useState<AnalysisGenerationProgress | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    loadRequestLimits();

    // Set up progress polling
    const progressInterval = setInterval(loadProgress, 3000);
    return () => clearInterval(progressInterval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load visited places
      const places = await getVisitedPlaces();
      setVisitedPlaces(places || []);

      // Load advanced travel analysis
      const analysisData = await getAdvancedTravelAnalysis();
      if (analysisData) {
        setAnalysis(analysisData);
      } else {
        setError("No advanced analysis available. Generate your first analysis!");
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load analysis data");
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
          setRefreshing(true);
        } else if (progressInfo.progress === 100) {
          // If completed, reload the analysis
          await loadData();
          await loadRequestLimits();
          setRefreshing(false);
        }
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
      await loadRequestLimits();
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

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

  const handleHelpPress = () => {
    console.log("Show help for Advanced Travel Analysis");
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
          color="#FFFFFF"
        />
        <Text style={styles.requestLimitText}>{requestLimits.requestsRemaining} left today</Text>
      </View>
    );
  };

  const renderAnalysisSummary = () => {
    if (!analysis) return null;

    return (
      <View style={styles.summaryContainer}>
        <LinearGradient
          colors={["#2C3E50", "#4CA1AF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryGradient}
        >
          <View style={styles.summaryHeader}>
            <View style={styles.qualitySection}>
              <Text style={styles.qualityLabel}>Analysis Quality</Text>
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
                    : "Limited"}
                </Text>
              </View>
            </View>

            <View style={styles.confidenceSection}>
              <Text style={styles.confidenceLabel}>Confidence</Text>
              <View style={styles.confidenceBar}>
                <View style={[styles.confidenceFill, { width: `${analysis.confidenceScore}%` }]} />
              </View>
              <View style={styles.confidenceValue}>
                <Text style={styles.confidenceText}>{analysis.confidenceScore}%</Text>
              </View>
            </View>
          </View>

          <View style={styles.summaryMetadata}>
            <View style={styles.metadataItem}>
              <Ionicons name="calendar" size={14} color="#FFFFFF" />
              <Text style={styles.metadataText}>Analyzed {analysis.basedOnPlaces} places</Text>
            </View>

            <View style={styles.metadataItem}>
              <Ionicons name="time" size={14} color="#FFFFFF" />
              <Text style={styles.metadataText}>
                Last updated: {new Date(analysis.lastRefreshed).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderTabs = () => {
    const tabs: { id: TabSection; label: string; icon: string }[] = [
      { id: "temporal", label: "Temporal", icon: "time-outline" },
      { id: "spatial", label: "Spatial", icon: "map-outline" },
      { id: "behavioral", label: "Behavioral", icon: "person-outline" },
      { id: "predictive", label: "Predictive", icon: "compass-outline" },
      { id: "insights", label: "Insights", icon: "bulb-outline" },
      { id: "comparative", label: "Comparative", icon: "bar-chart-outline" },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabButton, activeTab === tab.id && styles.activeTabButton]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.id ? "#4CA1AF" : "#6B7280"}
            />
            <Text
              style={[styles.tabButtonText, activeTab === tab.id && styles.activeTabButtonText]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderTemporalTab = () => {
    if (!analysis || !analysis.temporalAnalysis) return null;

    const { temporalAnalysis } = analysis;

    return (
      <View style={styles.tabContent}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Annual Travel Progression</Text>
          </View>

          <Text style={styles.sectionDescription}>
            How your travel patterns have evolved year by year
          </Text>

          {temporalAnalysis.yearlyProgression &&
          Object.keys(temporalAnalysis.yearlyProgression).length > 0 ? (
            <View style={styles.yearlyProgressionChart}>
              {Object.entries(temporalAnalysis.yearlyProgression)
                .sort((a, b) => a[0].localeCompare(b[0])) // Sort by year
                .map(([year, yearData]) => {
                  if (!yearData) return null;

                  // Find the maximum value for scaling
                  const allVisits = Object.values(temporalAnalysis.yearlyProgression || {}).map(
                    (data) => data?.totalVisits || 0
                  );
                  const maxVisits = Math.max(...allVisits, 1); // Avoid division by zero

                  const barHeight = (yearData.totalVisits / maxVisits) * 100;

                  return (
                    <View key={year} style={styles.yearlyBarContainer}>
                      <View style={styles.yearlyBarInfo}>
                        <Text style={styles.yearlyBarCount}>{yearData.totalVisits}</Text>
                      </View>
                      <View style={styles.yearlyBarWrapper}>
                        <View style={[styles.yearlyBar, { height: `${barHeight}%` }]} />
                      </View>
                      <Text style={styles.yearlyBarLabel}>{year}</Text>
                    </View>
                  );
                })}
            </View>
          ) : (
            <Text style={styles.noDataText}>No yearly progression data available</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Seasonal Patterns</Text>
          </View>

          <Text style={styles.sectionDescription}>
            Your travel preferences across different seasons
          </Text>

          {temporalAnalysis.seasonalPatterns ? (
            <View style={styles.seasonalPatternsContainer}>
              {Object.entries(temporalAnalysis.seasonalPatterns).map(([season, data]) => {
                if (!data) return null;

                return (
                  <View key={season} style={styles.seasonalPattern}>
                    <View style={styles.seasonalHeader}>
                      <Text style={styles.seasonalName}>
                        {season.charAt(0).toUpperCase() + season.slice(1)}
                      </Text>
                      <Text style={styles.seasonalPercentage}>{data.visitPercentage}%</Text>
                    </View>

                    <View style={styles.seasonalBarContainer}>
                      <View
                        style={[
                          styles.seasonalBar,
                          { width: `${data.visitPercentage}%` },
                          season === "winter" && styles.winterBar,
                          season === "spring" && styles.springBar,
                          season === "summer" && styles.summerBar,
                          season === "fall" && styles.fallBar,
                        ]}
                      />
                    </View>

                    <View style={styles.seasonalDetails}>
                      <Text style={styles.seasonalDetailText}>
                        Top categories:{" "}
                        {(data.preferredCategories || []).slice(0, 2).join(", ") || "None"}
                      </Text>
                      <Text style={styles.seasonalDetailText}>
                        Avg. duration: {data.averageDuration || "Unknown"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noDataText}>No seasonal patterns data available</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Monthly Distribution</Text>
          </View>

          <Text style={styles.sectionDescription}>Your travel frequency throughout the year</Text>

          {temporalAnalysis.monthlyDistribution &&
          Object.keys(temporalAnalysis.monthlyDistribution).length > 0 ? (
            <View style={styles.monthlyDistributionContainer}>
              {Object.entries(temporalAnalysis.monthlyDistribution).map(([month, percentage]) => (
                <View key={month} style={styles.monthItem}>
                  <Text style={styles.monthName}>{month.substring(0, 3)}</Text>
                  <View style={styles.monthBarContainer}>
                    <View style={[styles.monthBar, { height: `${percentage * 4}%` }]} />
                  </View>
                  <Text style={styles.monthPercentage}>{percentage?.toFixed(1)}%</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No monthly distribution data available</Text>
          )}
        </View>
      </View>
    );
  };

  const renderSpatialTab = () => {
    if (!analysis || !analysis.spatialAnalysis) return null;

    const { spatialAnalysis } = analysis;

    return (
      <View style={styles.tabContent}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="locate" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Exploration Radius</Text>
          </View>

          <Text style={styles.sectionDescription}>
            How far you typically travel from your home base
          </Text>

          {spatialAnalysis.explorationRadius ? (
            <View style={styles.radiusMetricsContainer}>
              <View style={styles.radiusMetric}>
                <View style={styles.radiusMetricValue}>
                  <Text style={styles.radiusValue}>
                    {spatialAnalysis.explorationRadius.average}
                  </Text>
                  <Text style={styles.radiusUnit}>km</Text>
                </View>
                <Text style={styles.radiusLabel}>Average</Text>
              </View>

              <View style={styles.radiusMetric}>
                <View style={styles.radiusMetricValue}>
                  <Text style={styles.radiusValue}>
                    {spatialAnalysis.explorationRadius.maximum}
                  </Text>
                  <Text style={styles.radiusUnit}>km</Text>
                </View>
                <Text style={styles.radiusLabel}>Maximum</Text>
              </View>

              <View style={styles.radiusMetric}>
                <View style={styles.radiusMetricValue}>
                  <Text style={styles.radiusValue}>
                    {spatialAnalysis.explorationRadius.growthRate}
                  </Text>
                  <Text style={styles.radiusUnit}>%</Text>
                </View>
                <Text style={styles.radiusLabel}>Growth Rate</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>No exploration radius data available</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="git-branch" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Location Clusters</Text>
          </View>

          <Text style={styles.sectionDescription}>Concentrations of your visited locations</Text>

          {spatialAnalysis.locationClusters && spatialAnalysis.locationClusters.length > 0 ? (
            <View style={styles.clustersContainer}>
              {spatialAnalysis.locationClusters.map((cluster, index) => (
                <View key={index} style={styles.clusterCard}>
                  <View style={styles.clusterHeader}>
                    <Text style={styles.clusterName}>{cluster.clusterName}</Text>
                    <View style={styles.clusterVisits}>
                      <Text style={styles.clusterVisitsText}>{cluster.numberOfVisits} visits</Text>
                    </View>
                  </View>

                  <Text style={styles.clusterCenter}>Center point: {cluster.centerPoint}</Text>

                  <View style={styles.clusterCategories}>
                    <Text style={styles.clusterCategoriesLabel}>Top categories:</Text>
                    <View style={styles.categoryTags}>
                      {(cluster.topCategories || []).map((category, idx) => (
                        <View key={idx} style={styles.categoryTag}>
                          <Text style={styles.categoryTagText}>{category}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No cluster data available</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="compass" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Directional Tendencies</Text>
          </View>

          <Text style={styles.sectionDescription}>Your preferred travel directions</Text>

          {spatialAnalysis.directionTendencies ? (
            <View style={styles.directionContainer}>
              <View style={styles.compassRose}>
                {spatialAnalysis.directionTendencies.directionPercentages &&
                  Object.entries(spatialAnalysis.directionTendencies.directionPercentages).map(
                    ([direction, percentage]) => (
                      <View
                        key={direction}
                        style={[
                          styles.directionSegment,
                          direction === "N" && styles.northSegment,
                          direction === "S" && styles.southSegment,
                          direction === "E" && styles.eastSegment,
                          direction === "W" && styles.westSegment,
                          direction === "NE" && styles.northeastSegment,
                          direction === "NW" && styles.northwestSegment,
                          direction === "SE" && styles.southeastSegment,
                          direction === "SW" && styles.southwestSegment,
                          spatialAnalysis.directionTendencies.primaryDirection === direction &&
                            styles.primaryDirectionSegment,
                          spatialAnalysis.directionTendencies.secondaryDirection === direction &&
                            styles.secondaryDirectionSegment,
                        ]}
                      >
                        <Text style={styles.directionLetter}>{direction}</Text>
                        <Text style={styles.directionPercentage}>{percentage}%</Text>
                      </View>
                    )
                  )}
                <View style={styles.compassCenter} />
              </View>

              <View style={styles.directionInsight}>
                <Text style={styles.directionInsightText}>
                  {spatialAnalysis.directionTendencies.insight ||
                    "No directional insight available"}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>No directional tendencies data available</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="globe" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Regional Diversity</Text>
          </View>

          <Text style={styles.sectionDescription}>
            The breadth of your geographical exploration
          </Text>

          {spatialAnalysis.regionDiversity ? (
            <View style={styles.regionDiversityContainer}>
              <View style={styles.regionMetrics}>
                <View style={styles.regionMetric}>
                  <Text style={styles.regionMetricValue}>
                    {spatialAnalysis.regionDiversity.uniqueRegions}
                  </Text>
                  <Text style={styles.regionMetricLabel}>Unique Regions</Text>
                </View>

                <View style={styles.regionMetric}>
                  <Text style={styles.regionMetricValue}>
                    {spatialAnalysis.regionDiversity.regionSpread}
                  </Text>
                  <Text style={styles.regionMetricLabel}>Region Spread</Text>
                </View>
              </View>

              <View style={styles.regionExplorationContainer}>
                <View style={styles.regionExploration}>
                  <Text style={styles.regionExplorationLabel}>Most Explored:</Text>
                  <Text style={styles.regionExplorationValue}>
                    {spatialAnalysis.regionDiversity.mostExploredRegion}
                  </Text>
                </View>

                <View style={styles.regionExploration}>
                  <Text style={styles.regionExplorationLabel}>Least Explored:</Text>
                  <Text style={styles.regionExplorationValue}>
                    {spatialAnalysis.regionDiversity.leastExploredRegion}
                  </Text>
                </View>
              </View>

              <View style={styles.diversityInsight}>
                <Text style={styles.diversityInsightText}>
                  {spatialAnalysis.regionDiversity.diversityInsight ||
                    "No diversity insight available"}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>No regional diversity data available</Text>
          )}
        </View>
      </View>
    );
  };

  const renderBehavioralTab = () => {
    if (!analysis || !analysis.behavioralAnalysis) return null;

    const { behavioralAnalysis } = analysis;

    return (
      <View style={styles.tabContent}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="footsteps" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Exploration Style</Text>
          </View>

          <Text style={styles.sectionDescription}>Your approach to discovering new places</Text>

          {behavioralAnalysis.explorationStyle ? (
            <View style={styles.explorationStyleContainer}>
              <View style={styles.explorationMetric}>
                <View style={styles.explorationMetricHeader}>
                  <Text style={styles.explorationMetricLabel}>Spontaneity</Text>
                  <Text style={styles.explorationMetricValue}>
                    {behavioralAnalysis.explorationStyle.spontaneityScore}%
                  </Text>
                </View>
                <View style={styles.explorationMetricScale}>
                  <View
                    style={[
                      styles.explorationMetricFill,
                      { width: `${behavioralAnalysis.explorationStyle.spontaneityScore}%` },
                    ]}
                  />
                </View>
                <View style={styles.explorationMetricLabels}>
                  <Text style={styles.explorationMetricMinLabel}>Planned</Text>
                  <Text style={styles.explorationMetricMaxLabel}>Spontaneous</Text>
                </View>
              </View>

              <View style={styles.explorationMetric}>
                <View style={styles.explorationMetricHeader}>
                  <Text style={styles.explorationMetricLabel}>Variety Seeking</Text>
                  <Text style={styles.explorationMetricValue}>
                    {behavioralAnalysis.explorationStyle.varietySeeking}%
                  </Text>
                </View>
                <View style={styles.explorationMetricScale}>
                  <View
                    style={[
                      styles.explorationMetricFill,
                      { width: `${behavioralAnalysis.explorationStyle.varietySeeking}%` },
                    ]}
                  />
                </View>
                <View style={styles.explorationMetricLabels}>
                  <Text style={styles.explorationMetricMinLabel}>Consistent</Text>
                  <Text style={styles.explorationMetricMaxLabel}>Varied</Text>
                </View>
              </View>

              <View style={styles.explorationMetric}>
                <View style={styles.explorationMetricHeader}>
                  <Text style={styles.explorationMetricLabel}>Novelty Preference</Text>
                  <Text style={styles.explorationMetricValue}>
                    {behavioralAnalysis.explorationStyle.noveltyPreference}%
                  </Text>
                </View>
                <View style={styles.explorationMetricScale}>
                  <View
                    style={[
                      styles.explorationMetricFill,
                      { width: `${behavioralAnalysis.explorationStyle.noveltyPreference}%` },
                    ]}
                  />
                </View>
                <View style={styles.explorationMetricLabels}>
                  <Text style={styles.explorationMetricMinLabel}>Familiar</Text>
                  <Text style={styles.explorationMetricMaxLabel}>Novel</Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>No exploration style data available</Text>
          )}

          {behavioralAnalysis.explorationStyle ? (
            <View style={styles.returnVisitContainer}>
              <Text style={styles.returnVisitLabel}>Return Visit Rate</Text>
              <Text style={styles.returnVisitValue}>
                {behavioralAnalysis.explorationStyle.returnVisitRate}%
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Travel Personality</Text>
          </View>

          <Text style={styles.sectionDescription}>Your travel characteristics and preferences</Text>

          {behavioralAnalysis.travelPersonality ? (
            <View style={styles.personalityTraitsContainer}>
              <View style={styles.personalityTrait}>
                <Text style={styles.personalityTraitLabel}>Openness</Text>
                <View style={styles.personalityTraitScale}>
                  <View
                    style={[
                      styles.personalityTraitFill,
                      { width: `${behavioralAnalysis.travelPersonality.openness}%` },
                    ]}
                  />
                </View>
                <Text style={styles.personalityTraitValue}>
                  {behavioralAnalysis.travelPersonality.openness}%
                </Text>
              </View>

              <View style={styles.personalityTrait}>
                <Text style={styles.personalityTraitLabel}>Cultural Engagement</Text>
                <View style={styles.personalityTraitScale}>
                  <View
                    style={[
                      styles.personalityTraitFill,
                      { width: `${behavioralAnalysis.travelPersonality.cultureEngagement}%` },
                    ]}
                  />
                </View>
                <Text style={styles.personalityTraitValue}>
                  {behavioralAnalysis.travelPersonality.cultureEngagement}%
                </Text>
              </View>

              <View style={styles.personalityTrait}>
                <Text style={styles.personalityTraitLabel}>Social Orientation</Text>
                <View style={styles.personalityTraitScale}>
                  <View
                    style={[
                      styles.personalityTraitFill,
                      { width: `${behavioralAnalysis.travelPersonality.socialOrientation}%` },
                    ]}
                  />
                </View>
                <Text style={styles.personalityTraitValue}>
                  {behavioralAnalysis.travelPersonality.socialOrientation}%
                </Text>
              </View>

              <View style={styles.personalityTrait}>
                <Text style={styles.personalityTraitLabel}>Activity Level</Text>
                <View style={styles.personalityTraitScale}>
                  <View
                    style={[
                      styles.personalityTraitFill,
                      { width: `${behavioralAnalysis.travelPersonality.activityLevel}%` },
                    ]}
                  />
                </View>
                <Text style={styles.personalityTraitValue}>
                  {behavioralAnalysis.travelPersonality.activityLevel}%
                </Text>
              </View>

              <View style={styles.personalityTrait}>
                <Text style={styles.personalityTraitLabel}>Adventurousness</Text>
                <View style={styles.personalityTraitScale}>
                  <View
                    style={[
                      styles.personalityTraitFill,
                      { width: `${behavioralAnalysis.travelPersonality.adventurousness}%` },
                    ]}
                  />
                </View>
                <Text style={styles.personalityTraitValue}>
                  {behavioralAnalysis.travelPersonality.adventurousness}%
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>No travel personality data available</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Motivational Factors</Text>
          </View>

          <Text style={styles.sectionDescription}>What drives your travel decisions</Text>

          {behavioralAnalysis.motivationalFactors &&
          behavioralAnalysis.motivationalFactors.length > 0 ? (
            <View style={styles.motivationalFactorsContainer}>
              {behavioralAnalysis.motivationalFactors.map((factor, index) => (
                <View key={index} style={styles.motivationalFactor}>
                  <View style={styles.motivationalFactorHeader}>
                    <Text style={styles.motivationalFactorName}>{factor.factor}</Text>
                    <Text style={styles.motivationalFactorStrength}>{factor.strength}%</Text>
                  </View>
                  <View style={styles.motivationalFactorScale}>
                    <View
                      style={[styles.motivationalFactorFill, { width: `${factor.strength}%` }]}
                    />
                  </View>
                  <Text style={styles.motivationalFactorInsight}>{factor.insight}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No motivational factors data available</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Decision Patterns</Text>
          </View>

          <Text style={styles.sectionDescription}>How you make travel choices</Text>

          {behavioralAnalysis.decisionPatterns ? (
            <View style={styles.decisionPatternsContainer}>
              <View style={styles.decisionMetrics}>
                <View style={styles.decisionMetric}>
                  <Text style={styles.decisionMetricLabel}>Decision Speed</Text>
                  <View style={styles.decisionMetricScale}>
                    <View
                      style={[
                        styles.decisionMetricFill,
                        { width: `${behavioralAnalysis.decisionPatterns.decisionSpeed}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.decisionMetricLabels}>
                    <Text style={styles.decisionMetricMinLabel}>Deliberate</Text>
                    <Text style={styles.decisionMetricMaxLabel}>Quick</Text>
                  </View>
                </View>

                <View style={styles.decisionMetric}>
                  <Text style={styles.decisionMetricLabel}>Consistency</Text>
                  <View style={styles.decisionMetricScale}>
                    <View
                      style={[
                        styles.decisionMetricFill,
                        { width: `${behavioralAnalysis.decisionPatterns.consistencyScore}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.decisionMetricLabels}>
                    <Text style={styles.decisionMetricMinLabel}>Variable</Text>
                    <Text style={styles.decisionMetricMaxLabel}>Consistent</Text>
                  </View>
                </View>
              </View>

              {behavioralAnalysis.decisionPatterns.influenceFactors ? (
                <View style={styles.influenceFactorsContainer}>
                  <Text style={styles.influenceFactorsLabel}>Key Influence Factors:</Text>
                  <View style={styles.influenceFactorsTags}>
                    {behavioralAnalysis.decisionPatterns.influenceFactors.map((factor, index) => (
                      <View key={index} style={styles.influenceFactorTag}>
                        <Text style={styles.influenceFactorTagText}>{factor}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {behavioralAnalysis.decisionPatterns.insight && (
                <View style={styles.decisionInsight}>
                  <Text style={styles.decisionInsightText}>
                    {behavioralAnalysis.decisionPatterns.insight}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noDataText}>No decision patterns data available</Text>
          )}
        </View>
      </View>
    );
  };

  const renderPredictiveTab = () => {
    if (!analysis || !analysis.predictiveAnalysis) return null;

    const { predictiveAnalysis } = analysis;

    return (
      <View style={styles.tabContent}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="navigate" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Recommended Destinations</Text>
          </View>

          <Text style={styles.sectionDescription}>
            Places you might enjoy based on your travel history
          </Text>

          {predictiveAnalysis.recommendedDestinations &&
          predictiveAnalysis.recommendedDestinations.length > 0 ? (
            <View style={styles.recommendationsContainer}>
              {predictiveAnalysis.recommendedDestinations.map((destination, index) => (
                <View key={index} style={styles.recommendationCard}>
                  <View style={styles.recommendationHeader}>
                    <Text style={styles.recommendationName}>{destination.name}</Text>
                    <View
                      style={[
                        styles.recommendationConfidence,
                        destination.confidenceScore >= 80
                          ? styles.highConfidence
                          : destination.confidenceScore >= 60
                          ? styles.mediumConfidence
                          : styles.lowConfidence,
                      ]}
                    >
                      <Text style={styles.recommendationConfidenceText}>
                        {destination.confidenceScore}% match
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.recommendationTimeframe}>
                    Best time to visit: {destination.bestTimeToVisit || "Any time"}
                  </Text>

                  {destination.reasoningFactors && destination.reasoningFactors.length > 0 && (
                    <View style={styles.recommendationFactors}>
                      <Text style={styles.recommendationFactorsLabel}>Why you might like it:</Text>
                      {destination.reasoningFactors.map((factor, idx) => (
                        <View key={idx} style={styles.recommendationFactorItem}>
                          <View style={styles.recommendationFactorDot} />
                          <Text style={styles.recommendationFactorText}>{factor}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.interestLevelContainer}>
                    <Text style={styles.interestLevelLabel}>Predicted Interest Level</Text>
                    <View style={styles.interestLevelBar}>
                      <View
                        style={[
                          styles.interestLevelFill,
                          { width: `${destination.expectedInterestLevel}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.interestLevelValue}>
                      {destination.expectedInterestLevel}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No recommended destinations available</Text>
          )}
        </View>

        {/* Additional predictive tab sections (trends, interest evolution, trajectory) would go here */}
      </View>
    );
  };

  const renderInsightsTab = () => {
    if (!analysis || !analysis.analyticalInsights) return null;

    const { analyticalInsights } = analysis;

    return (
      <View style={styles.tabContent}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Key Insights</Text>
          </View>

          <Text style={styles.sectionDescription}>
            Important observations about your travel behavior
          </Text>

          {analyticalInsights.keyInsights && analyticalInsights.keyInsights.length > 0 ? (
            <View style={styles.keyInsightsContainer}>
              {analyticalInsights.keyInsights.map((insight, index) => (
                <View key={index} style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <View style={styles.insightConfidence}>
                      <Text style={styles.insightConfidenceText}>{insight.confidenceScore}%</Text>
                    </View>
                  </View>

                  <Text style={styles.insightDescription}>{insight.description}</Text>

                  <View style={styles.insightTagsContainer}>
                    <Text style={styles.insightCategoryLabel}>{insight.category}</Text>
                    {insight.tags && (
                      <View style={styles.insightTags}>
                        {insight.tags.map((tag, idx) => (
                          <View key={idx} style={styles.insightTag}>
                            <Text style={styles.insightTagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No key insights available</Text>
          )}
        </View>

        {/* Additional insights tab sections (patterns, anomalies, correlations) would go here */}
      </View>
    );
  };

  const renderComparativeTab = () => {
    if (!analysis || !analysis.comparativeAnalysis) return null;

    const { comparativeAnalysis } = analysis;

    return (
      <View style={styles.tabContent}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={20} color="#4CA1AF" />
            <Text style={styles.sectionTitle}>Persona Comparison</Text>
          </View>

          <Text style={styles.sectionDescription}>
            How your travel style compares to common traveler personas
          </Text>

          {comparativeAnalysis.personaComparison ? (
            <View style={styles.personaComparisonContainer}>
              <View style={styles.similarPersonaSection}>
                <Text style={styles.similarPersonaLabel}>Most Similar Travel Persona</Text>
                <Text style={styles.similarPersonaValue}>
                  {comparativeAnalysis.personaComparison.mostSimilarPersona}
                </Text>

                <View style={styles.similarityScoreContainer}>
                  <Text style={styles.similarityScoreLabel}>Similarity Score</Text>
                  <View style={styles.similarityScoreBar}>
                    <View
                      style={[
                        styles.similarityScoreFill,
                        { width: `${comparativeAnalysis.personaComparison.similarityScore}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.similarityScoreValue}>
                    {comparativeAnalysis.personaComparison.similarityScore}%
                  </Text>
                </View>
              </View>

              {comparativeAnalysis.personaComparison.keyDifferences &&
                comparativeAnalysis.personaComparison.keyDifferences.length > 0 && (
                  <View style={styles.keyDifferencesContainer}>
                    <Text style={styles.keyDifferencesLabel}>Key Differences</Text>
                    <View style={styles.differencesList}>
                      {comparativeAnalysis.personaComparison.keyDifferences.map(
                        (difference, index) => (
                          <View key={index} style={styles.differenceItem}>
                            <View style={styles.differenceDot} />
                            <Text style={styles.differenceText}>{difference}</Text>
                          </View>
                        )
                      )}
                    </View>
                  </View>
                )}

              {/* Additional persona comparison components would go here */}
            </View>
          ) : (
            <Text style={styles.noDataText}>No persona comparison data available</Text>
          )}
        </View>

        {/* Additional comparative tab sections (archetype analysis, benchmarks, uniqueness) would go here */}
      </View>
    );
  };

  // Main render function
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Header
        title="Advanced Travel Analysis"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightIcon="help-circle-outline"
        onRightIconPress={handleHelpPress}
        style={styles.header}
        leftAdditional={renderRequestLimitsBadge()}
      />

      {loading && !analysis ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your advanced travel analysis...</Text>
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
            <Ionicons name="analytics" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: false,
            })}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
          >
            {renderAnalysisSummary()}

            {renderTabs()}

            {activeTab === "temporal" && renderTemporalTab()}
            {activeTab === "spatial" && renderSpatialTab()}
            {activeTab === "behavioral" && renderBehavioralTab()}
            {activeTab === "predictive" && renderPredictiveTab()}
            {activeTab === "insights" && renderInsightsTab()}
            {activeTab === "comparative" && renderComparativeTab()}

            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.refreshAnalysisButton}
                onPress={handleGenerateAnalysis}
                disabled={!requestLimits.canRequest || loading}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color={requestLimits.canRequest ? "#FFFFFF" : "#CCCCCC"}
                />
                <Text
                  style={[
                    styles.refreshAnalysisButtonText,
                    !requestLimits.canRequest && styles.refreshButtonDisabled,
                  ]}
                >
                  Refresh Analysis
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
  },
  requestLimitBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${NeutralColors.white}33`, // 20% opacity
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  requestLimitBadgeWarning: {
    backgroundColor: `${Colors.warning}4D`, // 30% opacity
  },
  requestLimitText: {
    fontSize: 12,
    fontWeight: "600",
    color: NeutralColors.white,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 20,
    textAlign: "center",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: NeutralColors.white,
    marginRight: 8,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 30,
  },
  summaryContainer: {
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: NeutralColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  summaryGradient: {
    padding: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  qualitySection: {
    flex: 1,
    marginRight: 12,
  },
  qualityLabel: {
    fontSize: 12,
    color: `${NeutralColors.white}CC`, // 80% opacity
    marginBottom: 6,
  },
  qualityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: `${NeutralColors.white}33`, // 20% opacity
  },
  qualityExcellent: {
    backgroundColor: `${Colors.success}80`, // 50% opacity
  },
  qualityGood: {
    backgroundColor: `${Colors.info}80`, // 50% opacity
  },
  qualityAverage: {
    backgroundColor: `${Colors.warning}80`, // 50% opacity
  },
  qualityLimited: {
    backgroundColor: `${Colors.danger}80`, // 50% opacity
  },
  qualityText: {
    fontSize: 12,
    fontWeight: "600",
    color: NeutralColors.white,
  },
  confidenceSection: {
    flex: 1,
  },
  confidenceLabel: {
    fontSize: 12,
    color: `${NeutralColors.white}CC`, // 80% opacity
    marginBottom: 6,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: `${NeutralColors.white}33`, // 20% opacity
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  confidenceFill: {
    height: "100%",
    backgroundColor: NeutralColors.white,
    borderRadius: 4,
  },
  confidenceValue: {
    alignItems: "flex-end",
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "600",
    color: NeutralColors.white,
  },
  summaryMetadata: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 12,
    color: NeutralColors.white,
    marginLeft: 6,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray300,
    backgroundColor: Colors.background,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginLeft: 6,
  },
  activeTabButtonText: {
    color: Colors.primary,
    fontWeight: "600",
  },
  tabContent: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: NeutralColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    fontStyle: "italic",
    textAlign: "center",
  },

  // Temporal Tab Styles
  yearlyProgressionChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 200,
    marginTop: 16,
  },
  yearlyBarContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 2,
  },
  yearlyBarInfo: {
    marginBottom: 4,
  },
  yearlyBarCount: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "600",
  },
  yearlyBarWrapper: {
    width: "70%",
    height: 150,
    justifyContent: "flex-end",
  },
  yearlyBar: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  yearlyBarLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginTop: 8,
  },
  seasonalPatternsContainer: {
    marginTop: 16,
  },
  seasonalPattern: {
    marginBottom: 16,
  },
  seasonalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  seasonalName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  seasonalPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  seasonalBarContainer: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  seasonalBar: {
    height: "100%",
    borderRadius: 4,
  },
  winterBar: {
    backgroundColor: Colors.info,
  },
  springBar: {
    backgroundColor: Colors.success,
  },
  summerBar: {
    backgroundColor: Colors.warning,
  },
  fallBar: {
    backgroundColor: Colors.danger,
  },
  seasonalDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  seasonalDetailText: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  monthlyDistributionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 120,
    alignItems: "flex-end",
    paddingTop: 16,
  },
  monthItem: {
    alignItems: "center",
    flex: 1,
  },
  monthName: {
    fontSize: 10,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  monthBarContainer: {
    width: 8,
    height: 80,
    justifyContent: "flex-end",
  },
  monthBar: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  monthPercentage: {
    fontSize: 10,
    color: NeutralColors.gray600,
    marginTop: 4,
  },

  // Spatial Tab Styles
  radiusMetricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  radiusMetric: {
    alignItems: "center",
    flex: 1,
  },
  radiusMetricValue: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  radiusValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary,
  },
  radiusUnit: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginLeft: 2,
    marginBottom: 2,
  },
  radiusLabel: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginTop: 4,
  },
  clustersContainer: {
    marginTop: 16,
  },
  clusterCard: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  clusterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  clusterName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  clusterVisits: {
    backgroundColor: `${Colors.primary}33`, // 20% opacity
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  clusterVisitsText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.primary,
  },
  clusterCenter: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  clusterCategories: {
    marginTop: 4,
  },
  clusterCategoriesLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  categoryTags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  categoryTag: {
    backgroundColor: `${Colors.primary}26`, // 15% opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  categoryTagText: {
    fontSize: 12,
    color: Colors.primary,
  },
  directionContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  compassRose: {
    width: 200,
    height: 200,
    position: "relative",
    marginBottom: 16,
  },
  directionSegment: {
    position: "absolute",
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: `${Colors.primary}1A`, // 10% opacity
    borderRadius: 8,
  },
  northSegment: {
    top: 0,
    left: 70,
  },
  southSegment: {
    bottom: 0,
    left: 70,
  },
  eastSegment: {
    right: 0,
    top: 70,
  },
  westSegment: {
    left: 0,
    top: 70,
  },
  northeastSegment: {
    top: 15,
    right: 15,
  },
  northwestSegment: {
    top: 15,
    left: 15,
  },
  southeastSegment: {
    bottom: 15,
    right: 15,
  },
  southwestSegment: {
    bottom: 15,
    left: 15,
  },
  primaryDirectionSegment: {
    backgroundColor: `${Colors.primary}66`, // 40% opacity
  },
  secondaryDirectionSegment: {
    backgroundColor: `${Colors.primary}40`, // 25% opacity
  },
  compassCenter: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    top: 90,
    left: 90,
  },
  directionLetter: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  directionPercentage: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  directionInsight: {
    marginTop: 8,
    padding: 12,
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    width: "100%",
  },
  directionInsightText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: "center",
    fontStyle: "italic",
  },
  regionDiversityContainer: {
    marginTop: 16,
  },
  regionMetrics: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  regionMetric: {
    alignItems: "center",
  },
  regionMetricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary,
  },
  regionMetricLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginTop: 4,
  },
  regionExplorationContainer: {
    marginBottom: 16,
  },
  regionExploration: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  regionExplorationLabel: {
    fontSize: 14,
    color: NeutralColors.gray600,
  },
  regionExplorationValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  diversityInsight: {
    padding: 12,
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
  },
  diversityInsightText: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: "italic",
    textAlign: "center",
  },

  // Behavioral Tab Styles
  explorationStyleContainer: {
    marginTop: 16,
  },
  explorationMetric: {
    marginBottom: 16,
  },
  explorationMetricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  explorationMetricLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  explorationMetricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  explorationMetricScale: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  explorationMetricFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  explorationMetricLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  explorationMetricMinLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  explorationMetricMaxLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  returnVisitContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: NeutralColors.gray100,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  returnVisitLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  returnVisitValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  },
  personalityTraitsContainer: {
    marginTop: 16,
  },
  personalityTrait: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  personalityTraitLabel: {
    width: "40%",
    fontSize: 14,
    color: Colors.text,
  },
  personalityTraitScale: {
    flex: 1,
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginHorizontal: 12,
  },
  personalityTraitFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  personalityTraitValue: {
    width: "10%",
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
    textAlign: "right",
  },
  motivationalFactorsContainer: {
    marginTop: 16,
  },
  motivationalFactor: {
    marginBottom: 16,
  },
  motivationalFactorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  motivationalFactorName: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  motivationalFactorStrength: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  motivationalFactorScale: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  motivationalFactorFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  motivationalFactorInsight: {
    fontSize: 13,
    color: NeutralColors.gray600,
    fontStyle: "italic",
  },
  decisionPatternsContainer: {
    marginTop: 16,
  },
  decisionMetrics: {
    marginBottom: 16,
  },
  decisionMetric: {
    marginBottom: 12,
  },
  decisionMetricLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  decisionMetricScale: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  decisionMetricFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  decisionMetricLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  decisionMetricMinLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  decisionMetricMaxLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  influenceFactorsContainer: {
    marginBottom: 16,
  },
  influenceFactorsLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  influenceFactorsTags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  influenceFactorTag: {
    backgroundColor: `${Colors.primary}26`, // 15% opacity
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  influenceFactorTagText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.primary,
  },
  decisionInsight: {
    padding: 12,
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
  },
  decisionInsightText: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: "italic",
    textAlign: "center",
  },

  // Predictive Tab Styles
  recommendationsContainer: {
    marginTop: 16,
  },
  recommendationCard: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  recommendationName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  recommendationConfidence: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highConfidence: {
    backgroundColor: `${Colors.success}33`, // 20% opacity
  },
  mediumConfidence: {
    backgroundColor: `${Colors.info}33`, // 20% opacity
  },
  lowConfidence: {
    backgroundColor: `${Colors.danger}33`, // 20% opacity
  },
  recommendationConfidenceText: {
    fontSize: 12,
    fontWeight: "600",
  },
  recommendationTimeframe: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginBottom: 8,
  },
  recommendationFactors: {
    marginBottom: 12,
  },
  recommendationFactorsLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 6,
  },
  recommendationFactorItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  recommendationFactorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  recommendationFactorText: {
    fontSize: 14,
    color: NeutralColors.gray600,
  },
  interestLevelContainer: {
    marginTop: 4,
  },
  interestLevelLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  interestLevelBar: {
    height: 6,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  interestLevelFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  interestLevelValue: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
    textAlign: "right",
  },
  trendsContainer: {
    marginTop: 16,
  },
  trendCard: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  trendTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  trendTimeframe: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shortTermTimeframe: {
    backgroundColor: `${Colors.success}33`, // 20% opacity
  },
  mediumTermTimeframe: {
    backgroundColor: `${Colors.info}33`, // 20% opacity
  },
  longTermTimeframe: {
    backgroundColor: `${AccentColors.accent2}33`, // 20% opacity
  },
  trendTimeframeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  trendLikelihood: {
    marginBottom: 8,
  },
  trendLikelihoodLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  trendLikelihoodBar: {
    height: 6,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  trendLikelihoodFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  trendLikelihoodValue: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
    textAlign: "right",
  },
  trendExplanation: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: "italic",
  },
  interestEvolutionContainer: {
    marginTop: 16,
  },
  interestCategory: {
    marginBottom: 16,
  },
  interestCategoryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  interestTags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  interestTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  emergingTag: {
    backgroundColor: `${Colors.success}26`, // 15% opacity
  },
  steadyTag: {
    backgroundColor: `${Colors.info}26`, // 15% opacity
  },
  decliningTag: {
    backgroundColor: `${Colors.danger}26`, // 15% opacity
  },
  newSuggestionTag: {
    backgroundColor: `${AccentColors.accent1}26`, // 15% opacity
  },
  interestTagText: {
    fontSize: 13,
    marginLeft: 4,
  },
  emergingTagText: {
    color: Colors.success,
  },
  steadyTagText: {
    color: Colors.info,
  },
  decliningTagText: {
    color: Colors.danger,
  },
  newSuggestionTagText: {
    color: AccentColors.accent1,
  },
  trajectoryContainer: {
    marginTop: 16,
  },
  trajectoryMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  trajectoryMetric: {
    alignItems: "center",
    flex: 1,
  },
  trajectoryMetricLabel: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginBottom: 8,
  },
  trajectoryMetricValue: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  positiveChange: {
    backgroundColor: `${Colors.success}26`, // 15% opacity
  },
  negativeChange: {
    backgroundColor: `${Colors.danger}26`, // 15% opacity
  },
  neutralChange: {
    backgroundColor: `${NeutralColors.gray500}26`, // 15% opacity
  },
  trajectoryMetricText: {
    fontSize: 16,
    fontWeight: "700",
  },
  nextPhaseContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  nextPhaseLabel: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  nextPhaseValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
  },
  trajectorySummary: {
    padding: 12,
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
  },
  trajectorySummaryText: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: "italic",
    textAlign: "center",
  },

  // Insights Tab Styles
  keyInsightsContainer: {
    marginTop: 16,
  },
  insightCard: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  insightConfidence: {
    backgroundColor: `${Colors.primary}33`, // 20% opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  insightConfidenceText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  insightDescription: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  insightTagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  insightCategoryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: NeutralColors.gray600,
    backgroundColor: NeutralColors.gray300,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  insightTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
  },
  insightTag: {
    backgroundColor: `${Colors.primary}26`, // 15% opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  insightTagText: {
    fontSize: 12,
    color: Colors.primary,
  },
  patternInsightsContainer: {
    marginTop: 16,
  },
  patternCard: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  patternHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  patternTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  patternStrength: {
    backgroundColor: `${Colors.primary}33`, // 20% opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  patternStrengthText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.primary,
  },
  patternExamples: {
    marginBottom: 8,
  },
  patternExamplesLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  patternExampleItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  patternExampleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  patternExampleText: {
    fontSize: 14,
    color: NeutralColors.gray600,
  },
  patternImplications: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: "italic",
  },
  anomaliesContainer: {
    marginTop: 16,
  },
  anomalyCard: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  anomalyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  anomalyDescription: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  anomalySignificance: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highSignificance: {
    backgroundColor: `${Colors.danger}33`, // 20% opacity
  },
  mediumSignificance: {
    backgroundColor: `${AccentColors.accent1}33`, // 20% opacity
  },
  lowSignificance: {
    backgroundColor: `${Colors.info}33`, // 20% opacity
  },
  anomalySignificanceText: {
    fontSize: 12,
    fontWeight: "600",
  },
  anomalyExplanation: {
    fontSize: 14,
    color: Colors.text,
  },
  correlationsContainer: {
    marginTop: 16,
  },
  correlationCard: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  correlationFactors: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  correlationFactor: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  correlationArrow: {
    marginHorizontal: 8,
  },
  correlationStrength: {
    marginBottom: 8,
  },
  correlationStrengthLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  correlationStrengthScale: {
    height: 6,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  correlationStrengthFill: {
    height: "100%",
    borderRadius: 3,
  },
  correlationStrengthValue: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  positiveCorrelation: {
    color: Colors.primary,
  },
  negativeCorrelation: {
    color: Colors.danger,
  },
  correlationInsight: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: "italic",
  },

  // Comparative Tab Styles
  personaComparisonContainer: {
    marginTop: 16,
  },
  similarPersonaSection: {
    marginBottom: 16,
  },
  similarPersonaLabel: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  similarPersonaValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  similarityScoreContainer: {
    marginTop: 8,
  },
  similarityScoreLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  similarityScoreBar: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  similarityScoreFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  similarityScoreValue: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
    textAlign: "right",
  },
  keyDifferencesContainer: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  keyDifferencesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  differencesList: {},
  differenceItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  differenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  differenceText: {
    fontSize: 14,
    color: Colors.text,
  },
  distinctiveTraitsContainer: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
  },
  distinctiveTraitsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  distinctiveTraitsList: {},
  distinctiveTraitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  distinctiveTraitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AccentColors.accent2,
    marginRight: 8,
  },
  distinctiveTraitText: {
    fontSize: 14,
    color: Colors.text,
  },
  archetypeAnalysisContainer: {
    marginTop: 16,
  },
  archetypeItem: {
    marginBottom: 16,
  },
  archetypeLabel: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  archetypeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  archetypeScoreContainer: {
    marginBottom: 4,
  },
  archetypeScoreBar: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  archetypeScoreFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  archetypeScoreValue: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
    textAlign: "right",
  },
  atypicalTraitsContainer: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
  },
  atypicalTraitsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  atypicalTraitsList: {},
  atypicalTraitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  atypicalTraitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AccentColors.accent1,
    marginRight: 8,
  },
  atypicalTraitText: {
    fontSize: 14,
    color: Colors.text,
  },
  benchmarksContainer: {
    marginTop: 16,
  },
  benchmarkItem: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  benchmarkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  benchmarkCategory: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  benchmarkPercentile: {
    backgroundColor: `${Colors.primary}33`, // 20% opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  benchmarkPercentileText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.primary,
  },
  benchmarkComparisonBar: {
    marginBottom: 12,
  },
  benchmarkScaleContainer: {
    height: 16,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 8,
    marginBottom: 8,
    position: "relative",
  },
  benchmarkScale: {
    height: "100%",
    width: "100%",
    borderRadius: 8,
  },
  benchmarkAverageMark: {
    position: "absolute",
    width: 2,
    height: 16,
    backgroundColor: NeutralColors.gray600,
    borderRadius: 1,
  },
  benchmarkUserMark: {
    position: "absolute",
    width: 4,
    height: 16,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  benchmarkLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  benchmarkLegendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  benchmarkUserDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 4,
  },
  benchmarkAverageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NeutralColors.gray600,
    marginRight: 4,
  },
  benchmarkLegendText: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  benchmarkInsight: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: "italic",
  },
  uniquenessFactorsContainer: {
    marginTop: 16,
  },
  uniquenessFactor: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  uniquenessFactorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  uniquenessFactorName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  uniquenessFactorScore: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
  },
  uniquenessScoreBar: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  uniquenessScoreFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  uniquenessExplanation: {
    fontSize: 14,
    color: Colors.text,
  },

  // General Styles for Progress, Bottom Actions, etc.
  progressContainer: {
    marginTop: 16,
    width: "100%",
    alignItems: "center",
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: NeutralColors.gray300,
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
    textAlign: "center",
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
    textAlign: "center",
  },
  bottomActions: {
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  refreshAnalysisButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  refreshAnalysisButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: NeutralColors.white,
    marginLeft: 8,
  },
  refreshButtonDisabled: {
    color: NeutralColors.gray400,
  },
});

export default AdvancedTravelAnalysisScreen;
