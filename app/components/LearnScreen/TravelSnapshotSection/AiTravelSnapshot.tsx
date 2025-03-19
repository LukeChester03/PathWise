import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { TravelProfile } from "../../../types/LearnScreen/TravelProfileTypes";
import { VisitedPlaceDetails } from "../../../types/MapTypes";
import { getTravelProfile } from "../../../services/LearnScreen/travelProfileService";
import { getVisitedPlaces } from "../../../controllers/Map/visitedPlacesController";

interface AiTravelSnapshotProps {
  fadeAnim: Animated.Value;
  pulseAnim: Animated.Value;
  placesToShow: VisitedPlaceDetails[];
  onProfileUpdated?: (profile: TravelProfile) => void;
}

const AiTravelSnapshot: React.FC<AiTravelSnapshotProps> = ({
  fadeAnim,
  pulseAnim,
  placesToShow,
  onProfileUpdated,
}) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<TravelProfile | null>(null);
  const [insufficientPlaces, setInsufficientPlaces] = useState(false);

  useEffect(() => {
    checkVisitedPlacesAndFetchProfile();
  }, []);

  // This function first checks directly with Firebase for visited places count
  const checkVisitedPlacesAndFetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Directly query Firebase/AsyncStorage for all visited places
      const visitedPlaces = await getVisitedPlaces();

      // Check if we have at least 2 valid visited places (excluding initialization documents)
      const validPlaces = visitedPlaces.filter((place) => !place._isInitDocument);

      if (validPlaces.length < 2) {
        // Not enough places to generate a profile
        setInsufficientPlaces(true);
        setProfile(null);
        setLoading(false);
        return;
      }

      // We have enough places, clear the insufficient flag
      setInsufficientPlaces(false);

      // Now fetch the travel profile
      const { profile } = await getTravelProfile();

      setProfile(profile);

      if (onProfileUpdated) {
        onProfileUpdated(profile);
      }
    } catch (err) {
      console.error("Error in checkVisitedPlacesAndFetchProfile:", err);
      setError("Failed to generate travel profile");
    } finally {
      setLoading(false);
    }
  };

  const handleViewFullProfile = () => {
    if (profile) {
      navigation.navigate("TravelProfile", { profile });
    }
  };

  const handleRefresh = () => {
    checkVisitedPlacesAndFetchProfile();
  };

  // Render view for insufficient places
  if (insufficientPlaces) {
    return (
      <Animated.View
        style={[
          styles.aiSummaryCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={["#4F46E5", "#818CF8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiSummaryGradient}
        >
          <View style={styles.aiSummaryContent}>
            <View style={styles.errorContainer}>
              <Ionicons name="map-outline" size={40} color="#FFFFFF" />
              <Text style={styles.errorText}>Unlock Your Travel Snapshot</Text>
              <Text style={styles.errorSubtext}>
                Visit at least 2 unique locations to generate your personalized travel profile.
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  // Error state (for other error scenarios)
  if (error) {
    return (
      <Animated.View
        style={[
          styles.aiSummaryCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={["#4F46E5", "#818CF8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiSummaryGradient}
        >
          <View style={styles.aiSummaryContent}>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={40} color="#FFFFFF" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  // Loading state
  if (loading || !profile) {
    return (
      <Animated.View
        style={[
          styles.aiSummaryCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={["#4F46E5", "#818CF8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiSummaryGradient}
        >
          <View style={styles.aiSummaryContent}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Analyzing your travel profile...</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  // Normal profile rendering
  return (
    <Animated.View
      style={[
        styles.aiSummaryCard,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={["#4F46E5", "#818CF8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.aiSummaryGradient}
      >
        <View style={styles.aiSummaryContent}>
          <View style={styles.aiSummaryHeader}>
            <Text style={styles.aiSummaryTitle}>Travel Snapshot</Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.aiChipContainer}>
                <Ionicons name="scan" size={12} color="#FFFFFF" />
              </View>
            </Animated.View>
          </View>

          <View style={styles.travelProfileContainer}>
            <View style={styles.travelProfileTypeContainer}>
              <Text style={styles.travelProfileType}>{profile.type}</Text>
              <View style={styles.travelProfileLevelContainer}>
                <Text style={styles.travelProfileLevel}>{profile.level}</Text>
              </View>
            </View>

            <Text style={styles.aiSummaryDescription}>{profile.description}</Text>
          </View>

          <View style={styles.aiActionsRow}>
            <TouchableOpacity style={styles.aiActionButton} onPress={handleViewFullProfile}>
              <View style={styles.aiActionIconContainer}>
                <Ionicons name="analytics" size={16} color="#4F46E5" />
              </View>
              <Text style={styles.aiActionText}>Full Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.aiActionButton} onPress={handleRefresh}>
              <View style={styles.aiActionIconContainer}>
                <Ionicons name="refresh" size={16} color="#4F46E5" />
              </View>
              <Text style={styles.aiActionText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  aiSummaryCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  aiSummaryGradient: {
    borderRadius: 20,
    padding: 0,
  },
  aiSummaryContent: {
    padding: 20,
  },
  aiSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  aiSummaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  aiChipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  aiChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  aiSummaryDescription: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
    marginBottom: 16,
    opacity: 0.9,
  },
  aiActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 10,
  },
  aiActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  aiActionIconContainer: {
    marginRight: 6,
  },
  aiActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F46E5",
  },

  // Travel Profile Elements
  travelProfileContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  travelProfileTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  travelProfileType: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  travelProfileLevelContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  travelProfileLevel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    marginBottom: 10,
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  errorSubtext: {
    marginBottom: 15,
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
    opacity: 0.8,
  },
  retryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default AiTravelSnapshot;
