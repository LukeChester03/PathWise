// components/PlaceBadges.tsx
import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colours";
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";

interface PlaceBadgesProps {
  placeDetails: Place | VisitedPlaceDetails;
  fadeAnim: Animated.Value;
  translateY: Animated.Value;
  iconSize: {
    smaller: number;
  };
}

const PlaceBadges: React.FC<PlaceBadgesProps> = ({
  placeDetails,
  fadeAnim,
  translateY,
  iconSize,
}) => {
  // Get category/type of place
  const getPlaceType = () => {
    if (
      !placeDetails ||
      !placeDetails.types ||
      !Array.isArray(placeDetails.types) ||
      placeDetails.types.length === 0
    ) {
      return null;
    }

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

    for (const type of placeDetails.types) {
      if (TYPE_MAPPING[type]) {
        return TYPE_MAPPING[type];
      }
    }

    // If no direct match found, use the first type as a fallback
    return {
      label: placeDetails.types[0].replace(/_/g, " "),
      icon: "location",
    };
  };

  const placeType = getPlaceType();

  return (
    <Animated.View
      style={[
        styles.badgesContainer,
        {
          transform: [{ translateY }],
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Place Type Badge */}
      {placeType && (
        <View style={styles.typeBadge}>
          <Ionicons name={placeType.icon} size={iconSize.smaller} color={Colors.primary} />
          <Text style={styles.typeText}>{placeType.label}</Text>
        </View>
      )}

      {/* Discovery Status Badge */}
      {"isVisited" in placeDetails && placeDetails.isVisited && (
        <View style={styles.visitedBadge}>
          <Ionicons name="checkmark-circle" size={iconSize.smaller} color={Colors.primary} />
          <Text style={styles.visitedText}>Discovered</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  typeText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
    marginLeft: 5,
  },
  visitedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  visitedText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
    marginLeft: 5,
  },
});

export default PlaceBadges;
