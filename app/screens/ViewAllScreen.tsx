import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { fetchNearbyPlaces } from "../controllers/Map/placesController";
import { getCurrentLocation } from "../controllers/Map/locationController";
import { Colors, NeutralColors } from "../constants/colours";

const { width } = Dimensions.get("window");
const GRID_CARD_WIDTH = (width - 48) / 2; // Two columns with margins

const PlacesViewAllScreen = ({ route, navigation }) => {
  const { viewType = "nearbyPlaces" } = route.params || {};
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Screen title based on view type
  const screenTitle = viewType === "myPlaces" ? "My Places" : "Nearby Places";

  useEffect(() => {
    fetchData();
  }, [viewType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (viewType === "myPlaces") {
        // For My Places, we'd typically fetch from a database
        // For now, showing empty state as required
        setPlaces([]);
        setLoading(false);
      } else {
        // For Nearby Places, fetch from Google Places API
        const location = await getCurrentLocation();
        if (!location) {
          setError("Unable to get your location");
          setLoading(false);
          return;
        }

        const nearbyPlaces = await fetchNearbyPlaces(location.latitude, location.longitude);
        setPlaces(nearbyPlaces || []);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching places:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const navigateToPlaceDetails = (placeId) => {
    navigation.navigate("Place", { placeId });
  };

  const getPhotoUrl = (place) => {
    const photoRef = place.photos && place.photos[0]?.photo_reference;
    return photoRef
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
      : "https://via.placeholder.com/400?text=No+Image";
  };

  // Render a grid item for nearby places
  const renderGridItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => navigateToPlaceDetails(item.place_id)}
        activeOpacity={0.9}
      >
        <Image source={{ uri: getPhotoUrl(item) }} style={styles.gridImage} />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.cardGradient} />
        <View style={styles.cardContent}>
          <Text style={styles.placeName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render a list item for my places
  const renderListItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => navigateToPlaceDetails(item.place_id)}
        activeOpacity={0.9}
      >
        <Image source={{ uri: getPhotoUrl(item) }} style={styles.listImage} />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.cardGradient} />
        <View style={styles.cardContent}>
          <Text style={styles.placeName}>{item.name}</Text>
          <View style={styles.placeInfo}>
            <Ionicons name="location" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.placeVicinity} numberOfLines={1}>
              {item.vicinity || "Unknown location"}
            </Text>
          </View>
          {/* For My Places, we would show when the place was visited */}
          <View style={styles.visitDateContainer}>
            <Ionicons name="time-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.visitDateText}>Visited recently</Text>
          </View>
        </View>
        {item.rating && (
          <View style={styles.ratingContainerList}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Empty state based on view type
  const renderEmptyState = () => {
    if (viewType === "myPlaces") {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No Places Visited Yet</Text>
          <Text style={styles.emptyText}>
            Your visited places will appear here. Start exploring to add places to your collection!
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate("Discover")}
          >
            <Text style={styles.exploreButtonText}>Explore Nearby Places</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No Nearby Places Found</Text>
          <Text style={styles.emptyText}>
            We couldn't find any places nearby. Try again later or in a different location.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={NeutralColors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{screenTitle}</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading places...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : places.length === 0 ? (
        renderEmptyState()
      ) : viewType === "nearbyPlaces" ? (
        <FlatList
          data={places}
          keyExtractor={(item) => item.place_id}
          renderItem={renderGridItem}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.place_id}
          renderItem={renderListItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: NeutralColors.gray500,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: NeutralColors.gray500,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray500,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: NeutralColors.black,
  },
  // Grid Layout (for Nearby Places)
  gridContent: {
    padding: 16,
  },
  gridRow: {
    justifyContent: "space-between",
  },
  gridCard: {
    width: GRID_CARD_WIDTH,
    height: GRID_CARD_WIDTH * 1.2,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: NeutralColors.gray400,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gridImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  // List Layout (for My Places)
  listContent: {
    padding: 16,
  },
  listCard: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: NeutralColors.gray400,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  // Shared styles
  cardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  placeName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  placeInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  placeVicinity: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    flex: 1,
  },
  visitDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  visitDateText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  ratingContainerList: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 3,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: NeutralColors.black,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: NeutralColors.gray500,
    textAlign: "center",
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default PlacesViewAllScreen;
