import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, NeutralColors } from "../../constants/colours";
import { getPlaceCardImageUrl } from "../../utils/mapImageUtils";

const { width } = Dimensions.get("window");
const VISIBLE_NEXT_CARD = width * 0.5; // How much of the next card to show (about 1/4 of the card)
const PLACE_CARD_WIDTH = width * 0.5; // Card takes up 75% of screen width
const PLACE_CARD_HEIGHT = 200;
const SPACING = 10; // Reduced spacing between cards

const PlacesCarousel = ({ places, onPlacePress }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // For the first-time entry animation
  const entryAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Run entry animation when component mounts
    Animated.timing(entryAnimation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, []);

  // Update active index when scrolling
  useEffect(() => {
    const listener = scrollX.addListener(({ value }) => {
      const index = Math.round(value / (PLACE_CARD_WIDTH + SPACING));
      if (index !== activeIndex && index >= 0 && index < places.length) {
        setActiveIndex(index);
      }
    });

    return () => {
      scrollX.removeListener(listener);
    };
  }, [scrollX, activeIndex, places.length]);

  const renderPlaceCard = ({ item, index }) => {
    // Calculate the input range for animations
    const inputRange = [
      (index - 1) * (PLACE_CARD_WIDTH + SPACING),
      index * (PLACE_CARD_WIDTH + SPACING),
      (index + 1) * (PLACE_CARD_WIDTH + SPACING),
    ];

    // Scale animation based on scroll position
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.92, 1, 0.92],
      extrapolate: "clamp",
    });

    // Opacity animation based on scroll position
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.7, 1, 0.7],
      extrapolate: "clamp",
    });

    // Parallax effect for image
    const translateX = scrollX.interpolate({
      inputRange,
      outputRange: [20, 0, -20],
      extrapolate: "clamp",
    });

    // Entry animation calculation
    const entryTranslate = entryAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [200, 0],
    });

    const entryOpacity = entryAnimation.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 0.5, 1],
    });

    return (
      <Animated.View
        style={[
          styles.placeCardContainer,
          {
            transform: [{ scale }, { translateY: entryTranslate }],
            opacity: Animated.multiply(opacity, entryOpacity),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.placeCard}
          onPress={() => onPlacePress(item.place_id)}
          activeOpacity={0.95}
        >
          {/* Image with parallax effect */}
          <Animated.View style={styles.imageContainer}>
            <Animated.Image
              source={{ uri: getPlaceCardImageUrl(item, 600, 320) }}
              style={[
                styles.placeImage,
                {
                  transform: [{ translateX }],
                },
              ]}
            />
          </Animated.View>

          {/* Gradient overlay */}
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.8)"]}
            style={styles.cardGradient}
          />

          {/* Content area */}
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.placeName} numberOfLines={2}>
                {item.name}
              </Text>
              {item.rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            {/* Category/type badges */}
            {item.types && (
              <View style={styles.typeContainer}>
                {item.types.slice(0, 2).map((type, i) => (
                  <View key={i} style={styles.typeBadge}>
                    <Text style={styles.typeText}>{type.replace(/_/g, " ")}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={places}
        keyExtractor={(item) => item.place_id.toString()}
        renderItem={renderPlaceCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        snapToInterval={PLACE_CARD_WIDTH + SPACING}
        decelerationRate="fast"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        snapToAlignment="center"
        bounces={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  carouselContent: {
    // This properly centers the first card and shows about 1/4 of the next card
    paddingHorizontal: (width - PLACE_CARD_WIDTH - VISIBLE_NEXT_CARD) / 2,
    paddingVertical: 8,
  },
  placeCardContainer: {
    width: PLACE_CARD_WIDTH,
    height: PLACE_CARD_HEIGHT,
    marginRight: SPACING,
  },
  placeCard: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  imageContainer: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  placeImage: {
    width: "110%", // Slightly larger for parallax effect
    height: "100%",
    resizeMode: "cover",
  },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    borderRadius: 20,
  },
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  placeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    marginRight: 8,
  },
  placeInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 4,
  },
  placeVicinity: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    flex: 1,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 4,
  },
  typeContainer: {
    flexDirection: "row",
  },
  typeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  typeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
});

export default PlacesCarousel;
