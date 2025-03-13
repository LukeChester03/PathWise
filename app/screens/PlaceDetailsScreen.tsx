// screens/PlaceDetailsScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Share,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, NeutralColors } from "../constants/colours";
import { Place, VisitedPlaceDetails } from "../types/MapTypes";
import { RootStackParamList } from "../navigation/types";
import { getVisitedPlaceDetails } from "../handlers/Map/visitedPlacesHandlers";
import { GOOGLE_MAPS_APIKEY } from "../constants/Map/mapConstants";

// Create the navigation and route types
type PlaceDetailsRouteProp = RouteProp<RootStackParamList, "PlaceDetails">;
type PlaceDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, "PlaceDetails">;

// Define a type for the editorial summary to fix the overview error
interface EditorialSummary {
  overview?: string;
  language?: string;
}

// Extend the Place type to include editorial_summary with the correct type
interface ExtendedPlace extends Place {
  editorial_summary?: EditorialSummary;
}

// And do the same for VisitedPlaceDetails
interface ExtendedVisitedPlaceDetails extends VisitedPlaceDetails {
  editorial_summary?: EditorialSummary;
}

const PlaceDetailsScreen: React.FC = () => {
  const navigation = useNavigation<PlaceDetailsNavigationProp>();
  const route = useRoute<PlaceDetailsRouteProp>();
  const { placeId, place } = route.params;

  const [loading, setLoading] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<
    ExtendedPlace | ExtendedVisitedPlaceDetails | null
  >(null);

  useEffect(() => {
    // Set initial place details from navigation params
    if (place) {
      setPlaceDetails(place as ExtendedPlace | ExtendedVisitedPlaceDetails);
    }

    // Fetch additional details if needed
    const fetchDetails = async () => {
      if (placeId) {
        setLoading(true);
        try {
          // Try to get the place from visited places database
          const visitedDetails = await getVisitedPlaceDetails(placeId);

          if (visitedDetails) {
            setPlaceDetails({
              ...place, // Merge with the original place data
              ...visitedDetails, // Override with visited details
            } as ExtendedVisitedPlaceDetails);
          } else if (!place) {
            // If we don't have place data and couldn't find it in visited places,
            // we could fetch it from an API here
            // For now, just set a placeholder
            setPlaceDetails({
              place_id: placeId,
              name: "Loading place...",
              geometry: {
                location: {
                  lat: 0,
                  lng: 0,
                },
              },
            } as ExtendedPlace);
          }
        } catch (error) {
          console.error("Error fetching place details:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchDetails();
  }, [placeId, place]);

  // Handle back button press
  const handleBackPress = () => {
    navigation.goBack();
  };

  // Handle share button press
  const handleShare = async () => {
    if (placeDetails) {
      try {
        const shareMsg = `Check out ${placeDetails.name} I discovered!`;
        const shareUrl =
          placeDetails.url ||
          `https://maps.google.com/?q=${placeDetails.geometry.location.lat},${placeDetails.geometry.location.lng}`;

        await Share.share({
          message: Platform.OS === "ios" ? shareMsg : `${shareMsg} ${shareUrl}`,
          url: shareUrl, // iOS only
        });
      } catch (error) {
        console.error("Error sharing place:", error);
      }
    }
  };

  // Handle navigation to the place
  const handleNavigateToPlace = () => {
    if (placeDetails) {
      // Navigate back to the map screen with the place to navigate to
      navigation.navigate(
        "Discover" as any,
        {
          navigateToPlace: placeDetails,
        } as any
      );
    }
  };

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

  // Format the address for display
  const getAddress = () => {
    if (!placeDetails) return "No address available";
    return placeDetails.formatted_address || placeDetails.vicinity || "No address available";
  };

  // Format the visit date in a readable way
  const formatVisitDate = () => {
    if (!placeDetails) return null;

    if ("visitedAt" in placeDetails && placeDetails.visitedAt) {
      const date = new Date(placeDetails.visitedAt);
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return null;
  };

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
  const visitDate = formatVisitDate();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading place details...</Text>
      </View>
    );
  }

  if (!placeDetails) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.primary} />
        <Text style={styles.errorText}>Could not load place details</Text>
        <TouchableOpacity style={styles.backButtonFallback} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero Image with Gradient Overlay */}
      <View style={styles.heroContainer}>
        <Image source={{ uri: getPhotoUrl() }} style={styles.heroImage} />
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0)"]}
          style={styles.headerGradient}
        />

        {/* Back Button and Share Button */}
        <SafeAreaView style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.contentContainer} contentContainerStyle={styles.scrollContent}>
        {/* Place Name and Rating */}
        <View style={styles.titleContainer}>
          <Text style={styles.placeName}>{placeDetails.name}</Text>

          {placeDetails.rating !== undefined && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.ratingText}>{placeDetails.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Badges Row */}
        <View style={styles.badgesContainer}>
          {/* Place Type Badge */}
          {placeType && (
            <View style={styles.typeBadge}>
              <Ionicons name={placeType.icon} size={16} color={Colors.primary} />
              <Text style={styles.typeText}>{placeType.label}</Text>
            </View>
          )}

          {/* Discovery Status Badge */}
          {"isVisited" in placeDetails && placeDetails.isVisited && (
            <View style={styles.visitedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={styles.visitedText}>Discovered</Text>
            </View>
          )}
        </View>

        {/* Address */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.addressContainer}>
            <Ionicons name="location" size={18} color={Colors.primary} style={styles.infoIcon} />
            <Text style={styles.addressText}>{getAddress()}</Text>
          </View>
        </View>

        {/* Visit Info (if place was visited) */}
        {visitDate && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Discovery Details</Text>
            <View style={styles.visitContainer}>
              <Ionicons name="calendar" size={18} color={Colors.primary} style={styles.infoIcon} />
              <Text style={styles.visitText}>Discovered on {visitDate}</Text>
            </View>
          </View>
        )}

        {/* Description/Overview Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.descriptionText}>
            {placeDetails.description ||
              (placeDetails.editorial_summary && placeDetails.editorial_summary.overview) ||
              `${
                placeDetails.name
              } is located at ${getAddress()}. Explore this location and discover its unique features.`}
          </Text>
        </View>

        {/* Contact Information */}
        {("formatted_phone_number" in placeDetails && placeDetails.formatted_phone_number) ||
        ("website" in placeDetails && placeDetails.website) ? (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Contact</Text>

            {"formatted_phone_number" in placeDetails && placeDetails.formatted_phone_number && (
              <View style={styles.contactContainer}>
                <Ionicons name="call" size={18} color={Colors.primary} style={styles.infoIcon} />
                <Text style={styles.contactText}>{placeDetails.formatted_phone_number}</Text>
              </View>
            )}

            {"website" in placeDetails && placeDetails.website && (
              <View style={styles.contactContainer}>
                <Ionicons name="globe" size={18} color={Colors.primary} style={styles.infoIcon} />
                <Text style={styles.contactText} numberOfLines={1}>
                  {placeDetails.website}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Opening Hours */}
        {"opening_hours" in placeDetails && placeDetails.opening_hours?.weekday_text && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Opening Hours</Text>
            {placeDetails.opening_hours.weekday_text.map((day, index) => (
              <Text key={index} style={styles.hoursText}>
                {day}
              </Text>
            ))}
          </View>
        )}

        {/* Navigation Button */}
        <TouchableOpacity style={styles.navigateButton} onPress={handleNavigateToPlace}>
          <Ionicons name="navigate" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Navigate Here</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  backButtonFallback: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  heroContainer: {
    height: 250,
    width: "100%",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  placeName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    flex: 1,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginLeft: 4,
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  typeText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
    marginLeft: 6,
  },
  visitedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  visitedText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
    marginLeft: 6,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  addressText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  visitContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  visitText: {
    fontSize: 16,
    color: "#333",
  },
  contactContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contactText: {
    fontSize: 16,
    color: "#333",
  },
  hoursText: {
    fontSize: 15,
    color: "#333",
    marginBottom: 4,
  },
  infoIcon: {
    marginRight: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  navigateButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default PlaceDetailsScreen;
