// components/Home/StatsSection.js
import React, { useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const STATS_CARD_WIDTH = width * 0.75;
const SPACING = 12;

const StatsSection = () => {
  const statsScrollX = useRef(new Animated.Value(0)).current;
  const statsListRef = useRef(null);

  // Hard-coded user stats
  const userStats = [
    {
      id: 1,
      icon: "map",
      value: 14,
      label: "Places",
      gradientColors: ["#4A90E2", "#5DA9FF"],
    },
    {
      id: 2,
      icon: "earth",
      value: 3,
      label: "Countries",
      gradientColors: ["#FF7043", "#FF8A65"],
    },
    {
      id: 3,
      icon: "flame",
      value: 5,
      label: "Day Streak",
      gradientColors: ["#d03f74", "#ff1493"],
    },
    {
      id: 4,
      icon: "star",
      value: 24,
      label: "Achievements",
      gradientColors: ["#50C878", "#63E08C"],
    },
  ];

  const onStatsScroll = Animated.event([{ nativeEvent: { contentOffset: { x: statsScrollX } } }], {
    useNativeDriver: false,
  });

  const renderStatCard = ({ item, index }) => {
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
        <TouchableOpacity activeOpacity={0.9} style={styles.statCard}>
          <LinearGradient
            colors={item.gradientColors}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statContent}>
              <View style={styles.statIconContainer}>
                <Ionicons name={item.icon} size={28} color="#fff" />
              </View>
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

      <Animated.FlatList
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
    borderRadius: 20,
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
    alignItems: "center",
  },
  statContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    width: "100%",
  },
  statIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  statInfo: {
    justifyContent: "center",
  },
  statValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.9,
  },
});

export default StatsSection;
