// components/Home/FeaturesSection.tsx
import React, { useRef, useEffect } from "react";
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

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const SPACING = 12;

interface FeatureCard {
  id: number;
  title: string;
  description: string;
  icon: string;
  screen: string;
  gradientColors: [string, string];
}

interface FeaturesSectionProps {
  navigateToScreen: (screen: string) => void;
}

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ navigateToScreen }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<Animated.FlatList<FeatureCard>>(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;

  const featureCards: FeatureCard[] = [
    {
      id: 1,
      title: "Discover",
      description: "Explore new locations and get guided directions to exciting places around you.",
      icon: "compass-outline",
      screen: "Discover",
      gradientColors: ["#4A90E2", "#5DA9FF"],
    },
    {
      id: 2,
      title: "Learn",
      description:
        "Get AI-powered information tailored to each location, like having a personal tour guide.",
      icon: "sparkles-outline",
      screen: "Learn",
      gradientColors: ["#50C878", "#63E08C"],
    },
    {
      id: 3,
      title: "Places",
      description: "View and collect places you've visited to build your personal travel journal.",
      icon: "location-outline",
      screen: "Explore",
      gradientColors: ["#FF7043", "#FF8A65"],
    },
  ];

  // Setup animations
  useEffect(() => {
    // Pulse animation for icons
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle rotation for some elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating effect for background circles
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade in section
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Title animation
    Animated.timing(titleAnim, {
      toValue: 1,
      duration: 600,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: false,
  });

  // Function to render decorative circles with different positions for each card
  const renderCircles = (index: number, colors: [string, string]) => {
    // Different circle arrangements based on card index
    if (index === 0) {
      // Discover card circles
      return (
        <>
          <Animated.View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 150,
                height: 150,
                top: -60,
                right: -30,
                opacity: 0.05,
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
                      outputRange: ["0deg", "10deg"],
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
                backgroundColor: colors[1],
                width: 70,
                height: 70,
                bottom: -20,
                left: 30,
                opacity: 0.04,
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 8],
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
                backgroundColor: colors[0],
                width: 40,
                height: 40,
                top: 30,
                left: 40,
                opacity: 0.06,
                transform: [
                  {
                    translateX: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 5],
                    }),
                  },
                ],
              },
            ]}
          />
        </>
      );
    } else if (index === 1) {
      return (
        <>
          <Animated.View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 100,
                height: 100,
                top: 20,
                right: -40,
                opacity: 0.04,
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8],
                    }),
                  },
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "-8deg"],
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
                backgroundColor: colors[1],
                width: 120,
                height: 120,
                bottom: -35,
                right: 50,
                opacity: 0.03,
                transform: [
                  {
                    translateX: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -6],
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
                backgroundColor: colors[0],
                width: 60,
                height: 60,
                top: -20,
                left: 20,
                opacity: 0.05,
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 6],
                    }),
                  },
                ],
              },
            ]}
          />
        </>
      );
    } else {
      // Places card circles
      return (
        <>
          <Animated.View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 80,
                height: 80,
                top: -30,
                left: -20,
                opacity: 0.05,
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 5],
                    }),
                  },
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "5deg"],
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
                backgroundColor: colors[1],
                width: 130,
                height: 130,
                bottom: -30,
                right: -40,
                opacity: 0.04,
                transform: [
                  {
                    translateX: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8],
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
                backgroundColor: colors[0],
                width: 50,
                height: 50,
                top: 80,
                left: 60,
                opacity: 0.06,
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -4],
                    }),
                  },
                ],
              },
            ]}
          />
        </>
      );
    }
  };

  const renderCard = ({ item, index }: { item: FeatureCard; index: number }) => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + SPACING * 2),
      index * (CARD_WIDTH + SPACING * 2),
      (index + 1) * (CARD_WIDTH + SPACING * 2),
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: "clamp",
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [15, 0, 15],
      extrapolate: "clamp",
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.85, 1, 0.85],
      extrapolate: "clamp",
    });

    const cardRotate = scrollX.interpolate({
      inputRange,
      outputRange: ["-1deg", "0deg", "1deg"],
      extrapolate: "clamp",
    });

    // Animation for the arrow button on focus
    const arrowScale = scrollX.interpolate({
      inputRange,
      outputRange: [1, 1.1, 1],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity,
            transform: [{ scale }, { translateY }, { rotate: cardRotate }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToScreen(item.screen)}
          activeOpacity={0.95}
        >
          <LinearGradient
            colors={[item.gradientColors[0], item.gradientColors[1]]}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Render background circles with unique positions per card */}
            {renderCircles(index, item.gradientColors)}

            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
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
                  <Ionicons name={item.icon as any} size={24} color="white" />
                </Animated.View>
                <Text style={styles.cardTitle}>{item.title}</Text>
              </View>

              <Text style={styles.cardDescription} numberOfLines={4}>
                {item.description}
              </Text>

              <View style={styles.cardFooter}>
                <Animated.View
                  style={[
                    styles.tapPromptContainer,
                    {
                      opacity: scrollX.interpolate({
                        inputRange,
                        outputRange: [0.7, 1, 0.7],
                        extrapolate: "clamp",
                      }),
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.tapPromptLine,
                      {
                        backgroundColor: "white",
                        opacity: 0.3,
                        width: scrollX.interpolate({
                          inputRange,
                          outputRange: [15, 20, 15],
                          extrapolate: "clamp",
                        }),
                      },
                    ]}
                  />
                  <Text style={styles.tapPromptText}>tap to explore</Text>
                  <Animated.View
                    style={[
                      styles.tapPromptLine,
                      {
                        backgroundColor: "white",
                        opacity: 0.3,
                        width: scrollX.interpolate({
                          inputRange,
                          outputRange: [15, 20, 15],
                          extrapolate: "clamp",
                        }),
                      },
                    ]}
                  />
                </Animated.View>

                <View style={styles.arrowContainer}>
                  <Animated.View
                    style={[
                      styles.arrowButton,
                      {
                        transform: [{ scale: arrowScale }],
                      },
                    ]}
                  >
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </Animated.View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.featuresContainer,
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
                translateX: titleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              },
            ],
            opacity: titleAnim,
          },
        ]}
      >
        Explore Features
      </Animated.Text>

      <Animated.FlatList<FeatureCard>
        ref={flatListRef}
        data={featureCards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContainer}
        snapToInterval={CARD_WIDTH + SPACING * 2}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToAlignment="center"
        bounces={true}
        initialNumToRender={3}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  featuresContainer: {
    width: "100%",
    marginTop: 10,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    marginLeft: SPACING,
  },
  carouselContainer: {
    paddingVertical: 8,
    paddingLeft: 0,
    paddingRight: width - CARD_WIDTH - SPACING,
    alignItems: "center",
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginHorizontal: SPACING,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    height: 220,
    width: "100%",
    position: "relative",
  },
  cardGradient: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },
  backgroundCircle: {
    position: "absolute",
    borderRadius: 100,
  },
  cardContent: {
    padding: 24,
    height: "100%",
    justifyContent: "space-between",
    zIndex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  cardDescription: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 22,
    flex: 1,
    paddingVertical: 6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tapPromptContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tapPromptLine: {
    width: 20,
    height: 1,
  },
  tapPromptText: {
    fontSize: 12,
    marginHorizontal: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "500",
    color: "white",
  },
  arrowContainer: {
    alignItems: "flex-end",
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});

export default FeaturesSection;
