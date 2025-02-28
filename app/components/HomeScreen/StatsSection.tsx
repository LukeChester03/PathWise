// components/Home/StatsSection.tsx
import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { fetchUserStats } from "../../services/statsService";
import { StatItem } from "../../types/StatTypes";

const { width } = Dimensions.get("window");
const STATS_CARD_WIDTH = width * 0.75;
const SPACING = 12;

const StatsSection = () => {
  const [userStats, setUserStats] = useState<StatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const statsScrollX = useRef(new Animated.Value(0)).current;
  const statsListRef = useRef<Animated.FlatList<StatItem>>(null);

  useEffect(() => {
    const loadUserStats = async () => {
      try {
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

  const onStatsScroll = Animated.event([{ nativeEvent: { contentOffset: { x: statsScrollX } } }], {
    useNativeDriver: false,
  });

  // Placeholder card when no stats are available
  const renderEmptyStateCard = () => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.statCardContainer}
        onPress={() => {
          /* Navigate to exploration screen */
        }}
      >
        <View style={styles.statCard}>
          <LinearGradient
            colors={["#6A11CB" as const, "#2575FC" as const]}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="compass-outline" size={24} color="#fff" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>Start Exploring</Text>
                <Text style={styles.statLabel}>
                  Your journey awaits! Begin tracking your adventures.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  };

  // Function to render unique background circles for each card
  const renderBackgroundCircles = (index: number) => {
    const circleStyles = [
      {
        circles: [
          { width: 100, height: 100, top: -50, right: -20, opacity: 0.15 },
          { width: 40, height: 40, bottom: 20, left: 20, opacity: 0.1 },
        ],
      },
      {
        circles: [
          { width: 80, height: 80, top: 10, right: 20, opacity: 0.13 },
          { width: 60, height: 60, bottom: -20, left: 40, opacity: 0.1 },
        ],
      },
      {
        circles: [
          { width: 70, height: 70, top: -20, left: -20, opacity: 0.12 },
          { width: 50, height: 50, bottom: -15, right: 40, opacity: 0.15 },
        ],
      },
      {
        circles: [
          { width: 90, height: 90, top: -30, right: -30, opacity: 0.12 },
          { width: 45, height: 45, bottom: 10, left: 30, opacity: 0.14 },
        ],
      },
    ];

    const style = circleStyles[index % circleStyles.length];
    return (
      <View style={styles.circlesContainer}>
        {style.circles.map((circle, idx) => (
          <View
            key={idx}
            style={[
              styles.backgroundCircle,
              {
                width: circle.width,
                height: circle.height,
                top: circle.top,
                right: circle.right,
                left: circle.left,
                bottom: circle.bottom,
                opacity: circle.opacity,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderStatCard = ({ item, index }: { item: StatItem; index: number }) => {
    const inputRange = [
      (index - 1) * (STATS_CARD_WIDTH + SPACING * 2),
      index * (STATS_CARD_WIDTH + SPACING * 2),
      (index + 1) * (STATS_CARD_WIDTH + SPACING * 2),
    ];

    const scale = statsScrollX.interpolate({
      inputRange,
      outputRange: [0.95, 1, 0.95],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.statCardContainer,
          {
            transform: [{ scale }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.statCard}
          onPress={() => {
            /* Optional: Add navigation or action */
          }}
        >
          <LinearGradient
            colors={[item.gradientColors[0], item.gradientColors[1]]}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Background decoration circles */}
            {renderBackgroundCircles(index)}

            <View style={styles.statContent}>
              {/* Icon with white circular background */}
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon} size={24} color="#fff" />
              </View>

              {/* Stat information */}
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Your Journey</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your stats...</Text>
        </View>
      ) : userStats.length > 0 ? (
        <Animated.FlatList<StatItem>
          ref={statsListRef}
          data={userStats}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStatCard}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsCarousel}
          snapToInterval={STATS_CARD_WIDTH + SPACING * 2}
          decelerationRate="fast"
          onScroll={onStatsScroll}
          scrollEventThrottle={16}
          snapToAlignment="center"
          bounces={true}
        />
      ) : (
        <View style={styles.emptyStateContainer}>{renderEmptyStateCard()}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  statsCarousel: {
    paddingLeft: SPACING,
    paddingRight: width - STATS_CARD_WIDTH - SPACING,
    alignItems: "center",
  },
  statCardContainer: {
    width: STATS_CARD_WIDTH,
    marginHorizontal: SPACING,
    alignItems: "center",
  },
  statCard: {
    width: STATS_CARD_WIDTH,
    height: 120,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    position: "relative",
  },
  circlesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundCircle: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: "#ffffff",
  },
  statContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
    opacity: 0.9,
    letterSpacing: 0.3,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 120,
  },
  loadingText: {
    fontSize: 16,
    color: "#888",
  },
});

export default StatsSection;
