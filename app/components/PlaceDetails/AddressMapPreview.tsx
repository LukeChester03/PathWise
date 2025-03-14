import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colours";

// Import types but maintain compatibility with existing code
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";

interface AddressMapPreviewProps {
  placeDetails: Place | VisitedPlaceDetails;
  fontSize: {
    small: number;
    body: number;
    subtitle: number;
    title: number;
    large: number;
  };
}

const AddressMapPreview: React.FC<AddressMapPreviewProps> = ({ placeDetails, fontSize }) => {
  const { geometry, vicinity, formatted_address } = placeDetails;
  const address = formatted_address || vicinity || "Address not available";

  // Generate a static map URL - in a real app you'd use your API key
  // This is just a placeholder - you should implement a proper map view
  const getStaticMapUrl = () => {
    const { lat, lng } = geometry.location;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=YOUR_API_KEY`;
  };

  const openInMaps = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { lat, lng } = geometry.location;
    const label = placeDetails.name;
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Ionicons name="location" size={20} color={Colors.primary} style={styles.headerIcon} />
        <Text style={[styles.title, { fontSize: fontSize.subtitle }]}>Address</Text>
      </View>

      <View style={styles.addressContainer}>
        <Text style={[styles.addressText, { fontSize: fontSize.body }]}>{address}</Text>
      </View>

      <View style={styles.mapPreviewContainer}>
        <Image source={{ uri: getStaticMapUrl() }} style={styles.mapImage} />

        <TouchableOpacity style={styles.directionsButton} onPress={openInMaps}>
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={styles.directionsText}>Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerIcon: {
    marginRight: 8,
  },
  title: {
    fontWeight: "600",
    color: "#333",
  },
  addressContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  addressText: {
    color: "#444",
    lineHeight: 22,
  },
  mapPreviewContainer: {
    height: 160,
    width: "100%",
    position: "relative",
  },
  mapImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e1e1e1", // Fallback color
  },
  directionsButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  directionsText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 4,
  },
});

export default AddressMapPreview;
