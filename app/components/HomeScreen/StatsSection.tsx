// components/Home/StatsSection.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { fetchUserStats } from "../../services/statsService";
import { StatItem } from "../../types/StatTypes";
import { Colors } from "../../constants/colours";

const { width } = Dimensions.get("window");
const STATS_CARD_WIDTH = width * 0.42;
const SPACING = 12;
const MAX_CAROUSEL_ITEMS = 5;

const StatsSection = () => {
  const [userStats, setUserStats] = useState<StatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const loadUserStats = async () => {
      try {
        setIsLoading(true);
        const stats = await fetchUserStats();
        setUserStats(stats);
      } catch (error) {
        console.error("Error fetching user stats:", error);
        setUserStats([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserStats();
  }, []);

  // Navigate to the full journey screen
  const navigateToJourneyScreen = () => {
    // @ts-ignore
    navigation.navigate("MyJourney", { stats: userStats });
  };

  // Get top 5 stats for carousel
  const getCarouselData = () => {
    if (userStats.length === 0) return [];
    return userStats.slice(0, MAX_CAROUSEL_ITEMS);
  };

  // Render stat card
  const renderStatCard = ({ item }: { item: StatItem }) => {
    return (
      <View style={styles.statCardContainer}>
        <TouchableOpacity activeOpacity={0.9} style={styles.statCard}>
          <LinearGradient
            colors={[item.gradientColors[0], item.gradientColors[1]]}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statContent}>
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon} size={24} color="#fff" />
              </View>

              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  // Render "View My Journey" card
  const renderViewJourneyCard = () => {
    return (
      <View style={styles.statCardContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.statCard}
          onPress={navigateToJourneyScreen}
        >
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="map-outline" size={24} color="#fff" />
              </View>

              <View style={styles.statInfo}>
                <Text style={styles.statValue}>View My Journey</Text>
                <Text style={styles.statLabel}>See all your stats</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your stats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.statsContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>Your Journey Stats</Text>
      </View>

      <FlatList
        data={getCarouselData()}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderStatCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsCarousel}
        ListFooterComponent={renderViewJourneyCard}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    width: "100%",
    marginBottom: 24,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  statsCarousel: {
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 16,
  },
  statCardContainer: {
    width: STATS_CARD_WIDTH,
    marginRight: SPACING,
  },
  statCard: {
    width: STATS_CARD_WIDTH,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
  },
  statGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  statContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
    opacity: 0.9,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 120,
    marginHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#888",
  },
});

export default StatsSection;
