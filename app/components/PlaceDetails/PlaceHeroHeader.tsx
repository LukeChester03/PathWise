// components/PlaceHeroHeader.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GOOGLE_MAPS_APIKEY } from "../../constants/Map/mapConstants";
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";

interface PlaceHeroHeaderProps {
  placeDetails: Place | VisitedPlaceDetails;
  scrollY: Animated.Value;
  headerOpacity: Animated.Value;
  imageScale: Animated.Value;
  animationsReady: boolean;
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
  headerOpacity,
  imageScale,
  animationsReady,
  dynamicStyles,
  onBackPress,
  onShare,
}) => {
  // Get photo URL
  const getPhotoUrl = () => {
    if (!placeDetails) return "";

    if (
      placeDetails.photos &&
      placeDetails.photos.length > 0 &&
      placeDetails.photos[0]?.photo_reference
    ) {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${placeDetails.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`;
    }
    return `https://via.placeholder.com/800x400/f0f0f0/666666?text=${encodeURIComponent(
      placeDetails.name?.substring(0, 15) || "Place"
    )}`;
  };

  // Calculate animation values
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -50],
    extrapolate: "clamp",
  });

  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 60],
    extrapolate: "clamp",
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, 150, 250],
    outputRange: [1, 0.8, 0.6],
    extrapolate: "clamp",
  });

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [0, 70, 100],
    outputRange: [0, 0.7, 1],
    extrapolate: "clamp",
  });

  return (
    <>
      {/* Animated Hero Image with Scale and Parallax */}
      <Animated.View
        style={[
          styles.heroContainer,
          {
            height: dynamicStyles.heroHeight,
            transform: [{ scale: imageScale }, { translateY: imageTranslateY }],
            opacity: imageOpacity,
          },
        ]}
      >
        <Animated.Image
          source={{ uri: getPhotoUrl() }}
          style={[styles.heroImage, { opacity: animationsReady ? 1 : 0 }]}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0)"]}
          style={styles.headerGradient}
        />
      </Animated.View>

      {/* Floating header with back button, title and share button */}
      <Animated.View
        style={[
          styles.floatingHeader,
          {
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={onBackPress} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={dynamicStyles.iconSize.header} color="#fff" />
        </TouchableOpacity>

        <Animated.Text
          style={[styles.headerTitle, { opacity: headerTitleOpacity }]}
          numberOfLines={1}
        >
          {placeDetails.name}
        </Animated.Text>

        <TouchableOpacity style={styles.shareButton} onPress={onShare} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={dynamicStyles.iconSize.header} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    width: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    zIndex: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  backButton: {
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    width: 36,
    height: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  shareButton: {
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    width: 36,
    height: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
});

export default PlaceHeroHeader;
