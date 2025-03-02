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
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { fetchNearbyPlaces } from "../controllers/Map/placesController";
import { getCurrentLocation } from "../controllers/Map/locationController";
import { Colors, NeutralColors } from "../constants/colours";
import { getPlaceCardImageUrl } from "../utils/mapImageUtils";
import { formatDistanceToNow } from "date-fns"; // Make sure to install this package
import Header from "../components/Global/Header";

const { width } = Dimensions.get("window");
const GRID_CARD_WIDTH = (width - 48) / 2; // Two columns with margins

const ViewAllScreen = ({ route, navigation }) => {
  const { viewType = "nearbyPlaces" } = route.params || {};
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set dynamic header properties based on view type
  const headerConfig = {
    myPlaces: {
      title: "My Places",
      subtitle: "Places you've visited",
      icon: "bookmark",
      color: Colors.primary,
    },
    nearbyPlaces: {
      title: "Nearby Places",
      subtitle: "Discover attractions around you",
      icon: "location",
      color: Colors.primary,
    },
  };

  // Get current header configuration
  const currentHeaderConfig = headerConfig[viewType] || headerConfig.nearbyPlaces;

  useEffect(() => {
    fetchData();
  }, [viewType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (viewType === "myPlaces") {
        // Fetch visited places from Firestore
        await fetchVisitedPlacesFromFirestore();
      } else {
        // For Nearby Places, fetch from Google Places API
        const location = await getCurrentLocation();
        if (!location) {
          setError("Unable to get your location");
          setLoading(false);
          return;
        }

        // Use destructuring to get places from the returned object
        const { places: nearbyPlaces, furthestDistance } = await fetchNearbyPlaces(
          location.latitude,
          location.longitude
        );

        setPlaces(nearbyPlaces || []);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching places:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  // New function to fetch user's visited places from Firestore
  const fetchVisitedPlacesFromFirestore = async () => {
    try {
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No authenticated user found");
        setPlaces([]);
        setLoading(false);
        return;
      }

      // Use the user's visited places subcollection
      const userVisitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
      const querySnapshot = await getDocs(userVisitedPlacesRef);

      if (querySnapshot.empty) {
        console.log("No saved places found in Firestore");
        setPlaces([]);
      } else {
        // Transform Firestore documents to place objects
        const userPlacesData = querySnapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            place_id: data.place_id,
            name: data.name,
            vicinity: data.vicinity || "",
            description: data.description || "",
            geometry: data.geometry,
            photos: data.photos || [],
            // Format the visited date for display
            visitedAt: data.visitedAt,
            visitDate: data.visitedAt ? new Date(data.visitedAt) : new Date(),
            // Add isVisited flag to indicate these are places that have been visited
            isVisited: true,
          };
        });

        console.log(`Found ${userPlacesData.length} places in Firestore`);
        setPlaces(userPlacesData);
      }
    } catch (error) {
      console.error("Error fetching visited places from Firestore:", error);
      setError("Failed to load your visited places");
    } finally {
      setLoading(false);
    }
  };

  const navigateToPlaceDetails = (placeId) => {
    navigation.navigate("Place", { placeId });
  };

  // Format the date for display
  const formatVisitDate = (dateString) => {
    if (!dateString) return "Visited recently";

    try {
      const visitDate = new Date(dateString);
      return `Visited ${formatDistanceToNow(visitDate, { addSuffix: true })}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Visited recently";
    }
  };

  // Render a grid item for nearby places
  const renderGridItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => navigateToPlaceDetails(item.place_id)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: getPlaceCardImageUrl(item, GRID_CARD_WIDTH, GRID_CARD_WIDTH * 1.2) }}
          style={styles.gridImage}
        />
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
          {item.isVisited && (
            <View style={styles.visitedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#fff" />
              <Text style={styles.visitedText}>Visited</Text>
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
        <Image
          source={{ uri: getPlaceCardImageUrl(item, width - 32, 180) }}
          style={styles.listImage}
        />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.cardGradient} />
        <View style={styles.cardContent}>
          <Text style={styles.placeName}>{item.name}</Text>
          <View style={styles.placeInfo}>
            <Ionicons name="location" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.placeVicinity} numberOfLines={1}>
              {item.vicinity || "Unknown location"}
            </Text>
          </View>
          {/* Display formatted visit date */}
          <View style={styles.visitDateContainer}>
            <Ionicons name="time-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.visitDateText}>{formatVisitDate(item.visitedAt)}</Text>
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
            onPress={() => navigation.navigate("Explore")}
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
            We couldn't find any tourist attractions nearby. Try again later or in a different
            location.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  // Create a right component for filter and sort options
  const headerRightComponent = (
    <View style={styles.headerRightContainer}>
      {/* {viewType === "nearbyPlaces" && (
        <TouchableOpacity style={styles.headerButton}>
          <View style={styles.iconContainer}>
            <Ionicons name="filter" size={20} color={Colors.primary} />
          </View>
        </TouchableOpacity>
      )} */}
      {/* <TouchableOpacity style={styles.headerButton}>
        <View style={styles.iconContainer}>
          <Ionicons name="options" size={20} color={Colors.primary} />
        </View>
      </TouchableOpacity> */}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Dynamic Header based on view type */}
      <Header
        title={currentHeaderConfig.title}
        subtitle={currentHeaderConfig.subtitle}
        showIcon={false}
        iconName={currentHeaderConfig.icon}
        iconColor={currentHeaderConfig.color}
        // rightComponent={headerRightComponent}
        showBackButton={true}
        showHelp={false}
        onBackPress={() => navigation.goBack()}
      />

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
  headerRightContainer: {
    flexDirection: "row",
  },
  headerButton: {
    marginLeft: 8,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
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
  visitedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visitedText: {
    fontSize: 10,
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

export default ViewAllScreen;
