import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  Dimensions,
  AppState,
  AppStateStatus,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs, DocumentData } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import Header from "../components/Global/Header";
import { SearchBar } from "../components/Global/SearchBar";
import { fetchNearbyPlaces, clearPlacesCache } from "../controllers/Map/placesController";
import {
  getCurrentLocation,
  startLocationWatching,
  onPlacesUpdate,
  getNearbyPlacesState,
  updateNearbyPlaces,
  globalPlacesState,
} from "../controllers/Map/locationController";
import { Colors, NeutralColors } from "../constants/colours";
import PlacesCarousel from "../components/Places/PlacesCarousel";
import GettingStartedModal from "../components/Places/GettingStartedModal";
import { Coordinate, Region, Place } from "../types/MapTypes";
import { StackScreenProps } from "@react-navigation/stack";

const { width } = Dimensions.get("window");

// Define navigation type
type RootStackParamList = {
  Home: undefined;
  Search: { initialQuery: string };

  ViewAll: { viewType: string };
  Place: { placeId: string };
  Discover: undefined;
};

type ExploreScreenProps = StackScreenProps<RootStackParamList, "Home">;

/**
 * Preload nearby places when app initializes
 */
export const preloadNearbyPlaces = async () => {
  try {
    console.log("Starting place preloading from app initialization");
    // Get current location
    const location = await getCurrentLocation();
    if (!location) {
      console.error("Failed to get current location for preloading");
      return;
    }

    // Fetch places - this will update the global state
    await updateNearbyPlaces(location, false);
    console.log("Place preloading complete");
  } catch (error) {
    console.error("Error preloading nearby places:", error);
  }
};

