import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ListRenderItem,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import {
  fetchNearbyPlaces,
  clearPlacesCache,
  fetchPlaceDetailsOnDemand,
  getCacheStats,
} from "../controllers/Map/placesController";
import {
  getCurrentLocation,
  getNearbyPlacesState,
  onPlacesUpdate,
  globalPlacesState,
  updateNearbyPlaces,
} from "../controllers/Map/locationController";
import { Colors, NeutralColors } from "../constants/colours";
import { getPlaceCardImageUrl } from "../utils/mapImageUtils";
import { formatDistanceToNow } from "date-fns";
import Header from "../components/Global/Header";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Place, NearbyPlacesResponse, VisitedPlaceDetails, Region } from "../types/MapTypes";
import MapLoading from "../components/Map/MapLoading";
import NetInfo from "@react-native-community/netinfo"; // Added for network detection

const { width } = Dimensions.get("window");
const GRID_CARD_WIDTH = (width - 48) / 2;

type RootStackParamList = {
  ViewAll: { viewType?: ViewType; preloadedPlaces?: (Place | VisitedPlaceDetails)[] };
  PlaceDetails: { placeId: string; place?: Place | VisitedPlaceDetails };
  Explore: undefined;
};

type ViewAllScreenRouteProp = RouteProp<RootStackParamList, "ViewAll">;
type ViewAllScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type ViewType = "nearbyPlaces" | "myPlaces";

