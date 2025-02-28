import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, NeutralColors } from "../../constants/colours";

const { width } = Dimensions.get("window");
const PLACE_CARD_WIDTH = width * 0.7;
const SPACING = 12;

const PlacesCarousel = ({ places, onPlacePress }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const getPhotoUrl = (place) => {
    const photoRef = place.photos && place.photos[0]?.photo_reference;
    return photoRef
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
      : "https://via.placeholder.com/400?text=No+Image";
  };

  const renderPlaceCard = ({ item, index }) => {
    return (
      <TouchableOpacity
        style={styles.placeCard}
        onPress={() => onPlacePress(item.place_id)}
        activeOpacity={0.9}
      >
        <Image source={{ uri: getPhotoUrl(item) }} style={styles.placeImage} />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.cardGradient} />
        <View style={styles.cardContent}>
          <Text style={styles.placeName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.placeInfo}>
            <Ionicons name="location" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.placeVicinity} numberOfLines={1}>
              {item.vicinity || "Unknown location"}
            </Text>
          </View>
          {item.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
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
      snapToAlignment="start"
      bounces={true}
    />
  );
};

const styles = StyleSheet.create({
  carouselContent: {
    paddingHorizontal: 16,
  },
  placeCard: {
    width: PLACE_CARD_WIDTH,
    height: 180,
    marginRight: SPACING,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: NeutralColors.gray400,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  placeImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  placeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  placeInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  placeVicinity: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  ratingText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 4,
  },
});

export default PlacesCarousel;
