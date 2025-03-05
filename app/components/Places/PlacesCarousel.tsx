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
  isVisited?: boolean;
  [key: string]: any; // Allow other properties
}

interface PlacesCarouselProps {
  places?: PlaceCardProps[];
  onPlacePress: (placeId: string, place: PlaceCardProps) => void;
  showOnlyVisited?: boolean; // New prop to control filtering
  sectionType?: "visited" | "nearby" | "saved"; // Section type to adjust behavior
}

const PlacesCarousel: React.FC<PlacesCarouselProps> = ({
  places = [],
  onPlacePress,
  showOnlyVisited = false,
  sectionType = "nearby",
}) => {
  // Filter based on valid ID and visited status if required
  const validPlaces = Array.isArray(places)
    ? places.filter((place) => {
        // Always ensure we have a valid ID
        if (!place || (!place.place_id && !place.id)) return false;

        // For visited/saved sections, strictly enforce visit status
        if (
          (sectionType === "visited" || sectionType === "saved") &&
          !(place.isVisited === true || place.visitedAt || place.visitDate)
        ) {
          return false;
        }

        // For nearby locations with showOnlyVisited, filter by visit status
        if (sectionType === "nearby" && showOnlyVisited) {
          return place.isVisited === true || place.visitedAt || place.visitDate;
        }

        // Otherwise include the place
        return true;
      })
    : [];

  if (validPlaces.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {sectionType === "visited" || sectionType === "saved"
            ? "No visited places yet"
            : "No places available"}
        </Text>
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

    // Check if the place has been visited (using multiple possible indicators)
    const isVisited = item.isVisited === true || !!item.visitedAt || !!item.visitDate;

    // Create safe date object or fallback
    let visitDate: Date | null = null;
    if (isVisited) {
      if (item.visitedAt) {
        visitDate = item.visitedAt instanceof Date ? item.visitedAt : new Date(item.visitedAt);
      } else if (item.visitDate) {
        visitDate = item.visitDate instanceof Date ? item.visitDate : new Date(item.visitDate);
      }
    }

    // Check if date is valid
    if (visitDate && isNaN(visitDate.getTime())) {
      visitDate = null;
    }

    return (
      <TouchableOpacity
        style={[styles.card, isVisited && styles.visitedCard]}
        activeOpacity={0.9}
        onPress={() => onPlacePress(placeId, item)}
      >
        <Image source={{ uri: photo }} style={styles.cardImage} />

        <LinearGradient colors={["transparent", "rgba(0,0,0,0.9)"]} style={styles.cardGradient} />

        {/* Show "Visited" indicator in the top left for better visibility */}
        {isVisited && (
          <View style={styles.visitedIndicator}>
            <Ionicons name="checkmark-circle" size={16} color="#4CD964" />
          </View>
        )}

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

          {isVisited && visitDate && (
            <View style={styles.visitedBadge}>
              <Ionicons name="time-outline" size={12} color="#4CD964" style={{ marginRight: 2 }} />
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
  visitedCard: {
    // Add subtle visual indicator for visited places
    borderWidth: 2,
    borderColor: Colors.primary + "40", // Primary color with transparency
  },
  visitedIndicator: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 4,
    zIndex: 10,
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
