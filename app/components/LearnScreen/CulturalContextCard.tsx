import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { VisitedPlaceDetails } from "../../types/MapTypes";
import {
  getCulturalInsightsForVisitedPlaces,
  checkRequestLimit,
} from "../../services/LearnScreen/aiCulturalService";
import { EnhancedCulturalInsight } from "../../types/LearnScreen/CulturalContextTypes";

const { width } = Dimensions.get("window");
const ROTATION_INTERVAL = 6000;

interface CulturalContextCardProps {
  cardAnimation: Animated.Value;
  visitedPlaces: VisitedPlaceDetails[];
  navigation: any;
}

const CulturalContextCard = ({
  cardAnimation,
  visitedPlaces,
  navigation,
}: CulturalContextCardProps) => {
  const [culturalInsights, setCulturalInsights] = useState<EnhancedCulturalInsight[]>([]);
  const [currentInsightIndex, setCurrentInsightIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [requestLimitInfo, setRequestLimitInfo] = useState<{
    canRequest: boolean;
    requestsRemaining: number;
  }>({ canRequest: true, requestsRemaining: 5 });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const rotationTimer = useRef<NodeJS.Timeout | null>(null);
  const isAnimating = useRef<boolean>(false);

  const previewInsight = culturalInsights.length > 0 ? culturalInsights[currentInsightIndex] : null;

  useEffect(() => {
    if (culturalInsights.length > 1 && !loading && !error) {
      startRotationTimer();
    }

    return () => {
      if (rotationTimer.current) {
        clearInterval(rotationTimer.current);
      }
    };
  }, [culturalInsights, loading, error]);

  useEffect(() => {
    fetchCulturalInsights();
    checkApiLimits();
    return () => {
      if (rotationTimer.current) {
        clearInterval(rotationTimer.current);
      }
    };
  }, [visitedPlaces]);

  const startRotationTimer = () => {
    if (rotationTimer.current) {
      clearInterval(rotationTimer.current);
    }

    rotationTimer.current = setInterval(() => {
      if (!isAnimating.current && culturalInsights.length > 1) {
        rotateToNextInsight();
      }
    }, ROTATION_INTERVAL);
  };

  const rotateToNextInsight = () => {
    if (culturalInsights.length <= 1) return;

    isAnimating.current = true;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start(() => {
      setCurrentInsightIndex((prevIndex) =>
        prevIndex === culturalInsights.length - 1 ? 0 : prevIndex + 1
      );
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    });
  };
  const fetchCulturalInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!visitedPlaces || visitedPlaces.length === 0) {
        setLoading(false);
        return;
      }
      const insights = await getCulturalInsightsForVisitedPlaces(visitedPlaces);
      console.log(
        `Received ${insights.length} cultural insights:`,
        insights.map((i) => i.region)
      );
      setCulturalInsights(insights);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching cultural insights:", err);
      setError("Failed to load cultural insights");
      setLoading(false);
    }
  };
  const checkApiLimits = async () => {
    try {
      const limits = await checkRequestLimit();
      setRequestLimitInfo(limits);
    } catch (error) {
      console.error("Error checking API limits:", error);
    }
  };

  const getHighlightedCustom = () => {
    if (!previewInsight || !previewInsight.customs || previewInsight.customs.length === 0) {
      return null;
    }
    return previewInsight.customs[0];
  };

  const navigateToFullContextScreen = () => {
    navigation.navigate("CulturalContext", {
      visitedPlaces: visitedPlaces,
      region: previewInsight?.region,
    });
  };

  const renderLoading = () => (
    <View style={styles.contentContainer}>
      <ActivityIndicator size="small" color="#ffffff" />
      <Text style={styles.loadingText}>Discovering cultural insights...</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.contentContainer}>
      <Ionicons name="alert-circle-outline" size={32} color="#ffffff" />
      <Text style={styles.errorTitle}>Oops!</Text>
      <Text style={styles.errorText}>We couldn't load cultural insights</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchCulturalInsights}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.contentContainer}>
      <Ionicons name="globe-outline" size={36} color="#ffffff" />
      <Text style={styles.emptyTitle}>Explore Cultures</Text>
      <Text style={styles.emptyText}>
        Visit places to unlock cultural insights about local customs and traditions
      </Text>
    </View>
  );

  const renderContent = () => {
    const highlightedCustom = getHighlightedCustom();

    return (
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.regionBadge}>
          <Text style={styles.regionText}>{previewInsight?.region}</Text>
        </View>

        <Text style={styles.insightTitle}>Cultural Context</Text>

        {highlightedCustom && (
          <View style={styles.customContainer}>
            <Text style={styles.customTitle}>{highlightedCustom.title}</Text>
            <Text style={styles.customDescription} numberOfLines={2}>
              {highlightedCustom.description}
            </Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{previewInsight?.customs?.length || 0}</Text>
            <Text style={styles.statLabel}>Customs</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{previewInsight?.localTips?.length || 0}</Text>
            <Text style={styles.statLabel}>Local Tips</Text>
          </View>
        </View>

        <View style={styles.aiContainer}>
          <Ionicons name="flash" size={12} color="#ffffff" />
          <Text style={styles.aiText}>AI-Generated Insights</Text>
        </View>
      </Animated.View>
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
      <TouchableOpacity
        style={styles.cardContainer}
        activeOpacity={0.9}
        onPress={navigateToFullContextScreen}
      >
        <LinearGradient
          colors={["#8B5CF6", "#7E22CE"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading
            ? renderLoading()
            : error
            ? renderError()
            : !previewInsight
            ? renderEmpty()
            : renderContent()}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {loading
                ? "Please wait..."
                : error
                ? "Cultural insights unavailable"
                : !previewInsight
                ? "Start your cultural journey"
                : `Discover more about ${previewInsight.region}`}
            </Text>
            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
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
    shadowColor: "#7E22CE",
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
    justifyContent: "center",
    alignItems: "center",
  },
  regionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  regionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
  insightTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  customContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 16,
  },
  customTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
  },
  customDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
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
    color: "#ffffff",
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
    color: "#ffffff",
  },
  arrowContainer: {
    width: 32,
    height: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 12,
    marginBottom: 8,
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
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});

export default CulturalContextCard;
