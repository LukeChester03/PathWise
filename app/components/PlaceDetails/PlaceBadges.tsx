// components/PlaceBadges.tsx
import React, { useMemo } from "react";
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
  maxTags?: number; // Maximum number of type tags to display
}

interface PlaceTypeInfo {
  label: string;
  icon: string;
}

const PlaceBadges: React.FC<PlaceBadgesProps> = ({
  placeDetails,
  fadeAnim,
  translateY,
  iconSize,
  maxTags = 5, // Default to 5 tags maximum
}) => {
  // Define the mapping of place types to labels and icons
  const TYPE_MAPPING: { [key: string]: PlaceTypeInfo } = useMemo(
    () => ({
      restaurant: { label: "Restaurant", icon: "restaurant" },
      cafe: { label: "Café", icon: "cafe" },
      bar: { label: "Bar", icon: "beer" },
      food: { label: "Food", icon: "fast-food" },
      bakery: { label: "Bakery", icon: "nutrition" },
      store: { label: "Store", icon: "basket" },
      shop: { label: "Shop", icon: "cart" },
      grocery: { label: "Grocery", icon: "basket" },
      supermarket: { label: "Supermarket", icon: "cart" },
      clothing_store: { label: "Clothing", icon: "shirt" },
      museum: { label: "Museum", icon: "business" },
      art_gallery: { label: "Gallery", icon: "color-palette" },
      park: { label: "Park", icon: "leaf" },
      tourist_attraction: { label: "Attraction", icon: "camera" },
      point_of_interest: { label: "Point of Interest", icon: "compass" },
      hotel: { label: "Hotel", icon: "bed" },
      lodging: { label: "Lodging", icon: "bed" },
      movie_theater: { label: "Cinema", icon: "film" },
      night_club: { label: "Nightclub", icon: "wine" },
      zoo: { label: "Zoo", icon: "paw" },
      aquarium: { label: "Aquarium", icon: "water" },
      amusement_park: { label: "Amusement Park", icon: "sparkles" },
      spa: { label: "Spa", icon: "flower" },
      gym: { label: "Gym", icon: "fitness" },
      health: { label: "Health", icon: "fitness" },
      library: { label: "Library", icon: "book" },
      church: { label: "Church", icon: "business" },
      mosque: { label: "Mosque", icon: "business" },
      hindu_temple: { label: "Temple", icon: "business" },
      place_of_worship: { label: "Place of Worship", icon: "business" },
      historic: { label: "Historic", icon: "time" },
      landmark: { label: "Landmark", icon: "location" },
      natural_feature: { label: "Natural Feature", icon: "leaf" },
    }),
    []
  );

  // Get up to maxTags place type badges
  const getPlaceTypes = useMemo(() => {
    if (
      !placeDetails ||
      !placeDetails.types ||
      !Array.isArray(placeDetails.types) ||
      placeDetails.types.length === 0
    ) {
      return [];
    }

    const foundTypes: PlaceTypeInfo[] = [];

    // First pass: add types that have a direct mapping
    for (const type of placeDetails.types) {
      if (TYPE_MAPPING[type] && foundTypes.length < maxTags) {
        // Check if this type is already in the list (avoid duplicates like "food" and "restaurant")
        const isDuplicate = foundTypes.some((item) => item.label === TYPE_MAPPING[type].label);

        if (!isDuplicate) {
          foundTypes.push(TYPE_MAPPING[type]);
        }
      }

      if (foundTypes.length >= maxTags) break;
    }

    // Second pass: if we haven't reached maxTags, add custom types for anything not mapped
    if (foundTypes.length < maxTags) {
      for (const type of placeDetails.types) {
        if (!TYPE_MAPPING[type] && foundTypes.length < maxTags) {
          // Format the type name (remove underscores, capitalize words)
          const formattedLabel = type
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

          const customType = {
            label: formattedLabel,
            icon: "location",
          };

          foundTypes.push(customType);
        }

        if (foundTypes.length >= maxTags) break;
      }
    }

    return foundTypes;
  }, [placeDetails, TYPE_MAPPING, maxTags]);

  // Check if the place is visited (either by isVisited flag or by having visitedAt property)
  const isPlaceVisited = placeDetails.isVisited || "visitedAt" in placeDetails;

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
      {/* Place Type Badges */}
      {getPlaceTypes.map((placeType, index) => (
        <View key={`type-${index}`} style={styles.typeBadge}>
          <Ionicons name={placeType.icon as any} size={iconSize.smaller} color={Colors.primary} />
          <Text style={styles.typeText}>{placeType.label}</Text>
        </View>
      ))}

      {/* Discovery Status Badge */}
      {isPlaceVisited && (
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
