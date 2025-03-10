// components/Places/CarouselCard.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, NeutralColors } from "../../constants/colours";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.75;
const CARD_HEIGHT = 200;

export interface CarouselCardProps {
  place_id?: string;
  id?: string;
  name?: string;
  vicinity?: string;
  formatted_address?: string;
  photos?: Array<{ photo_reference?: string }>;
  rating?: number;
  visitedAt?: string | Date;
  visitDate?: string | Date;
  isVisited?: boolean;
  types?: string[];
  [key: string]: any;
}

interface PlaceCardComponentProps {
  place: CarouselCardProps;
  onPress: (placeId: string, place: CarouselCardProps) => void;
  cardWidth?: number;
  cardHeight?: number;
}

// Map of place types to user-friendly tags with appropriate icons
const TYPE_MAPPING: { [key: string]: { label: string; icon: string } } = {
  restaurant: { label: "Restaurant", icon: "restaurant" },
  cafe: { label: "Café", icon: "cafe" },
  bar: { label: "Bar", icon: "beer" },
  food: { label: "Food", icon: "fast-food" },
  store: { label: "Store", icon: "basket" },
  museum: { label: "Museum", icon: "business" },
  art_gallery: { label: "Gallery", icon: "color-palette" },
  park: { label: "Park", icon: "leaf" },
  tourist_attraction: { label: "Attraction", icon: "camera" },
  hotel: { label: "Hotel", icon: "bed" },
  movie_theater: { label: "Cinema", icon: "film" },
  night_club: { label: "Nightclub", icon: "wine" },
  zoo: { label: "Zoo", icon: "paw" },
};

// Priority order for tags
const TYPE_PRIORITY = [
  "restaurant",
  "cafe",
  "bar",
  "food",
  "museum",
  "art_gallery",
  "park",
  "tourist_attraction",
  "hotel",
  "movie_theater",
  "night_club",
  "zoo",
];

const CarouselCard: React.FC<PlaceCardComponentProps> = ({
  place,
  onPress,
  cardWidth = CARD_WIDTH,
  cardHeight = CARD_HEIGHT,
}) => {
  // Function to get relevant tags from place types
  const getPlaceTags = (place: CarouselCardProps, maxTags: number = 1) => {
    if (!place.types || !Array.isArray(place.types) || place.types.length === 0) {
      return [];
    }

    const sortedTypes = [...place.types].sort((a, b) => {
      const indexA = TYPE_PRIORITY.indexOf(a);
      const indexB = TYPE_PRIORITY.indexOf(b);

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });

    const relevantTags = [];
    for (const type of sortedTypes) {
      if (TYPE_MAPPING[type]) {
        relevantTags.push(TYPE_MAPPING[type]);
        if (relevantTags.length >= maxTags) break;
      }
    }

    return relevantTags;
  };

  // Helper to format visit date in elegant way
  const formatVisitDate = (date: Date): string => {
    try {
      if (!date || isNaN(date.getTime())) {
        return "";
      }

      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks}w ago`;
      }

      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  // Extract place data
  const placeId =
    place.place_id || place.id || `place-${Math.random().toString(36).substring(2, 9)}`;
  const name = place.name || "Unnamed Place";
  const rating = typeof place.rating === "number" ? place.rating : null;
  const isVisited = place.isVisited === true || !!place.visitedAt || !!place.visitDate;

  // Handle visit date
  let visitDate: Date | null = null;
  if (isVisited) {
    if (place.visitedAt) {
      visitDate = place.visitedAt instanceof Date ? place.visitedAt : new Date(place.visitedAt);
    } else if (place.visitDate) {
      visitDate = place.visitDate instanceof Date ? place.visitDate : new Date(place.visitDate);
    }
  }

  if (visitDate && isNaN(visitDate.getTime())) {
    visitDate = null;
  }

  // Get photo URL
  const photo =
    place.photos && place.photos.length > 0 && place.photos[0]?.photo_reference
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
      : `https://via.placeholder.com/400x200/f0f0f0/666666?text=${encodeURIComponent(
          name.substring(0, 15)
        )}`;

  const placeTags = getPlaceTags(place);
  const formattedDate = visitDate ? formatVisitDate(visitDate) : "";

  return (
    <TouchableOpacity
      style={[styles.cardWrapper, { width: cardWidth, height: cardHeight }]}
      activeOpacity={0.92}
      onPress={() => onPress(placeId, place)}
    >
      <View style={[styles.card, isVisited && styles.visitedCard]}>
        {/* Image Container */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: photo }} style={styles.cardImage} resizeMode="cover" />

          {/* Enhanced Gradient for Better Text Readability */}
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.8)"]}
            locations={[0.4, 0.7, 0.9]}
            style={styles.cardGradient}
          />

          {/* Ultra-Minimal Visited Indicator */}
          {isVisited && <View style={styles.visitedIndicator} />}
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          {/* Full-width Title */}
          <Text style={styles.placeName} numberOfLines={1}>
            {name}
          </Text>

          {/* Tags and Metadata Row */}
          <View style={styles.metadataRow}>
            {/* Left Side - Type Tag and Rating */}
            <View style={styles.leftMetadata}>
              {/* Type Tag */}
              {placeTags.length > 0 && (
                <View style={styles.tagPill}>
                  <Ionicons name={placeTags[0].icon} size={12} color="#fff" />
                  <Text style={styles.tagText}>{placeTags[0].label}</Text>
                </View>
              )}

              {/* Rating */}
              {rating !== null && (
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={11} color="#FFD700" />
                  <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            {/* Right Side - Visit Date Badge */}
            {isVisited && formattedDate && (
              <View style={styles.visitedBadge}>
                <Text style={styles.visitedText}>{formattedDate}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    overflow: "visible",
  },
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.07,
        shadowRadius: 20,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  visitedCard: {
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  imageContainer: {
    width: "100%",
    height: "100%",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "70%",
  },
  visitedIndicator: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    opacity: 0.9,
  },
  contentContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  placeName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftMetadata: {
    flexDirection: "row",
    alignItems: "center",
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 100,
    marginRight: 8,
  },
  tagText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "500",
    marginLeft: 4,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 100,
  },
  ratingText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 3,
  },
  visitedBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  visitedText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
  },
});

export default CarouselCard;
