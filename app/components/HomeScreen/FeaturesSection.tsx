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
      screen: "Places",
      gradientColors: ["#FF7043", "#FF8A65"],
    },
  ];

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: false,
  });

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
          <View style={styles.cardContent}>
            <View style={styles.cardTop}>
              <LinearGradient
                colors={item.gradientColors}
                style={styles.iconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={item.icon} size={28} color="white" />
              </LinearGradient>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>

            <Text style={styles.cardDescription}>{item.description}</Text>

            <LinearGradient
              colors={item.gradientColors}
              style={styles.cardButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.buttonText}>{item.title}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.buttonIcon} />
            </LinearGradient>
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
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minHeight: 200,
  },
  cardContent: {
    padding: 24,
    justifyContent: "space-between",
    minHeight: 200,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
  },
  cardDescription: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    marginBottom: 24,
  },
  cardButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});

export default FeaturesSection;
