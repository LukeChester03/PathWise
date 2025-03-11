// components/Places/PlacesCarousel.tsx
import React from "react";
import { View, Text, StyleSheet, FlatList, Dimensions, Platform } from "react-native";
import { Colors, NeutralColors } from "../../constants/colours";
import PlaceCard, { CarouselCardProps } from "./CarouselCard";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.75;
const CARD_HEIGHT = 200;
const SPACING = 12;

interface PlacesCarouselProps {
  places?: CarouselCardProps[];
  onPlacePress: (placeId: string, place: CarouselCardProps) => void;
  showOnlyVisited?: boolean;
  sectionType?: "visited" | "nearby" | "saved";
  cardWidth?: number;
  cardHeight?: number;
}

const PlacesCarousel: React.FC<PlacesCarouselProps> = ({
  places = [],
  onPlacePress,
  showOnlyVisited = false,
  sectionType = "nearby",
  cardWidth = CARD_WIDTH,
  cardHeight = CARD_HEIGHT,
}) => {
  // Filter places based on criteria
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
      <View style={[styles.emptyContainer, { width: cardWidth, height: cardHeight }]}>
        <Text style={styles.emptyText}>
          {sectionType === "visited" || sectionType === "saved"
            ? "No visited places yet"
            : "No places available"}
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: CarouselCardProps }) => {
    return (
      <View style={{ marginLeft: SPACING }}>
        <PlaceCard
          place={item}
          onPress={onPlacePress}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
        />
      </View>
    );
  };

  return (
    <FlatList
      data={validPlaces}
      keyExtractor={(item) =>
        item && (item.place_id || item.id)
          ? (item.place_id || item.id).toString()
          : `place-${Math.random().toString(36).substring(2, 9)}`
      }
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carouselContainer}
      snapToInterval={cardWidth + SPACING}
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
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 20,
    marginLeft: SPACING,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyText: {
    fontSize: 16,
    color: NeutralColors.gray500,
    textAlign: "center",
  },
});

export default PlacesCarousel;