// Main component
const ExploreScreen: React.FC<ExploreScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [helpModalVisible, setHelpModalVisible] = useState<boolean>(false);
  const [myPlaces, setMyPlaces] = useState<Place[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMyPlaces, setLoadingMyPlaces] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [noPlacesFound, setNoPlacesFound] = useState<boolean>(false);
  const [noMyPlacesFound, setNoMyPlacesFound] = useState<boolean>(false);

  // Reference to track if we already have a location watcher
  const locationWatcherRef = useRef<(() => void) | null>(null);

  // Reference to track app state
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Handle app state changes to optimize location tracking
  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
      // Clean up location watcher when component unmounts
      if (locationWatcherRef.current) {
        locationWatcherRef.current();
        locationWatcherRef.current = null;
      }
    };
  }, []);

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (appState.current.match(/inactive|background/) && nextAppState === "active") {
      console.log("App has come to the foreground - refreshing data");
      // App has come to the foreground, refresh data
      refreshAllData();
    }
    appState.current = nextAppState;
  };

  // Initial data load and setup
  useEffect(() => {
    console.log("ExploreScreen mounted - initializing data...");

    // Register for place updates
    const unsubscribeFromPlaceUpdates = onPlacesUpdate(handlePlacesUpdate);

    // Set up location watcher if not already set
    if (!locationWatcherRef.current) {
      setupLocationWatcher();
    }

    // Load user's places
    fetchUserPlacesFromFirestore();

    // Check if we already have preloaded places
    console.log("Checking for preloaded places data...");

    // Get current state before doing anything else
    if (globalPlacesState.hasPreloaded && globalPlacesState.places.length > 0) {
      console.log(`Using ${globalPlacesState.places.length} preloaded places`);
      setNearbyPlaces(globalPlacesState.places);
      setNoPlacesFound(false);
      setLoading(false);
    } else if (globalPlacesState.isLoading || globalPlacesState.isPreloading) {
      // Show loading if preloading is in progress or regular loading is happening
      console.log("Places are currently being loaded or preloaded");
      setLoading(true);
      setNoPlacesFound(false); // Important: don't set as "not found" while still loading
    } else {
      console.log("No preloaded places available, fetching now");
      // If no places are preloaded yet, fetch them
      fetchNearbyData();
    }

    // Cleanup on unmount
    return () => {
      unsubscribeFromPlaceUpdates();
    };
  }, []);

  // Set up the location watcher
  const setupLocationWatcher = async () => {
    try {
      // Start watching for significant location changes
      const cleanup = await startLocationWatching();
      locationWatcherRef.current = cleanup;
      console.log("Location watcher set up successfully");
    } catch (error) {
      console.error("Error setting up location watcher:", error);
    }
  };

  // Handle places updates from global state
  const handlePlacesUpdate = (placesData: any): void => {
    if (!placesData) return;

    console.log(
      "Received places update:",
      placesData.places?.length || 0,
      "places, loading:",
      placesData.isLoading,
      "preloading:",
      placesData.isPreloading
    );

    // First handle loading state
    setLoading(placesData.isLoading || placesData.isPreloading);

    // If we have places, show them regardless of loading state
    if (placesData.places && placesData.places.length > 0) {
      setNearbyPlaces(placesData.places);
      setNoPlacesFound(false);
    }
    // Only set noPlacesFound to true if we're not loading and not preloading
    else if (!placesData.isLoading && !placesData.isPreloading) {
      setNoPlacesFound(true);
    }
  };

  // Function to refresh all data
  const refreshAllData = async (): Promise<void> => {
    try {
      fetchUserPlacesFromFirestore();
      fetchNearbyData(true);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  const fetchNearbyData = async (forceRefresh: boolean = false): Promise<void> => {
    try {
      // Update loading state
      setLoading(true);
      setError(null);

      // Get current location
      const currentLocation = await getCurrentLocation();
      if (!currentLocation) {
        setError("Unable to get your location");
        setLoading(false);
        return;
      }

      // Fetch nearby places through the location service
      await updateNearbyPlaces(currentLocation, forceRefresh);

      // Note: We don't need to set nearbyPlaces here as we'll get the update via handlePlacesUpdate
    } catch (error) {
      console.error("Error fetching nearby data:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const fetchUserPlacesFromFirestore = async (): Promise<void> => {
    try {
      setLoadingMyPlaces(true);
      setNoMyPlacesFound(false);

      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No authenticated user found");
        setNoMyPlacesFound(true);
        setLoadingMyPlaces(false);
        return;
      }

      // visitedPlaces is a subcollection under the user document
      const userVisitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
      const querySnapshot = await getDocs(userVisitedPlacesRef);

      if (querySnapshot.empty) {
        console.log("No saved places found in Firestore");
        setNoMyPlacesFound(true);
        setMyPlaces([]);
      } else {
        // Transform Firestore documents to place objects
        const userPlacesData = querySnapshot.docs
          .filter((doc) => {
            // Filter out the initialization document
            const data = doc.data();
            return !data._isInitDocument;
          })
          .map((doc) => {
            const data = doc.data();

            // Include ALL properties including rating
            return {
              ...data, // Keep all original properties
              id: doc.id,
              place_id: data.place_id || doc.id,
              name: data.name,
              vicinity: data.vicinity || "",
              description: data.description || "",
              geometry: data.geometry,
              photos: data.photos || [],
              // Make sure rating info is included
              rating: data.rating || null,
              // Date formatting
              visitedAt: data.visitedAt,
              visitDate: data.visitedAt ? new Date(data.visitedAt) : new Date(),
              isVisited: true, // Explicitly mark as visited
            } as Place;
          });

        console.log(`Found ${userPlacesData.length} places in Firestore (excluding init doc)`);

        if (userPlacesData.length === 0) {
          setNoMyPlacesFound(true);
          setMyPlaces([]);
        } else {
          setMyPlaces(userPlacesData);
          setNoMyPlacesFound(false);
        }
      }

      setLoadingMyPlaces(false);
    } catch (error) {
      console.error("Error fetching user places from Firestore:", error);
      setNoMyPlacesFound(true);
      setLoadingMyPlaces(false);
    }
  };

  const handleSearch = (): void => {
    if (searchQuery.trim() === "") return;
    navigation.navigate("Search", { initialQuery: searchQuery });
  };

  const navigateToViewAll = (type: string): void => {
    navigation.navigate("ViewAll", { viewType: type });
  };

  const navigateToPlaceDetails = (placeId: string, place?: Place): void => {
    navigation.navigate("Place", { placeId });
  };

  const navigateToDiscover = (): void => {
    navigation.navigate("Discover");
  };

  // Pull-to-refresh handler
  const handleRefresh = async (): Promise<void> => {
    refreshAllData();
  };

  // Enhanced empty state component with better visuals
  const renderEmptyState = (
    message: string,
    icon: string = "location-outline",
    buttonAction: () => void = navigateToDiscover,
    buttonText: string = "Discover New Places"
  ): JSX.Element => {
    return (
      <View style={styles.emptyStateCard}>
        <LinearGradient
          colors={["rgba(255,255,255,0.5)", "rgba(240,240,255,0.8)"]}
          style={styles.emptyStateGradient}
        />

        {/* Background decoration */}
        <View style={styles.emptyStateDecoration}>
          <View style={[styles.decorationCircle, styles.circle1]} />
          <View style={[styles.decorationCircle, styles.circle2]} />
          <View style={[styles.decorationCircle, styles.circle3]} />
        </View>

        <View style={styles.emptyStateContent}>
          <View style={styles.emptyStateIconContainer}>
            <Ionicons name={icon} size={40} color={Colors.primary} />
          </View>
          <Text style={styles.emptyStateTitle}>No Places Found</Text>
          <Text style={styles.emptyStateMessage}>{message}</Text>

          <TouchableOpacity style={styles.emptyStateButton} onPress={buttonAction}>
            <LinearGradient
              colors={[Colors.primary, Colors.primary + "CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.emptyStateButtonText}>{buttonText}</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLoadingState = (message: string, height: number = 220): JSX.Element => {
    return (
      <View style={[styles.shimmerContainer, { height }]}>
        <View style={styles.shimmerContent}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </View>
    );
  };

  const renderSavedPlacesSection = (): JSX.Element => {
    if (loadingMyPlaces) {
      return renderLoadingState("Loading your places...");
    }

    return (
      <>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="bookmark" size={22} color={Colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Saved Places</Text>
          </View>
          {myPlaces.length > 0 && (
            <TouchableOpacity
              onPress={() => navigateToViewAll("myPlaces")}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {noMyPlacesFound || myPlaces.length === 0 ? (
          renderEmptyState(
            "You haven't discovered any places yet. Start your journey by exploring new destinations!",
            "footsteps-outline",
            navigateToDiscover,
            "Start Exploring"
          )
        ) : (
          <PlacesCarousel places={myPlaces} onPlacePress={navigateToPlaceDetails} />
        )}
      </>
    );
  };

  const renderMyPlacesSection = (): JSX.Element => {
    if (loadingMyPlaces) {
      return renderLoadingState("Loading your places...");
    }

    return (
      <>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="compass" size={22} color={Colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Visited Places</Text>
          </View>
          {myPlaces.length > 0 && (
            <TouchableOpacity
              onPress={() => navigateToViewAll("myPlaces")}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {noMyPlacesFound || myPlaces.length === 0 ? (
          renderEmptyState(
            "You haven't discovered any places yet. Start your journey by exploring new destinations!",
            "footsteps-outline",
            navigateToDiscover,
            "Start Exploring"
          )
        ) : (
          <PlacesCarousel places={myPlaces} onPlacePress={navigateToPlaceDetails} />
        )}
      </>
    );
  };

  const renderNearbyPlacesSection = (): JSX.Element => {
    // If we're still in preloading phase or regular loading, show loading state
    if (loading || globalPlacesState.isPreloading) {
      return renderLoadingState("Finding places nearby...");
    }

    return (
      <>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="location" size={22} color={Colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Nearby Places</Text>
          </View>
          {nearbyPlaces.length > 0 && (
            <TouchableOpacity
              onPress={() => navigateToViewAll("nearbyPlaces")}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {noPlacesFound || nearbyPlaces.length === 0 ? (
          renderEmptyState(
            "No tourist attractions found nearby. Try exploring a different area.",
            "compass-outline",
            () => {
              handleRefresh();
            },
            "Try Again"
          )
        ) : (
          <PlacesCarousel places={nearbyPlaces} onPlacePress={navigateToPlaceDetails} />
        )}
      </>
    );
  };

  const renderFeaturedSection = (): JSX.Element => {
    return (
      <>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="star" size={22} color={Colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Popular Destinations</Text>
          </View>
        </View>

        <View style={styles.featuredGrid}>
          <TouchableOpacity style={styles.featuredItem} onPress={navigateToDiscover}>
            <Image
              source={{ uri: "https://source.unsplash.com/random/?city" }}
              style={styles.featuredImage}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.featuredGradient}
            >
              <Text style={styles.featuredTitle}>Cities</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featuredItem} onPress={navigateToDiscover}>
            <Image
              source={{ uri: "https://source.unsplash.com/random/?nature" }}
              style={styles.featuredImage}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.featuredGradient}
            >
              <Text style={styles.featuredTitle}>Nature</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featuredItem} onPress={navigateToDiscover}>
            <Image
              source={{ uri: "https://source.unsplash.com/random/?beach" }}
              style={styles.featuredImage}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.featuredGradient}
            >
              <Text style={styles.featuredTitle}>Beaches</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featuredItem} onPress={navigateToDiscover}>
            <Image
              source={{ uri: "https://source.unsplash.com/random/?mountain" }}
              style={styles.featuredImage}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.featuredGradient}
            >
              <Text style={styles.featuredTitle}>Mountains</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderContent = (): JSX.Element => {
    // Show only the loading state when both are loading
    if (loading && loadingMyPlaces) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading places...</Text>
        </View>
      );
    }

    // Show error screen if fetching fails
    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <LinearGradient
              colors={[Colors.primary, Colors.primary + "CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    // If both sections have no content, show a consolidated empty state
    if (noPlacesFound && noMyPlacesFound && !loading && !loadingMyPlaces) {
      return (
        <View style={styles.sectionContainer}>
          {renderEmptyState(
            "We couldn't find any places to show. Try exploring a different area or search for specific places.",
            "compass-outline"
          )}
        </View>
      );
    }

    // Otherwise, show both sections (either with content or individual empty states)
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}
      >
        {/* My Places Section */}
        <View style={styles.sectionContainer}>{renderMyPlacesSection()}</View>

        {/* Saved Places Section */}
        <View style={styles.sectionContainer}>{renderSavedPlacesSection()}</View>

        {/* Nearby Places Section */}
        <View style={styles.sectionContainer}>{renderNearbyPlacesSection()}</View>

        {/* Featured Destinations Section */}
        <View style={styles.sectionContainer}>{renderFeaturedSection()}</View>
      </ScrollView>
    );
  };

  // Create a right component for the header with notification icon
  const headerRightComponent = (
    <TouchableOpacity style={styles.notificationButton}>
      <View style={styles.notificationIconContainer}>
        <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
        <View style={styles.notificationBadge} />
      </View>
    </TouchableOpacity>
  );

  const handleHelpPress = (): void => {
    setHelpModalVisible(true);
  };

  return (
    <ScreenWithNavBar>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        {/* Enhanced Header with subtitle and icon */}
        <Header
          title="Places"
          subtitle="Discover new places around you"
          showIcon={true}
          iconName="compass"
          iconColor={Colors.primary}
          rightComponent={headerRightComponent}
          customStyles={styles.headerCustomStyles}
          onHelpPress={handleHelpPress}
          showHelp={false}
        />

        {/* Getting Started Modal */}
        <GettingStartedModal
          visible={helpModalVisible}
          onClose={() => setHelpModalVisible(false)}
        />

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} onSearch={handleSearch} />
        </View>

        {renderContent()}
      </SafeAreaView>
    </ScreenWithNavBar>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerCustomStyles: {
    marginBottom: 0,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 5,
  },
  notificationButton: {
    padding: 8,
  },
  notificationIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5252",
    top: 8,
    right: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 24,
    paddingTop: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  shimmerContainer: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#f8f8f8",
    overflow: "hidden",
    marginBottom: 8,
  },
  shimmerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: NeutralColors.gray500,
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: NeutralColors.gray500,
    textAlign: "center",
    maxWidth: "80%",
  },
  retryButton: {
    marginTop: 20,
    overflow: "hidden",
    borderRadius: 10,
  },
  buttonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: NeutralColors.white,
    fontWeight: "600",
  },
  sectionContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NeutralColors.black,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600",
    marginRight: 2,
  },

  // Featured grid
  featuredGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featuredItem: {
    width: (width - 40) / 2,
    height: 120,
    borderRadius: 16,
    marginBottom: 8,
    overflow: "hidden",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    justifyContent: "flex-end",
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  featuredTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // Enhanced empty state styles
  emptyStateCard: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    position: "relative",
    minHeight: 220,
  },
  emptyStateGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  emptyStateDecoration: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorationCircle: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: Colors.primary,
  },
  circle1: {
    width: 120,
    height: 120,
    top: -60,
    right: -30,
    opacity: 0.05,
  },
  circle2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: 20,
    opacity: 0.03,
  },
  circle3: {
    width: 40,
    height: 40,
    top: 40,
    left: 30,
    opacity: 0.07,
  },
  emptyStateContent: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  emptyStateIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NeutralColors.black,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateMessage: {
    fontSize: 14,
    color: NeutralColors.gray500,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyStateButton: {
    overflow: "hidden",
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginRight: 4,
  },
});

export default ExploreScreen;
