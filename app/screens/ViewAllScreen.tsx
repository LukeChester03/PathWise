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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import {
  fetchNearbyPlaces,
  updatePlacesSettings,
  clearPlacesCache,
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
import MapDistanceSettingsModal from "../components/Map/MapDistanceSettingsModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapLoading from "../components/Map/MapLoading";

const { width } = Dimensions.get("window");
const GRID_CARD_WIDTH = (width - 48) / 2;

// Default settings values
const DEFAULT_MAX_PLACES = 50;
const DEFAULT_SEARCH_RADIUS = 20;

// Storage keys for persisting settings
const STORAGE_KEY_MAX_PLACES = "@explore_app:max_places";
const STORAGE_KEY_SEARCH_RADIUS = "@explore_app:search_radius";

type RootStackParamList = {
  ViewAll: { viewType?: ViewType; preloadedPlaces?: (Place | VisitedPlaceDetails)[] };
  PlaceDetails: { placeId: string; place?: Place | VisitedPlaceDetails }; // Changed from "Place" to "PlaceDetails"
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
  const [settingsModalVisible, setSettingsModalVisible] = useState<boolean>(false);
  const [maxPlaces, setMaxPlaces] = useState<number>(DEFAULT_MAX_PLACES);
  const [searchRadius, setSearchRadius] = useState<number>(DEFAULT_SEARCH_RADIUS);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [settingsChanged, setSettingsChanged] = useState<boolean>(false);
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);

  // Flags to control behavior
  const isApplyingSettings = useRef<boolean>(false);
  const ignoreSubscriptionUpdates = useRef<boolean>(false);
  const isInitialized = useRef(false);

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

  // Load saved settings from AsyncStorage first
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        console.log("[ViewAllScreen] Loading saved settings from AsyncStorage");
        const savedMaxPlaces = await AsyncStorage.getItem(STORAGE_KEY_MAX_PLACES);
        const savedSearchRadius = await AsyncStorage.getItem(STORAGE_KEY_SEARCH_RADIUS);

        // Load settings with defaults if not found
        const newMaxPlaces = savedMaxPlaces ? parseInt(savedMaxPlaces, 10) : DEFAULT_MAX_PLACES;
        const newSearchRadius = savedSearchRadius
          ? parseInt(savedSearchRadius, 10)
          : DEFAULT_SEARCH_RADIUS;

        // Update state
        setMaxPlaces(newMaxPlaces);
        setSearchRadius(newSearchRadius);

        // Apply to controller right away
        updatePlacesSettings(newMaxPlaces, newSearchRadius);

        // Mark settings as loaded
        setSettingsLoaded(true);
      } catch (error) {
        console.error("[ViewAllScreen] Error loading saved settings:", error);
        // Use defaults in case of error
        setMaxPlaces(DEFAULT_MAX_PLACES);
        setSearchRadius(DEFAULT_SEARCH_RADIUS);
        updatePlacesSettings(DEFAULT_MAX_PLACES, DEFAULT_SEARCH_RADIUS);
        setSettingsLoaded(true);
      }
    };

    loadSavedSettings();
  }, []);

  // Only proceed with initialization after settings are loaded
  useEffect(() => {
    if (!settingsLoaded) {
      console.log("[ViewAllScreen] Waiting for settings to load before initialization");
      return;
    }

    // Now that settings are loaded, check for preloaded data
    const initializeComponent = async () => {
      if (viewType === "nearbyPlaces") {
        // Get places state with settings applied
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
  }, [settingsLoaded, viewType, maxPlaces, searchRadius]);

  // Subscribe to global places updates - only AFTER settings are loaded
  useEffect(() => {
    // Only needed for nearby places and only if settings are loaded
    if (viewType !== "nearbyPlaces" || !settingsLoaded) return;

    // Subscribe to global places updates
    const unsubscribe = onPlacesUpdate((placesState) => {
      // Skip updates while applying settings
      if (ignoreSubscriptionUpdates.current) {
        console.log("[ViewAllScreen] Ignoring subscription update while applying settings");
        return;
      }

      // Only update if we have meaningful data
      if (placesState.hasPreloaded && placesState.places && placesState.places.length > 0) {
        // Update places state from global data
        setPlaces(placesState.places);

        // Update loading state
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [viewType, settingsLoaded, maxPlaces, searchRadius]);

  // Track when the screen comes into focus - check for settings changes
  useFocusEffect(
    useCallback(() => {
      console.log("[ViewAllScreen] Screen focused");

      // Check if settings are loaded
      if (!settingsLoaded) return;

      // Check if we need to apply any pending settings changes
      const checkAndApplySettings = async () => {
        try {
          // Get saved settings
          const savedMaxPlaces = await AsyncStorage.getItem(STORAGE_KEY_MAX_PLACES);
          const savedSearchRadius = await AsyncStorage.getItem(STORAGE_KEY_SEARCH_RADIUS);

          const newMaxPlaces = savedMaxPlaces ? parseInt(savedMaxPlaces, 10) : DEFAULT_MAX_PLACES;
          const newSearchRadius = savedSearchRadius
            ? parseInt(savedSearchRadius, 10)
            : DEFAULT_SEARCH_RADIUS;

          // Check if settings differ from current state
          if (maxPlaces !== newMaxPlaces || searchRadius !== newSearchRadius) {
            console.log(`[ViewAllScreen] Detected settings change on focus, applying`);

            // Block subscription updates during settings change
            ignoreSubscriptionUpdates.current = true;

            // Show loading screen
            setLoading(true);

            // Update state
            setMaxPlaces(newMaxPlaces);
            setSearchRadius(newSearchRadius);

            // Only reload data if we're in the nearby places view
            if (viewType === "nearbyPlaces") {
              // Update settings in controller
              updatePlacesSettings(newMaxPlaces, newSearchRadius);

              // Wait a moment
              await new Promise((resolve) => setTimeout(resolve, 300));

              // Force refresh
              await fetchData(true);

              // Allow subscription updates again
              ignoreSubscriptionUpdates.current = false;
            } else {
              setLoading(false);
            }
          }
        } catch (error) {
          console.error("[ViewAllScreen] Error checking settings on focus:", error);
          ignoreSubscriptionUpdates.current = false;
          setLoading(false);
        }
      };

      checkAndApplySettings();

      return () => {
        console.log("[ViewAllScreen] Screen unfocused");
      };
    }, [viewType, maxPlaces, searchRadius, settingsLoaded])
  );

  // Handle settings changes
  useEffect(() => {
    const applySettingsChanges = async () => {
      if (settingsChanged && viewType === "nearbyPlaces") {
        try {
          // Clear the flag right away to prevent multiple runs
          setSettingsChanged(false);

          // Set tracking flags
          isApplyingSettings.current = true;
          ignoreSubscriptionUpdates.current = true;

          console.log("[ViewAllScreen] Applying settings change:", maxPlaces, searchRadius);

          // Ensure loading is true and visible
          setLoading(true);

          // Wait for UI to update
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Clear the cache completely
          clearPlacesCache();

          // Update the global settings
          updatePlacesSettings(maxPlaces, searchRadius);

          // Save settings to AsyncStorage for persistence
          await AsyncStorage.setItem(STORAGE_KEY_MAX_PLACES, maxPlaces.toString());
          await AsyncStorage.setItem(STORAGE_KEY_SEARCH_RADIUS, searchRadius.toString());

          // If we have a location, update the global places state directly
          const location: Region | null = await getCurrentLocation();
          if (location) {
            await updateNearbyPlaces(location, true);
            await new Promise((resolve) => setTimeout(resolve, 500));
            setLoading(false);
          } else {
            // Fallback to local fetch if location not available
            await fetchData(true);
          }

          // Reset tracking flags
          isApplyingSettings.current = false;
          ignoreSubscriptionUpdates.current = false;
        } catch (error) {
          console.error("[ViewAllScreen] Error applying settings changes:", error);
          setLoading(false);
          isApplyingSettings.current = false;
          ignoreSubscriptionUpdates.current = false;
        }
      }
    };

    applySettingsChanges();
  }, [settingsChanged, maxPlaces, searchRadius, viewType]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // When user manually refreshes, we force refresh
    fetchData(true).finally(() => setRefreshing(false));
  }, [maxPlaces, searchRadius]);

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

        console.log(
          `[ViewAllScreen] Fetching places with params: forceRefresh=${forceRefresh}, maxPlaces=${maxPlaces}`
        );

        // Use destructuring to get places from the returned object
        const { places: nearbyPlaces }: NearbyPlacesResponse = await fetchNearbyPlaces(
          location.latitude,
          location.longitude,
          forceRefresh,
          maxPlaces // Directly pass maxPlaces to override any cached settings
        );

        console.log(`[ViewAllScreen] Fetched ${nearbyPlaces?.length || 0} places`);
        setPlaces(nearbyPlaces || []);
      }
    } catch (error) {
      console.error("[ViewAllScreen] Error fetching places:", error);
      setError("Something went wrong");
    } finally {
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
            visitedAt: data.visitedAt,
            isVisited: true,
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

  const navigateToPlaceDetails = (placeId: string): void => {
    // Find the place object in the places array
    const placeObject = places.find((place) => place.place_id === placeId);

    // Navigate to PlaceDetails with both placeId and place object
    navigation.navigate("PlaceDetails", {
      placeId,
      place: placeObject,
    });
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

  // Handler for when settings are saved
  const handleSaveSettings = (newMaxPlaces: number, newSearchRadius: number): void => {
    console.log(
      `[ViewAllScreen] User changed settings to max: ${newMaxPlaces}, radius: ${newSearchRadius}`
    );

    // Block subscription updates
    ignoreSubscriptionUpdates.current = true;

    // Force the loading screen to appear immediately
    setLoading(true);

    // Close the modal
    setSettingsModalVisible(false);

    // Use setTimeout to ensure the loading screen renders before proceeding
    setTimeout(() => {
      // Update the local state
      setMaxPlaces(newMaxPlaces);
      setSearchRadius(newSearchRadius);

      // Set flag to trigger the settings change effect
      setSettingsChanged(true);
    }, 50);
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

  // right component for filter and sort options
  const headerRightComponent = (
    <View style={styles.headerRightContainer}>
      {viewType === "nearbyPlaces" && (
        <TouchableOpacity style={styles.headerButton} onPress={() => setSettingsModalVisible(true)}>
          <View style={styles.iconContainer}>
            <Ionicons name="options" size={20} color={Colors.primary} />
          </View>
        </TouchableOpacity>
      )}
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
        rightComponent={viewType === "nearbyPlaces" ? headerRightComponent : undefined}
        showBackButton={true}
        showHelp={false}
        onHelpPress={() => {}}
        onBackPress={() => navigation.goBack()}
      />

      {/* Settings Modal for Nearby Places */}
      <MapDistanceSettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        initialMaxPlaces={maxPlaces}
        initialRadius={searchRadius}
        onSave={handleSaveSettings}
      />

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
          keyExtractor={(item) => item.place_id}
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
          keyExtractor={(item) => item.place_id}
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
