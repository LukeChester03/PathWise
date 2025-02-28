// components/Home/FeaturesSection.js
import React, { useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const SPACING = 12;

const FeaturesSection = ({ navigateToScreen }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const featureCards = [
    {
      id: 1,
      title: "Discover",
      description: "Explore new locations and get guided directions to exciting places around you.",
      icon: "compass",
      screen: "Discover",
      gradientColors: ["#4A90E2", "#5DA9FF"],
    },
    {
      id: 2,
      title: "Learn",
      description:
        "Get AI-powered information tailored to each location, like having a personal tour guide.",
      icon: "sparkles",
      screen: "Learn",
      gradientColors: ["#50C878", "#63E08C"],
    },
    {
      id: 3,
      title: "Places",
      description: "View and collect places you've visited to build your personal travel journal.",
      icon: "location",
      screen: "Explore", // Changed from Places to match your navigation
      gradientColors: ["#FF7043", "#FF8A65"],
    },
  ];

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: false,
  });

  // Function to render decorative circles with different positions for each card
  const renderCircles = (index, colors) => {
    // Different circle arrangements based on card index
    if (index === 0) {
      // Discover card circles
      return (
        <>
          <View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 150,
                height: 150,
                top: -60,
                right: -30,
                opacity: 0.05,
              },
            ]}
          />
          <View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[1],
                width: 70,
                height: 70,
                bottom: -20,
                left: 30,
                opacity: 0.04,
              },
            ]}
          />
          <View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 40,
                height: 40,
                top: 30,
                left: 40,
                opacity: 0.06,
              },
            ]}
          />
        </>
      );
    } else if (index === 1) {
      // Learn card circles - adjusted positions to stay within bounds
      return (
        <>
          <View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 100,
                height: 100,
                top: 20,
                right: -40,
                opacity: 0.04,
              },
            ]}
          />
          <View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[1],
                width: 120,
                height: 120,
                bottom: -35, // Reduced from -50 to prevent extending card
                right: 50,
                opacity: 0.03,
              },
            ]}
          />
          <View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 60,
                height: 60,
                top: -20,
                left: 20,
                opacity: 0.05,
              },
            ]}
          />
        </>
      );
    } else {
      // Places card circles
      return (
        <>
          <View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 80,
                height: 80,
                top: -30,
                left: -20,
                opacity: 0.05,
              },
            ]}
          />
          <View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[1],
                width: 130,
                height: 130,
                bottom: -30,
                right: -40,
                opacity: 0.04,
              },
            ]}
          />
          <View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 50,
                height: 50,
                top: 80,
                left: 60,
                opacity: 0.06,
              },
            ]}
          />
        </>
      );
    }
  };

  const renderCard = ({ item, index }) => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + SPACING * 2),
      index * (CARD_WIDTH + SPACING * 2),
      (index + 1) * (CARD_WIDTH + SPACING * 2),
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.95, 1, 0.95],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [{ scale }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToScreen(item.screen)}
          activeOpacity={0.95}
        >
          {/* Render background circles with unique positions per card */}
          {renderCircles(index, item.gradientColors)}

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={item.gradientColors}
                style={styles.iconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={item.icon} size={24} color="white" />
              </LinearGradient>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>

            <Text style={styles.cardDescription} numberOfLines={3}>
              {item.description}
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.tapPromptContainer}>
                <View
                  style={[
                    styles.tapPromptLine,
                    { backgroundColor: item.gradientColors[0], opacity: 0.2 },
                  ]}
                />
                <Text style={[styles.tapPromptText, { color: item.gradientColors[0] }]}>
                  tap to explore
                </Text>
                <View
                  style={[
                    styles.tapPromptLine,
                    { backgroundColor: item.gradientColors[0], opacity: 0.2 },
                  ]}
                />
              </View>

              <View style={styles.arrowContainer}>
                <LinearGradient
                  colors={item.gradientColors}
                  style={styles.arrowButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.featuresContainer}>
      <Text style={styles.sectionTitle}>Explore Features</Text>

      <Animated.FlatList
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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  featuresContainer: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  carouselContainer: {
    paddingLeft: SPACING,
    paddingRight: width - CARD_WIDTH - SPACING,
    alignItems: "center",
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginHorizontal: SPACING,
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    height: 220, // Fixed height instead of minHeight
    width: "100%",
    position: "relative",
  },
  backgroundCircle: {
    position: "absolute",
    borderRadius: 100,
  },
  cardContent: {
    padding: 24,
    height: "100%", // Use height instead of minHeight
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
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.3,
  },
  cardDescription: {
    fontSize: 15,
    color: "#666",
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
  },
});

export default FeaturesSection;
