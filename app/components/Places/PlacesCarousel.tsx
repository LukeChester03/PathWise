// components/Places/PlacesCarousel.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, NeutralColors } from "../../constants/colours";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.75;
const CARD_HEIGHT = 200;
const SPACING = 12;

interface PlaceCardProps {
  place_id?: string;
  id?: string;
  name?: string;
  vicinity?: string;
  formatted_address?: string;
  photos?: Array<{ photo_reference?: string }>;
  rating?: number;
  visitedAt?: string | Date;
  visitDate?: string | Date;
  [key: string]: any; // Allow other properties
}

interface PlacesCarouselProps {
  places?: PlaceCardProps[];
  onPlacePress: (placeId: string, place: PlaceCardProps) => void;
}

const PlacesCarousel: React.FC<PlacesCarouselProps> = ({ places = [], onPlacePress }) => {
  // Ensure we have valid places to render
  const validPlaces = Array.isArray(places)
    ? places.filter((place) => place && (place.place_id || place.id))
    : [];

  if (validPlaces.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No places available</Text>
      </View>
    );
  }

  const renderPlaceCard = ({ item }: { item: PlaceCardProps }) => {
    // Guard against null/undefined items
    if (!item) return null;

    // Ensure we have a valid ID
    const placeId =
      item.place_id || item.id || `place-${Math.random().toString(36).substring(2, 9)}`;

    // Ensure name is valid
    const name = item.name || "Unnamed Place";

    // Handle address/vicinity
    const address = item.vicinity || item.formatted_address || "No address available";

    // Handle photo - first try to get a valid photo reference, fallback to placeholder
    const photo =
      item.photos && item.photos.length > 0 && item.photos[0]?.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${item.photos[0].photo_reference}&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
        : `https://via.placeholder.com/400x200/f0f0f0/666666?text=${encodeURIComponent(
            name.substring(0, 15)
          )}`;

    // Handle rating safely
    const rating = typeof item.rating === "number" ? item.rating : null;

    // Create safe date object or fallback
    let visitDate: Date | null = null;
    if (item.visitedAt) {
      visitDate = item.visitedAt instanceof Date ? item.visitedAt : new Date(item.visitedAt);
    } else if (item.visitDate) {
      visitDate = item.visitDate instanceof Date ? item.visitDate : new Date(item.visitDate);
    }

    // Check if date is valid
    if (visitDate && isNaN(visitDate.getTime())) {
      visitDate = null;
    }

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => onPlacePress(placeId, item)}
      >
        <Image source={{ uri: photo }} style={styles.cardImage} />

        <LinearGradient colors={["transparent", "rgba(0,0,0,0.9)"]} style={styles.cardGradient} />

        {rating !== null && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#FFD700" style={{ marginRight: 2 }} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {name}
          </Text>

          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {address}
          </Text>

          {visitDate && (
            <View style={styles.visitedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={12}
                color="#4CD964"
                style={{ marginRight: 2 }}
              />
              <Text style={styles.visitedText}>Visited {formatVisitDate(visitDate)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Helper to format visit date
  const formatVisitDate = (date: Date): string => {
    try {
      if (!date || isNaN(date.getTime())) {
        return "";
      }

      const now = new Date();
      // Calculate difference in milliseconds
      const diffTime = Math.abs(now.getTime() - date.getTime());
      // Convert to days
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
      }

      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  return (
    <FlatList
      data={validPlaces}
      keyExtractor={(item) =>
        item && (item.place_id || item.id)
          ? (item.place_id || item.id).toString()
          : `place-${Math.random().toString(36).substring(2, 9)}`
      }
      renderItem={renderPlaceCard}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carouselContainer}
      snapToInterval={CARD_WIDTH + SPACING}
      decelerationRate="fast"
      snapToAlignment="center"
    />
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    paddingVertical: 8,
    paddingRight: SPACING,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginLeft: SPACING,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  ratingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  visitedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  visitedText: {
    color: "#fff",
    fontSize: 12,
  },
  emptyContainer: {
    height: CARD_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: NeutralColors.gray500,
  },
});

export default PlacesCarousel;
