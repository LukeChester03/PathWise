import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { Colors, NeutralColors } from "../constants/colours";
import {
  getAdvancedTravelAnalysis,
  checkAdvancedAnalysisRequestLimit,
  getAdvancedAnalysisProgress,
  generateAdvancedTravelAnalysis,
  checkAndPerformAutomaticUpdate,
  getLatestAnalysisFromFirestore,
} from "../services/LearnScreen/aiTravelAnalysisService";
import { getVisitedPlaces } from "../controllers/Map/visitedPlacesController";
import { VisitedPlaceDetails } from "../types/MapTypes";
import {
  AdvancedTravelAnalysis,
  AnalysisRequestLimitInfo,
  AnalysisGenerationProgress,
} from "../types/LearnScreen/TravelAnalysisTypes";
import Header from "../components/Global/Header";
import AnalysisSummary from "../components/LearnScreen/TravelAnalysisSection/AnalysisSummary";
import AnalysisTabs from "../components/LearnScreen/TravelAnalysisSection/Tabs/AnalysisTabs";
import ProgressIndicator from "../components/LearnScreen/TravelAnalysisSection/ProgressIndicator";
import RequestLimitsBadge from "../components/LearnScreen/TravelAnalysisSection/RequestLimitsBadge";
import ScrollableContainer from "../components/LearnScreen/TravelAnalysisSection/ScrollableContainer";
import TabContent from "../components/LearnScreen/TravelAnalysisSection/TabContent";

export type TabSection =
  | "temporal"
  | "spatial"
  | "behavioral"
  | "predictive"
  | "insights"
  | "comparative";

type AdvancedTravelAnalysisScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, "AdvancedTravelAnalysis">;
};

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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [firebaseDataExists, setFirebaseDataExists] = useState<boolean | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    loadRequestLimits();

    const progressInterval = setInterval(loadProgress, 3000);
    return () => clearInterval(progressInterval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const places = await getVisitedPlaces();
      setVisitedPlaces(places || []);

      const firebaseData = await getLatestAnalysisFromFirestore();
      setFirebaseDataExists(!!firebaseData);

      if (places && places.length > 0) {
        await checkAndPerformAutomaticUpdate(places);
      }

      const analysisData = await getAdvancedTravelAnalysis();
      if (analysisData) {
        setAnalysis(analysisData);
        setLastUpdated(
          analysisData.lastRefreshed ? new Date(analysisData.lastRefreshed) : new Date()
        );
      } else if (!firebaseData) {
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
        if (progressInfo.isGenerating) {
          setLoading(true);
          setRefreshing(true);
        } else if (progressInfo.progress === 100) {
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

      await generateAdvancedTravelAnalysis(visitedPlaces);
      setFirebaseDataExists(true);
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

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return "Never updated";

    const formattedDate = date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const formattedTime = date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${formattedDate} at ${formattedTime}`;
  };

  const getNextUpdateTime = (date: Date | null) => {
    if (!date) return "Unknown";

    const nextUpdate = new Date(date);
    nextUpdate.setDate(nextUpdate.getDate() + 1);

    return nextUpdate.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        leftAdditional={<RequestLimitsBadge requestLimits={requestLimits} />}
      />

      {loading && !analysis ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your advanced travel analysis...</Text>
          {progress && <ProgressIndicator progress={progress} />}
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
        <ScrollableContainer refreshing={refreshing} onRefresh={onRefresh} scrollY={scrollY}>
          {analysis && <AnalysisSummary analysis={analysis} />}

          <AnalysisTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <TabContent activeTab={activeTab} analysis={analysis} />

          <View style={styles.bottomActions}>
            <View style={styles.lastUpdatedContainer}>
              <Ionicons name="time-outline" size={18} color={Colors.text} style={styles.timeIcon} />
              <Text style={styles.lastUpdatedText}>
                Last updated: {formatLastUpdated(lastUpdated)}
              </Text>
            </View>
            <Text style={styles.automaticUpdateText}>
              Analysis updates automatically every 24 hours
            </Text>
            <Text style={styles.nextUpdateText}>
              Next update approximately at {getNextUpdateTime(lastUpdated)}
            </Text>
          </View>
        </ScrollableContainer>
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
  bottomActions: {
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  lastUpdatedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  timeIcon: {
    marginRight: 6,
  },
  lastUpdatedText: {
    fontSize: 15,
    color: Colors.text,
  },
  automaticUpdateText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    textAlign: "center",
    fontStyle: "italic",
  },
  nextUpdateText: {
    fontSize: 13,
    color: NeutralColors.gray500,
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
});

export default AdvancedTravelAnalysisScreen;
