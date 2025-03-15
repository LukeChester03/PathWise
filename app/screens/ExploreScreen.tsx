// Updated ExploreScreen.tsx with Firebase caching fixes

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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs, DocumentData } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import Header from "../components/Global/Header";
import {
  fetchNearbyPlaces,
  clearPlacesCache,
  fetchPlaceDetailsOnDemand, // Added this import
  getCacheStats, // Added this import for debugging
} from "../controllers/Map/placesController";
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
import { RootStackParamList } from "../navigation/types";
import NetInfo from "@react-native-community/netinfo"; // Add this import for network detection

const { width } = Dimensions.get("window");

type ExploreScreenProps = StackScreenProps<RootStackParamList, "Home">;

/**
 * Preload nearby places when app initializes
 * Updated to use the Firebase cache correctly
 */
export const preloadNearbyPlaces = async () => {
  try {
    // Check if we already have places in the global state
    if (globalPlacesState.places.length > 0 && !globalPlacesState.isPreloading) {
      console.log("Places already preloaded, skipping preload");
      return;
    }

    console.log("Starting place preloading from app initialization");

    // Check if we're online first
    const netInfo = await NetInfo.fetch();
    const isConnected = netInfo.isConnected ?? false;
    console.log(`Network connected: ${isConnected}`);

    // Get current location
    const location = await getCurrentLocation();
    if (!location) {
      console.error("Failed to get current location for preloading");
      return;
    }

    // Fetch places - this will use Firebase cache if available
    console.log(`Got location for preload: ${location.latitude}, ${location.longitude}`);

    // Only pass forceRefresh=true if we're specifically wanting to ignore cache
    // Here we want to USE the cache if available, so forceRefresh=false
    await updateNearbyPlaces(location, false);

    // Log cache stats for debugging
    const stats = await getCacheStats();
    console.log("Place cache stats:", JSON.stringify(stats));

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
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMyPlaces, setLoadingMyPlaces] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [noPlacesFound, setNoPlacesFound] = useState<boolean>(false);
  const [noMyPlacesFound, setNoMyPlacesFound] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Refs for component lifecycle and data loading
  const componentVisibleRef = useRef<boolean>(true);
  const initialLoadCompletedRef = useRef<boolean>(false);
  const locationWatcherRef = useRef<(() => void) | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const loadingSafetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const placesLoadedRef = useRef<boolean>(false);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? false;
      setIsConnected(connected);
    });

    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
      if (locationWatcherRef.current) {
        locationWatcherRef.current();
        locationWatcherRef.current = null;
      }
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (appState.current.match(/inactive|background/) && nextAppState === "active") {
      if (componentVisibleRef.current) {
        refreshAllData();
      }
    }
    appState.current = nextAppState;
  };

  // Initial data load and setup
  useEffect(() => {
    console.log("ExploreScreen mounted - initializing data...");
    componentVisibleRef.current = true;
    placesLoadedRef.current = false;

    // Register for place updates
    const unsubscribeFromPlaceUpdates = onPlacesUpdate(handlePlacesUpdate);

    // Set up location watcher if not already set
    if (!locationWatcherRef.current) {
      setupLocationWatcher();
    }

    // Load user's places from Firestore
    fetchUserPlacesFromFirestore();

    // Check if we already have preloaded places
    const placesState = getNearbyPlacesState();

    if (placesState.hasPreloaded && placesState.places.length > 0) {
      console.log(`Using ${placesState.places.length} preloaded places`);
      setNearbyPlaces(placesState.places);
      setNoPlacesFound(false);
      setLoading(false);
      placesLoadedRef.current = true;
      initialLoadCompletedRef.current = true;
    } else if (placesState.isLoading || placesState.isPreloading) {
      console.log("Places are currently being loaded or preloaded");
      setLoading(true);
      setNoPlacesFound(false);
    } else {
      console.log("No preloaded places available, fetching now");
      fetchNearbyData(false);
    }

    // Override safety timeout - CRITICAL FIX
    // This will only set initial loading to false if places haven't loaded by the timeout
    loadingSafetyTimeoutRef.current = setTimeout(() => {
      if (componentVisibleRef.current && loading && !placesLoadedRef.current) {
        console.log("Safety timeout: still loading after timeout, showing empty state");
        setLoading(false);
        if (nearbyPlaces.length === 0) {
          setNoPlacesFound(true);
        }
      }
    }, 15000);

    return () => {
      componentVisibleRef.current = false;
      unsubscribeFromPlaceUpdates();

      // Clear all timers
      if (loadingSafetyTimeoutRef.current) {
        clearTimeout(loadingSafetyTimeoutRef.current);
        loadingSafetyTimeoutRef.current = null;
      }

      // Clean up location watcher
      if (locationWatcherRef.current) {
        locationWatcherRef.current();
        locationWatcherRef.current = null;
      }
    };
  }, []);

  const setupLocationWatcher = async () => {
    try {
      const cleanup = await startLocationWatching();
      locationWatcherRef.current = cleanup;
      console.log("Location watcher set up successfully");
    } catch (error) {
      console.error("Error setting up location watcher:", error);
    }
  };

  // Handle places updates from global state
  const handlePlacesUpdate = (placesData: any): void => {
    if (!componentVisibleRef.current || !placesData) return;

    console.log(
      "Received places update:",
      placesData.places?.length || 0,
      "places, loading:",
      placesData.isLoading,
      "preloading:",
      placesData.isPreloading
    );

    setLoading(placesData.isLoading || placesData.isPreloading);

    if (placesData.places && placesData.places.length > 0) {
      console.log(`Setting ${placesData.places.length} places from update`);

      if (!initialLoadCompletedRef.current) {
        initialLoadCompletedRef.current = true;
      }

      // CRITICAL FIX: Mark places as loaded to prevent safety timeout from showing empty state
      placesLoadedRef.current = true;

      setNearbyPlaces(placesData.places);
      setNoPlacesFound(false);

      // Clear safety timeout since we have places
      if (loadingSafetyTimeoutRef.current) {
        clearTimeout(loadingSafetyTimeoutRef.current);
        loadingSafetyTimeoutRef.current = null;
      }
    } else if (!placesData.isLoading && !placesData.isPreloading) {
      setNoPlacesFound(true);
    }
  };

  const refreshAllData = async (): Promise<void> => {
    try {
      if (!componentVisibleRef.current) return;

      setIsRefreshing(true);

      await fetchUserPlacesFromFirestore();
      await fetchNearbyData(true);

      setIsRefreshing(false);
    } catch (error) {
      console.error("Error refreshing data:", error);
      if (componentVisibleRef.current) {
        setIsRefreshing(false);
        Alert.alert(
          "Refresh Failed",
          "There was a problem refreshing the data. Please try again later."
        );
      }
    }
  };

  const fetchNearbyData = async (forceRefresh: boolean = false): Promise<void> => {
    try {
      if (!componentVisibleRef.current) return;

      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);
      setNoPlacesFound(false);

      const currentLocation = await getCurrentLocation();
      if (!currentLocation) {
        console.error("ExploreScreen: Unable to get current location");
        if (componentVisibleRef.current) {
          setError("Unable to get your location");
          setLoading(false);
        }
        return;
      }

      // Reset safety timeout
      if (loadingSafetyTimeoutRef.current) {
        clearTimeout(loadingSafetyTimeoutRef.current);
      }

      // Set new safety timeout ONLY for initial loading, not refreshes
      if (!initialLoadCompletedRef.current) {
        loadingSafetyTimeoutRef.current = setTimeout(() => {
          if (componentVisibleRef.current && loading && !placesLoadedRef.current) {
            console.log("Safety timeout: still loading after refresh timeout, showing empty state");
            setLoading(false);
            if (nearbyPlaces.length === 0) {
              setNoPlacesFound(true);
            }
          }
        }, 15000);
      }

      const success = await updateNearbyPlaces(currentLocation, forceRefresh);

      // Check global state immediately after update
      const placesState = getNearbyPlacesState();

      if (placesState.places.length > 0) {
        placesLoadedRef.current = true;
        setNearbyPlaces(placesState.places);
        setNoPlacesFound(false);
        setLoading(false);

        if (loadingSafetyTimeoutRef.current) {
          clearTimeout(loadingSafetyTimeoutRef.current);
          loadingSafetyTimeoutRef.current = null;
        }
        return;
      }

      if (!success && componentVisibleRef.current) {
        setError("Failed to fetch nearby places");
        setLoading(false);

        if (nearbyPlaces.length > 0) {
          setNoPlacesFound(false);
        } else {
          setNoPlacesFound(true);
        }
      } else {
        // Success but no update callback, set loading to false after a short delay
        setTimeout(() => {
          if (componentVisibleRef.current && loading) {
            setLoading(false);
          }
        }, 2000);
      }
    } catch (error) {
      console.error("Error fetching nearby data:", error);

      if (!componentVisibleRef.current) return;

      setError("Something went wrong while fetching nearby places");
      setLoading(false);

      if (nearbyPlaces.length > 0) {
        setNoPlacesFound(false);
      } else {
        setNoPlacesFound(true);
      }
    }
  };

  const fetchUserPlacesFromFirestore = async (): Promise<void> => {
    try {
      if (!componentVisibleRef.current) return;

      setLoadingMyPlaces(true);
      setNoMyPlacesFound(false);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No authenticated user found");
        if (componentVisibleRef.current) {
          setNoMyPlacesFound(true);
          setLoadingMyPlaces(false);
        }
        return;
      }

      const userVisitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
      const querySnapshot = await getDocs(userVisitedPlacesRef);

      if (!componentVisibleRef.current) return;

      if (querySnapshot.empty) {
        console.log("No saved places found in Firestore");
        setNoMyPlacesFound(true);
        setMyPlaces([]);
      } else {
        const userPlacesData = querySnapshot.docs
          .filter((doc) => {
            const data = doc.data();
            return !data._isInitDocument;
          })
          .map((doc) => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              place_id: data.place_id || doc.id,
              name: data.name || "Unknown Place",
              vicinity: data.vicinity || "",
              description: data.description || "",
              geometry: data.geometry || {
                location: { lat: 0, lng: 0 },
              },
              photos: data.photos || [],
              rating: data.rating || null,
              user_ratings_total: data.user_ratings_total || null,
              visitedAt: data.visitedAt || null,
              visitDate: data.visitedAt ? new Date(data.visitedAt) : new Date(),
              isVisited: true,
              website: data.website || null,
            } as Place;
          });

        console.log(`Found ${userPlacesData.length} places in Firestore (excluding init doc)`);

        if (!componentVisibleRef.current) return;

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

      if (!componentVisibleRef.current) return;

      setNoMyPlacesFound(true);
      setLoadingMyPlaces(false);
    }
  };

  const navigateToPlaceDetails = async (placeId: string, place?: Place): Promise<void> => {
    if (!place) {
      console.error("Cannot navigate: No place provided");
      return;
    }

    try {
      if (isConnected && !place.hasFullDetails) {
        try {
          console.log(`Fetching full details for ${place.name} before navigation`);
          Alert.alert("Loading place details...");

          const detailedPlace = await fetchPlaceDetailsOnDemand(place.place_id);

          if (detailedPlace) {
            console.log(`Got full details for ${detailedPlace.name}, navigating`);
            navigation.navigate("PlaceDetails", {
              placeId,
              place: detailedPlace,
            });
            return;
          }
        } catch (error) {
          console.error("Error fetching place details:", error);
        }
      }

      navigation.navigate("PlaceDetails", { placeId, place });
    } catch (error) {
      console.error("Error during navigation:", error);
      Alert.alert("Navigation Error", "Could not navigate to place details");
    }
  };

  const navigateToViewAll = (type: string): void => {
    navigation.navigate("ViewAll", { viewType: type });
  };

  const navigateToDiscover = (): void => {
    navigation.navigate("Discover");
  };

  const handleRefresh = async (): Promise<void> => {
    try {
      if (!componentVisibleRef.current) return;

      setIsRefreshing(true);
      await refreshAllData();
    } catch (error) {
      console.error("Error during refresh:", error);
    } finally {
      if (componentVisibleRef.current) {
        setIsRefreshing(false);
      }
    }
  };

  // ADDITIONAL FIX: Effect to ensure we don't lose places data
  useEffect(() => {
    if (componentVisibleRef.current && !loading && nearbyPlaces.length === 0) {
      // If no places but global state has them, update our state
      const globalPlaces = getNearbyPlacesState();
      if (globalPlaces.places.length > 0) {
        console.log("Syncing from global state - found places when local state has none");
        setNearbyPlaces(globalPlaces.places);
        placesLoadedRef.current = true;
      }
    }
  }, [loading, nearbyPlaces.length]);

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
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {/* Network Status Indicator - Show when offline */}
        {!isConnected && (
          <View style={styles.networkStatusContainer}>
            <Text style={styles.networkStatusText}>Offline Mode</Text>
          </View>
        )}

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

  // Network status indicator
  networkStatusContainer: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  networkStatusText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "500",
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
