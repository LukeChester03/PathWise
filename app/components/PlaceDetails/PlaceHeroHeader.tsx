// components/PlaceHeroHeader.tsx
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
  // Get photo URL - memoize to prevent recalculation on re-renders
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
      {/* Hero Image Container */}
      <View style={[styles.heroContainer, { height: dynamicStyles.heroHeight }]}>
        <Image
          source={{ uri: photoUrl }}
          style={styles.heroImage}
          resizeMode="cover"
          // These properties improve image loading performance
          fadeDuration={300}
          progressiveRenderingEnabled={true}
        />

        {/* Darker gradient overlay for better text readability */}
        <LinearGradient
          colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.4)"]}
          locations={[0, 0.3, 0.7, 1]}
          style={styles.fullGradient}
          // Added for performance
          shouldRasterizeIOS={true}
        />
      </View>

      {/* Header navigation buttons */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onBackPress}
            activeOpacity={0.7}
            // Improved touch handling
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={dynamicStyles.iconSize.header} color="#fff" />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onShare}
            activeOpacity={0.7}
            // Improved touch handling
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
    overflow: "hidden", // Prevent image from overflowing during animations
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

export default React.memo(PlaceHeroHeader); // Use memo to prevent unnecessary re-renders