interface HeaderConfig {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

interface ViewAllScreenProps {
  route: ViewAllScreenRouteProp;
  navigation: ViewAllScreenNavigationProp;
}

const ViewAllScreen: React.FC<ViewAllScreenProps> = ({ route, navigation }) => {
  // Extract route params
  const { viewType = "nearbyPlaces" } = route.params || {};

  console.log(`[ViewAllScreen] Rendered with viewType: ${viewType}`);

  // State for the component
  const [places, setPlaces] = useState<(Place | VisitedPlaceDetails)[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Flags to control behavior
  const ignoreSubscriptionUpdates = useRef<boolean>(false);
  const isInitialized = useRef(false);
  const placesSubscriptionRef = useRef<(() => void) | null>(null);

  // Set dynamic header properties based on view type
  const headerConfig: Record<ViewType, HeaderConfig> = {
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

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? false;
      setIsConnected(connected);
      console.log(
        `[ViewAllScreen] Network status changed: ${connected ? "connected" : "disconnected"}`
      );
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize component
  useEffect(() => {
    // Now that settings are loaded, check for preloaded data
    const initializeComponent = async () => {
      if (viewType === "nearbyPlaces") {
        // Get places state
        const placesState = getNearbyPlacesState();

        // If we have preloaded data, use it
        if (placesState.hasPreloaded && placesState.places && placesState.places.length > 0) {
          console.log(`[ViewAllScreen] Using ${placesState.places.length} preloaded places`);
          setPlaces(placesState.places);
          setLoading(false);
          isInitialized.current = true;
        } else {
          console.log("[ViewAllScreen] No preloaded places, need to fetch");
          // Fetch data if no preloaded places
          await fetchData(false);
        }
      } else {
        // For MyPlaces view, fetch from Firestore
        await fetchVisitedPlacesFromFirestore();
      }

      isInitialized.current = true;
    };

    initializeComponent();

    // Cleanup
    return () => {
      // Clean up subscription if it exists
      if (placesSubscriptionRef.current) {
        placesSubscriptionRef.current();
        placesSubscriptionRef.current = null;
      }
    };
  }, [viewType]);

  // Subscribe to global places updates
  useEffect(() => {
    // Only needed for nearby places
    if (viewType !== "nearbyPlaces") return;

    // Clean up any existing subscription
    if (placesSubscriptionRef.current) {
      placesSubscriptionRef.current();
      placesSubscriptionRef.current = null;
    }

    // Subscribe to global places updates
    const unsubscribe = onPlacesUpdate((placesState) => {
      // Skip updates while applying settings
      if (ignoreSubscriptionUpdates.current) {
        console.log("[ViewAllScreen] Ignoring subscription update");
        return;
      }

      // Only update if we have meaningful data
      if (placesState.hasPreloaded && placesState.places && placesState.places.length > 0) {
        // Update places state from global data
        setPlaces(placesState.places);

        // Update loading state
        setLoading(false);

        console.log(
          `[ViewAllScreen] Updated places from subscription: ${placesState.places.length} places`
        );
      }
    });

    // Store the unsubscribe function
    placesSubscriptionRef.current = unsubscribe;

    return () => {
      if (placesSubscriptionRef.current) {
        placesSubscriptionRef.current();
        placesSubscriptionRef.current = null;
      }
    };
  }, [viewType]);

  // Track when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("[ViewAllScreen] Screen focused");

      return () => {
        console.log("[ViewAllScreen] Screen unfocused");
      };
    }, [viewType])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // When user manually refreshes, we force refresh
    fetchData(true).finally(() => setRefreshing(false));
  }, []);

  const fetchData = async (forceRefresh: boolean = false): Promise<void> => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError(null);

      if (viewType === "myPlaces") {
        // Fetch visited places from Firestore
        await fetchVisitedPlacesFromFirestore();
      } else {
        // For Nearby Places, fetch from Google Places API
        const location: Region | null = await getCurrentLocation();
        if (!location) {
          setError("Unable to get your location");
          setLoading(false);
          return;
        }

        console.log(`[ViewAllScreen] Fetching places with params: forceRefresh=${forceRefresh}`);

        // Use the updateNearbyPlaces function which properly uses the Firebase cache
        try {
          // This will update the global state which our subscription will pick up
          await updateNearbyPlaces(location, forceRefresh);

          // No need to set places directly, our subscription will handle it
          console.log("[ViewAllScreen] Called updateNearbyPlaces successfully");

          // We'll let the subscription update the places, but we can stop loading now if there was an initial delay
          setTimeout(() => {
            if (loading) {
              const placesState = getNearbyPlacesState();
              if (placesState.places && placesState.places.length > 0) {
                setPlaces(placesState.places);
              }
              setLoading(false);
            }
          }, 1000);
        } catch (apiError) {
          console.error("[ViewAllScreen] Error in updateNearbyPlaces:", apiError);

          // Fallback to direct API call if the global approach fails
          console.log("[ViewAllScreen] Falling back to direct fetchNearbyPlaces");

          // Fixed: Only pass the correct number of arguments
          const { places: nearbyPlaces }: NearbyPlacesResponse = await fetchNearbyPlaces(
            location.latitude,
            location.longitude,
            forceRefresh
          );

          console.log(`[ViewAllScreen] Fetched ${nearbyPlaces?.length || 0} places directly`);
          setPlaces(nearbyPlaces || []);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("[ViewAllScreen] Error fetching places:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const fetchVisitedPlacesFromFirestore = async (): Promise<void> => {
    try {
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("[ViewAllScreen] No authenticated user found");
        setPlaces([]);
        setLoading(false);
        return;
      }

      // Use the user's visited places subcollection
      const userVisitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
      const querySnapshot = await getDocs(userVisitedPlacesRef);

      if (querySnapshot.empty) {
        console.log("[ViewAllScreen] No saved places found in Firestore");
        setPlaces([]);
      } else {
        // Transform Firestore documents to place objects
        const userPlacesData = querySnapshot.docs
          .filter((doc) => {
            // Filter out the initialization document and any invalid entries
            const data = doc.data();
            return !data._isInitDocument && data.name; // Ensure there's at least a name
          })
          .map((doc) => {
            const data = doc.data();

            // Always use null instead of undefined for optional fields
            return {
              id: doc.id,
              place_id: data.place_id || doc.id,
              name: data.name || "Unknown Place",
              vicinity: data.vicinity || "",
              description: data.description || "",
              geometry: data.geometry || {
                location: { lat: 0, lng: 0 },
              },
              photos: data.photos || [],
              // Use null instead of undefined
              rating: data.rating || null,
              user_ratings_total: data.user_ratings_total || null,
              price_level: data.price_level || null,
              visitedAt: data.visitedAt || null,
              isVisited: true,
              // Add any other necessary fields with null fallbacks
              website: data.website || null,
              url: data.url || null,
              formatted_phone_number: data.formatted_phone_number || null,
              opening_hours: data.opening_hours || null,
              icon: data.icon || null,
              types: data.types || [],
            } as VisitedPlaceDetails;
          });

        console.log(`[ViewAllScreen] Found ${userPlacesData.length} places in Firestore`);
        setPlaces(userPlacesData);
      }
    } catch (error) {
      console.error("[ViewAllScreen] Error fetching visited places from Firestore:", error);
      setError("Failed to load your visited places");
    } finally {
      setLoading(false);
    }
  };

  const navigateToPlaceDetails = async (placeId: string): Promise<void> => {
    try {
      // Find the place object in the places array
      const placeObject = places.find((place) => place.place_id === placeId);

      if (!placeObject) {
        console.error("[ViewAllScreen] Place not found for navigation:", placeId);
        Alert.alert("Error", "Could not find place details");
        return;
      }

      // If online and place doesn't have full details, try to fetch them using Firebase-first approach
      if (isConnected && !placeObject.hasFullDetails && viewType === "nearbyPlaces") {
        try {
          console.log(
            `[ViewAllScreen] Fetching full details for ${placeObject.name} before navigation`
          );
          // Show loading feedback

          // Use the Firebase-first approach to fetch details
          const detailedPlace = await fetchPlaceDetailsOnDemand(placeId);

          // If we got details, navigate with those
          if (detailedPlace) {
            console.log(`[ViewAllScreen] Got full details for ${detailedPlace.name}, navigating`);
            navigation.navigate("PlaceDetails", {
              placeId,
              place: detailedPlace,
            });
            return;
          }
        } catch (error) {
          console.error("[ViewAllScreen] Error fetching place details:", error);
          // Continue with basic place object if fetch fails
        }
      }

      // Navigate with the basic place object if we couldn't get details
      navigation.navigate("PlaceDetails", {
        placeId,
        place: placeObject,
      });
    } catch (error) {
      console.error("[ViewAllScreen] Error during navigation:", error);
      Alert.alert("Navigation Error", "Could not navigate to place details");
    }
  };

  // Format the date for display
  const formatVisitDate = (dateString?: string): string => {
    if (!dateString) return "Visited recently";

    try {
      const visitDate = new Date(dateString);
      return `Visited ${formatDistanceToNow(visitDate, { addSuffix: true })}`;
    } catch (error) {
      return "Visited recently";
    }
  };

  // Render a grid item for nearby places
  const renderGridItem: ListRenderItem<Place | VisitedPlaceDetails> = ({ item }) => {
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
            {item.name || "Unknown Place"}
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
  const renderListItem: ListRenderItem<Place | VisitedPlaceDetails> = ({ item }) => {
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
          <Text style={styles.placeName}>{item.name || "Unknown Place"}</Text>
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
  const renderEmptyState = (): React.ReactNode => {
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
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchData(true)}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* We're replacing SafeAreaView with a custom approach for better control */}
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Apply platform-specific top padding */}
      <View style={styles.headerContainer}>
        <Header
          title={currentHeaderConfig.title}
          subtitle={currentHeaderConfig.subtitle}
          showIcon={false}
          iconName={currentHeaderConfig.icon}
          iconColor={currentHeaderConfig.color}
          showBackButton={true}
          showHelp={false}
          onHelpPress={() => {}}
          onBackPress={() => navigation.goBack()}
        />
      </View>

      {/* Network Status Indicator - Show when offline */}
      {!isConnected && (
        <View style={styles.networkStatusContainer}>
          <Text style={styles.networkStatusText}>Offline Mode</Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <MapLoading />
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchData(true)}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : places.length === 0 ? (
        renderEmptyState()
      ) : viewType === "nearbyPlaces" ? (
        <FlatList
          data={places}
          keyExtractor={(item) => item.place_id || item.id || Math.random().toString()}
          renderItem={renderGridItem}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          ListHeaderComponent={
            debugInfo ? (
              <View style={styles.debugContainer}>
                <Text style={styles.debugText}>{debugInfo}</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.place_id || item.id || Math.random().toString()}
          renderItem={renderListItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    paddingTop:
      Platform.OS === "ios"
        ? // On iOS, apply minimal padding based on device
          Platform.select({
            ios: Math.max(StatusBar.currentHeight || 0, 10),
            default: 0,
          })
        : // On Android, just enough for the status bar
          StatusBar.currentHeight || 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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

  // Network status indicator
  networkStatusContainer: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: "center",
  },
  networkStatusText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "500",
  },

  debugContainer: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginBottom: 8,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  debugText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },

  gridContent: {
    padding: 16,
    paddingBottom: 80,
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

  listContent: {
    padding: 16,
    paddingBottom: 80,
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
