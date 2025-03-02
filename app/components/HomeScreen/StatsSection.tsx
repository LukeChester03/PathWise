// components/Home/StatsSection.tsx
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
  Platform,
} from "react-native";
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

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(-20)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

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

    // Start animations
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Fade in and slide in animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(titleAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(100)),
      }),
    ]).start();

    // Continuous pulse animation for icons
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animation for background elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation for some elements
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Loading shimmer animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();
  };

  const onStatsScroll = Animated.event([{ nativeEvent: { contentOffset: { x: statsScrollX } } }], {
    useNativeDriver: true,
  });

  // Placeholder card when no stats are available
  const renderEmptyStateCard = () => {
    return (
      <Animated.View
        style={[
          styles.statCardContainer,
          {
            opacity: fadeAnim,
            transform: [
              {
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.statCard}
          onPress={() => {
            /* Navigate to exploration screen */
          }}
        >
          <LinearGradient
            colors={["#6A11CB" as const, "#2575FC" as const]}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Animated background circles */}
            <View style={styles.circlesContainer}>
              <Animated.View
                style={[
                  styles.backgroundCircle,
                  {
                    width: 100,
                    height: 100,
                    top: -50,
                    right: -20,
                    opacity: 0.15,
                    transform: [
                      {
                        translateY: floatAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -10],
                        }),
                      },
                      {
                        rotate: rotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "360deg"],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.backgroundCircle,
                  {
                    width: 40,
                    height: 40,
                    bottom: 20,
                    left: 20,
                    opacity: 0.1,
                    transform: [
                      {
                        translateX: floatAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 8],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>

            <View style={styles.statContent}>
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.12],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="compass-outline" size={24} color="#fff" />
              </Animated.View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>Start Exploring</Text>
                <Text style={styles.statLabel}>
                  Your journey awaits! Begin tracking your adventures.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
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
          <Animated.View
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
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, idx === 0 ? -8 : 8],
                    }),
                  },
                  {
                    translateX: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, idx === 0 ? 5 : -5],
                    }),
                  },
                  {
                    rotate:
                      idx === 0
                        ? rotateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0deg", "360deg"],
                          })
                        : "0deg",
                  },
                ],
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

    // Create animations for each effect
    const scale = statsScrollX.interpolate({
      inputRange,
      outputRange: [0.95, 1, 0.95],
      extrapolate: "clamp",
    });

    const translateY = statsScrollX.interpolate({
      inputRange,
      outputRange: [8, 0, 8],
      extrapolate: "clamp",
    });

    const cardOpacity = statsScrollX.interpolate({
      inputRange,
      outputRange: [0.85, 1, 0.85],
      extrapolate: "clamp",
    });

    const rotate = statsScrollX.interpolate({
      inputRange,
      outputRange: ["-0.5deg", "0deg", "0.5deg"],
      extrapolate: "clamp",
    });

    // Combine with fade anim
    const combinedOpacity = Animated.multiply(fadeAnim, cardOpacity);

    return (
      <Animated.View
        style={[
          styles.statCardContainer,
          {
            opacity: combinedOpacity,
            transform: [{ scale }, { translateY }, { rotate }],
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
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.12],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name={item.icon} size={24} color="#fff" />
              </Animated.View>

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

  // Render loading state with animation
  const renderLoadingState = () => {
    return (
      <Animated.View
        style={[
          styles.loadingContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.loadingShimmer,
            {
              opacity: shimmerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 0.8],
              }),
              transform: [
                {
                  translateX: shimmerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-STATS_CARD_WIDTH, STATS_CARD_WIDTH],
                  }),
                },
              ],
            },
          ]}
        />
        <Text style={styles.loadingText}>Loading your stats...</Text>
      </Animated.View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.statsContainer,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Animated.Text
        style={[
          styles.sectionTitle,
          {
            transform: [
              {
                translateX: titleAnim,
              },
            ],
          },
        ]}
      >
        Your Journey
      </Animated.Text>

      {isLoading ? (
        renderLoadingState()
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    marginBottom: 30,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  statsCarousel: {
    paddingVertical: 8,
    paddingLeft: 0,
    paddingRight: width - STATS_CARD_WIDTH - SPACING,
    alignItems: "center",
  },
  statCardContainer: {
    width: STATS_CARD_WIDTH,
    marginHorizontal: SPACING,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statCard: {
    width: STATS_CARD_WIDTH,
    height: 120,
    borderRadius: 24,
    overflow: "hidden",
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
    width: "100%",
    paddingVertical: 8,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 120,
    width: "100%",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 24,
  },
  loadingText: {
    fontSize: 16,
    color: "#888",
  },
  loadingShimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    width: STATS_CARD_WIDTH * 2,
  },
});

export default StatsSection;
