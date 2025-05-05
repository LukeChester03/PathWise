import React from "react";
import { View, Text, StyleSheet, FlatList, Dimensions, Platform } from "react-native";
import { Colors, NeutralColors } from "../../constants/colours";
import PlaceCard from "./PlaceCard";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { Place } from "../../types/MapTypes";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.75;
const CARD_HEIGHT = 200;
const SPACING = 12;

interface PlacesCarouselProps {
  places?: Place[];
  onPlacePress?: (placeId: string, place: Place) => void;
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const validPlaces = Array.isArray(places)
    ? places.filter((place) => {
        if (!place) return false;

        if (!place.place_id && !place.id) return false;

        if (
          (sectionType === "visited" || sectionType === "saved") &&
          !(place.isVisited === true || (place.visitedAt !== undefined && place.visitedAt !== null))
        ) {
          return false;
        }

        if (sectionType === "nearby" && showOnlyVisited) {
          return (
            place.isVisited === true || (place.visitedAt !== undefined && place.visitedAt !== null)
          );
        }

        return true;
      })
    : [];

  const handlePlacePress = (placeId: string, place: Place) => {
    if (onPlacePress) {
      onPlacePress(placeId, place);
      return;
    }

    navigation.navigate("PlaceDetails", {
      placeId,
      place,
    });
  };

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

  const renderItem = ({ item }: { item: Place }) => {
    const safePlace: Place = {
      ...item,
      place_id: item.place_id || item.id || `place-${Math.random().toString(36).substring(2, 9)}`,
      geometry: item.geometry || {
        location: {
          lat: 0,
          lng: 0,
        },
      },
    };

    return (
      <View style={{ marginLeft: SPACING }}>
        <PlaceCard
          place={safePlace}
          onPress={handlePlacePress}
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
