import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { fetchUserStats } from "../../services/statsService";
import { Colors } from "../../constants/colours";

const { width } = Dimensions.get("window");
const STATS_CARD_WIDTH = width * 0.6;
const STATS_CARD_HEIGHT = 155;
const SPACING = 16;
const MAX_CAROUSEL_ITEMS = 5;

interface StatItem {
  id: string;
  value: string;
  label: string;
  icon: string;
  gradientColors: [string, string];
}

const AnimatedBackgroundCircles = ({ colors }: { colors: [string, string] }) => {
  const circle1Position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const circle2Position = useRef(new Animated.ValueXY({ x: 30, y: 30 })).current;
  const circle3Position = useRef(new Animated.ValueXY({ x: -20, y: 10 })).current;

  const opacity1 = useRef(new Animated.Value(0.45)).current;
  const opacity2 = useRef(new Animated.Value(0.4)).current;
  const opacity3 = useRef(new Animated.Value(0.5)).current;

  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scale3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animateCircle = (
      position: Animated.ValueXY,
      opacityValue: Animated.Value,
      scaleValue: Animated.Value
    ) => {
      const randomX = Math.random() * 40 - 20;
      const randomY = Math.random() * 40 - 20;
      const randomDuration = 4000 + Math.random() * 2500;
      Animated.timing(position, {
        toValue: { x: randomX, y: randomY },
        duration: randomDuration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => animateCircle(position, opacityValue, scaleValue));

      Animated.sequence([
        Animated.timing(opacityValue, {
          toValue: 0.35 + Math.random() * 0.3,
          duration: randomDuration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0.4 + Math.random() * 0.3,
          duration: randomDuration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 0.9 + Math.random() * 0.2,
          duration: randomDuration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1 + Math.random() * 0.2,
          duration: randomDuration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    };

    animateCircle(circle1Position, opacity1, scale1);
    animateCircle(circle2Position, opacity2, scale2);
    animateCircle(circle3Position, opacity3, scale3);
  }, []);

  return (
    <View style={styles.circlesContainer}>
      <Animated.View
        style={[
          styles.circle,
          styles.circle1,
          {
            backgroundColor: colors[0],
            opacity: opacity1,
            transform: [
              { translateX: circle1Position.x },
              { translateY: circle1Position.y },
              { scale: scale1 },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle,
          styles.circle2,
          {
            backgroundColor: colors[0],
            opacity: opacity2,
            transform: [
              { translateX: circle2Position.x },
              { translateY: circle2Position.y },
              { scale: scale2 },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle,
          styles.circle3,
          {
            backgroundColor: colors[1],
            opacity: opacity3,
            transform: [
              { translateX: circle3Position.x },
              { translateY: circle3Position.y },
              { scale: scale3 },
            ],
          },
        ]}
      />
    </View>
  );
};

const ShineEffect = () => {
  const shinePosition = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    const animateShine = () => {
      Animated.timing(shinePosition, {
        toValue: STATS_CARD_WIDTH + 200,
        duration: 2000,
        easing: Easing.ease,
        useNativeDriver: true,
        delay: Math.random() * 5000 + 2000,
      }).start(() => {
        shinePosition.setValue(-200);
        animateShine();
      });
    };

    animateShine();
  }, []);

  return (
    <Animated.View
      style={[
        styles.shineEffect,
        {
          transform: [{ translateX: shinePosition }],
        },
      ]}
    />
  );
};

const StatsSection: React.FC = () => {
  const [userStats, setUserStats] = useState<StatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const sectionAnimatedValue = useRef(new Animated.Value(0)).current;
  const loadingAnimatedValue = useRef(new Animated.Value(0.5)).current;
  const journeyArrowAnim = useRef(new Animated.Value(0)).current;
  const headerAnimation = useRef(new Animated.Value(0)).current;

  const cardAnimations = useRef(
    Array(MAX_CAROUSEL_ITEMS + 1)
      .fill(0)
      .map(() => ({
        opacity: new Animated.Value(0),
        translateY: new Animated.Value(25),
        scale: new Animated.Value(0.9),
      }))
  ).current;

  const animateCardsEntrance = () => {
    Animated.spring(sectionAnimatedValue, {
      toValue: 1,
      tension: 30,
      friction: 7,
      useNativeDriver: true,
    }).start();

    Animated.timing(headerAnimation, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    cardAnimations.forEach((anim, index) => {
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 700,
          delay: index * 120,
          useNativeDriver: true,
        }),
        Animated.spring(anim.translateY, {
          toValue: 0,
          tension: 50,
          friction: 7,
          delay: index * 120,
          useNativeDriver: true,
        }),
        Animated.spring(anim.scale, {
          toValue: 1,
          tension: 50,
          friction: 6,
          delay: index * 120,
          useNativeDriver: true,
        }),
      ]).start();
    });

    animateJourneyArrow();
  };

  const animateJourneyArrow = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(journeyArrowAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(journeyArrowAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();
  };

  const startLoadingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingAnimatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(loadingAnimatedValue, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();
  };

  useEffect(() => {
    startLoadingAnimation();

    const loadUserStats = async () => {
      try {
        setIsLoading(true);
        const stats = await fetchUserStats();
        setUserStats(stats);
        setTimeout(() => {
          animateCardsEntrance();
        }, 150);
      } catch (error) {
        console.error("Error fetching user stats:", error);

        // Fallback
        const mockStats: StatItem[] = [
          {
            id: "1",
            value: "12",
            label: "Places Visited",
            icon: "map-marker",
            gradientColors: ["#4a90e2", "#5da9ff"],
          },
          {
            id: "2",
            value: "32.5",
            label: "Miles Walked",
            icon: "footsteps",
            gradientColors: ["#50c878", "#63e08c"],
          },
          {
            id: "3",
            value: "8",
            label: "Cities Explored",
            icon: "location",
            gradientColors: ["#ff7043", "#ff8a65"],
          },
          {
            id: "4",
            value: "5",
            label: "Achievements",
            icon: "trophy",
            gradientColors: ["#9c27b0", "#ba68c8"],
          },
        ];

        setUserStats(mockStats);

        setTimeout(() => {
          animateCardsEntrance();
        }, 150);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserStats();
  }, []);

  const navigateToJourneyScreen = () => {
    navigation.navigate("MyJourney", { stats: userStats });
  };

  // Get top 5 stats
  const getCarouselData = () => {
    if (userStats.length === 0) return [];
    return userStats.slice(0, MAX_CAROUSEL_ITEMS);
  };

  const createPressAnimation = (scale: Animated.Value) => {
    return Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 40,
        friction: 5,
        useNativeDriver: true,
      }),
    ]);
  };

  const renderStatCard = ({ item, index }: { item: StatItem; index: number }) => {
    const { opacity, translateY, scale } = cardAnimations[index];

    return (
      <Animated.View
        style={[
          styles.statCardContainer,
          {
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.statCard}
          onPress={() => {
            createPressAnimation(scale).start();
          }}
        >
          <LinearGradient
            colors={[item.gradientColors[0], item.gradientColors[1]]}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <AnimatedBackgroundCircles colors={item.gradientColors} />
            <ShineEffect />

            <View style={styles.statContent}>
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon} size={30} color="#fff" />
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

  const renderViewJourneyCard = () => {
    const carouselLength = getCarouselData().length;
    const { opacity, translateY, scale } = cardAnimations[carouselLength];

    const arrowTranslate = journeyArrowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 5],
    });

    return (
      <Animated.View
        style={[
          styles.statCardContainer,
          {
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.viewJourneyCard}
          onPress={() => {
            createPressAnimation(scale).start();
            navigateToJourneyScreen();
          }}
        >
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={styles.journeyGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <AnimatedBackgroundCircles colors={["#667eea", "#764ba2"]} />
            <ShineEffect />

            <View style={styles.journeyContent}>
              <View style={styles.journeyMainContent}>
                <View style={styles.journeyIconContainer}>
                  <Ionicons name="map-outline" size={32} color="#fff" />
                </View>

                <View style={styles.journeyTextContainer}>
                  <Text style={styles.journeyTitle}>View All Stats</Text>
                </View>
              </View>

              <Animated.View
                style={[
                  styles.arrowContainer,
                  {
                    transform: [{ translateX: arrowTranslate }],
                  },
                ]}
              >
                <Ionicons name="arrow-forward" size={24} color="#fff" />
              </Animated.View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View
          style={{
            opacity: loadingAnimatedValue,
            transform: [{ scale: loadingAnimatedValue }],
          }}
        >
          <Text style={styles.loadingText}>Loading your stats...</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.statsContainer,
        {
          opacity: sectionAnimatedValue,
          transform: [
            {
              scale: sectionAnimatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.sectionHeader,
          {
            opacity: headerAnimation,
            transform: [
              {
                translateX: headerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name="stats-chart" size={22} color={Colors.primary} />
        <Text style={styles.sectionTitle}>Your Journey Stats</Text>
      </Animated.View>

      <FlatList
        data={getCarouselData()}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderStatCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsCarousel}
        ListFooterComponent={renderViewJourneyCard}
        decelerationRate="fast"
        snapToInterval={STATS_CARD_WIDTH + SPACING}
        snapToAlignment="start"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    width: "100%",
    marginVertical: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text || "#333",
    marginLeft: 8,
  },
  statsCarousel: {
    paddingVertical: 12,
    paddingLeft: 4,
    paddingRight: 8,
  },
  statCardContainer: {
    width: STATS_CARD_WIDTH,
    marginRight: SPACING,
    elevation: 8,
  },
  statCard: {
    width: STATS_CARD_WIDTH,
    height: STATS_CARD_HEIGHT,
    borderRadius: 22,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  viewJourneyCard: {
    width: STATS_CARD_WIDTH,
    height: STATS_CARD_HEIGHT,
    borderRadius: 22,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  statGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  journeyGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  circlesContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  circle: {
    position: "absolute",
    borderRadius: 100,
  },
  circle1: {
    width: 90,
    height: 90,
    top: -25,
    right: -25,
  },
  circle2: {
    width: 70,
    height: 70,
    bottom: -15,
    left: -15,
  },
  circle3: {
    width: 55,
    height: 55,
    bottom: 45,
    right: 25,
  },
  shineEffect: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 100,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    transform: [{ skewX: "-20deg" }],
    zIndex: 2,
  },
  statContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    height: "100%",
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 30,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
    opacity: 0.9,
  },
  journeyContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    height: "100%",
  },
  journeyMainContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  journeyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
  },
  journeyTextContainer: {
    maxWidth: STATS_CARD_WIDTH - 150,
  },
  journeyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  journeySubtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#fff",
    opacity: 0.9,
  },
  arrowContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 180,
    marginHorizontal: 4,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 22,
  },
  loadingText: {
    fontSize: 18,
    color: "#888",
    fontWeight: "500",
  },
});

export default StatsSection;
