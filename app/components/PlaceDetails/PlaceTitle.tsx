// components/PlaceTitle.tsx
import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";

interface PlaceTitleProps {
  placeDetails: Place | VisitedPlaceDetails;
  titleOpacity: Animated.Value;
  animationsReady: boolean;
  fontSize: {
    title: number;
    small: number;
  };
  iconSize: {
    small: number;
  };
}

const PlaceTitle: React.FC<PlaceTitleProps> = ({
  placeDetails,
  titleOpacity,
  animationsReady,
  fontSize,
  iconSize,
}) => {
  return (
    <Animated.View style={[styles.titleContainer, { opacity: titleOpacity }]}>
      <Text style={[styles.placeName, { fontSize: fontSize.title }]}>{placeDetails.name}</Text>

      {placeDetails.rating !== undefined && (
        <Animated.View
          style={[
            styles.ratingContainer,
            {
              transform: [{ translateY: animationsReady ? 0 : 20 }],
              opacity: animationsReady ? 1 : 0,
            },
          ]}
        >
          <Ionicons name="star" size={iconSize.small} color="#FFD700" />
          <Text style={styles.ratingText}>{placeDetails.rating.toFixed(1)}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  placeName: {
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 4,
  },
});

export default PlaceTitle;
