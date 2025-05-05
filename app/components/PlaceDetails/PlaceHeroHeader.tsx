import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GOOGLE_MAPS_APIKEY } from "../../constants/Map/mapConstants";
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";

interface PlaceHeroHeaderProps {
  placeDetails: Place | VisitedPlaceDetails;
  scrollY: Animated.Value;
  dynamicStyles: {
    heroHeight: number;
    iconSize: {
      header: number;
    };
  };
  onBackPress: () => void;
  onShare: () => void;
}

const PlaceHeroHeader: React.FC<PlaceHeroHeaderProps> = ({
  placeDetails,
  scrollY,
  dynamicStyles,
  onBackPress,
  onShare,
}) => {
  const photoUrl = useMemo(() => {
    if (!placeDetails) return "";

    if (
      placeDetails.photos &&
      placeDetails.photos.length > 0 &&
      placeDetails.photos[0]?.photo_reference
    ) {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${placeDetails.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`;
    }
    return `https://via.placeholder.com/800x400/f5f5f5/999999?text=${encodeURIComponent(
      placeDetails.name?.substring(0, 15) || "Place"
    )}`;
  }, [placeDetails]);

  return (
    <>
      <View style={[styles.heroContainer, { height: dynamicStyles.heroHeight }]}>
        <Image
          source={{ uri: photoUrl }}
          style={styles.heroImage}
          resizeMode="cover"
          fadeDuration={300}
          progressiveRenderingEnabled={true}
        />

        <LinearGradient
          colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.4)"]}
          locations={[0, 0.3, 0.7, 1]}
          style={styles.fullGradient}
          shouldRasterizeIOS={true}
        />
      </View>

      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onBackPress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={dynamicStyles.iconSize.header} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={onShare}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="share-outline" size={dynamicStyles.iconSize.header} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    width: "100%",
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
  },
  fullGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === "ios" ? StatusBar.currentHeight || 40 : 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 50,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
});

// to stop re renders
export default React.memo(PlaceHeroHeader);
