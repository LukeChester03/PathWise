// controllers/Map/locationController.ts
import * as Location from "expo-location";
import { Alert } from "react-native";
import { Region, Coordinate, Place } from "../../types/MapTypes";
import { fetchNearbyPlaces } from "./placesController";
import { haversineDistance } from "../../utils/mapUtils";

console.log("Loading locationController module...");

// Store last location to check if user has moved significantly
let lastKnownLocation: Coordinate | null = null;
const LOCATION_UPDATE_DISTANCE_THRESHOLD = 10; // 10 meters threshold

// Global state for nearby places
export const globalPlacesState = {
  places: [] as Place[],
  furthestDistance: 0,
  isLoading: false,
  lastUpdated: 0,
  hasPreloaded: false,
  isPreloading: true, // Initially true to indicate we're in first-time loading
};

// Callbacks for place updates
const placeUpdateCallbacks: ((places: any) => void)[] = [];

/**
 * Register a callback to be notified when places are updated
 */
export const onPlacesUpdate = (callback: (places: any) => void): (() => void) => {
  // Immediately send current state to the callback
  setTimeout(() => {
    callback({
      places: globalPlacesState.places,
      isLoading: globalPlacesState.isLoading,
      lastUpdated: globalPlacesState.lastUpdated,
      furthestDistance: globalPlacesState.furthestDistance,
      hasPreloaded: globalPlacesState.hasPreloaded,
      isPreloading: globalPlacesState.isPreloading,
    });
  }, 0);

  // Add to callback list
  placeUpdateCallbacks.push(callback);

  // Return a function to unregister the callback
  return () => {
    const index = placeUpdateCallbacks.indexOf(callback);
    if (index !== -1) {
      placeUpdateCallbacks.splice(index, 1);
    }
  };
};

/**
 * Notify all registered callbacks about updated places
 */
const notifyPlaceUpdates = () => {
  const placesData = {
    places: globalPlacesState.places,
    isLoading: globalPlacesState.isLoading,
    lastUpdated: globalPlacesState.lastUpdated,
    furthestDistance: globalPlacesState.furthestDistance,
    hasPreloaded: globalPlacesState.hasPreloaded,
    isPreloading: globalPlacesState.isPreloading,
  };

  placeUpdateCallbacks.forEach((callback) => {
    callback(placesData);
  });
};

// Mark preloading as complete, transition to normal state
const markPreloadingComplete = () => {
  globalPlacesState.isPreloading = false;
  notifyPlaceUpdates();
};

/**
 * Requests foreground location permissions.
 * @returns A Promise resolving to `true` if permission is granted, otherwise `false`.
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
};

/**
 * Requests foreground location permissions and fetches the current location.
 * @returns A Promise resolving to the user's current location as a `Region` object.
 *          Returns `null` if permission is denied or an error occurs.
 */
export const getCurrentLocation = async (): Promise<Region | null> => {
  const hasPermission = await requestLocationPermission();
  console.log("GRANTED");
  if (!hasPermission) {
    Alert.alert("Permission to access location was denied");
    return null;
  }

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const { latitude, longitude } = location.coords;

    // Update last known location
    lastKnownLocation = { latitude, longitude };

    return {
      latitude,
      longitude,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    };
  } catch (error: any) {
    console.error("Error getting location:", error);
    Alert.alert("Error getting location", error.message);
    return null;
  }
};

/**
 * Check if user has moved significantly from last known location.
 * @param currentLocation - The current user location.
 * @returns True if user has moved more than the threshold, false otherwise.
 */
export const hasMovedSignificantly = (currentLocation: Coordinate): boolean => {
  if (!lastKnownLocation) {
    // If no last location, consider it significant
    lastKnownLocation = currentLocation;
    return true;
  }

  const distance = haversineDistance(
    lastKnownLocation.latitude,
    lastKnownLocation.longitude,
    currentLocation.latitude,
    currentLocation.longitude
  );

  // Only update last location if moved significantly
  if (distance >= LOCATION_UPDATE_DISTANCE_THRESHOLD) {
    lastKnownLocation = currentLocation;
    console.log(`User moved ${distance.toFixed(2)}m - updating location`);
    return true;
  }

  console.log(`User moved ${distance.toFixed(2)}m - not significant enough to update`);
  return false;
};

/**
 * Reset the last known location.
 */
export const resetLastKnownLocation = (): void => {
  lastKnownLocation = null;
};

/**
 * Initialize location tracking and places preloading
 */
export const initLocationAndPlaces = async (): Promise<void> => {
  try {
    // Get initial location
    const location = await getCurrentLocation();
    if (!location) {
      console.error("Could not get initial location for preloading");
      return;
    }

    // Preload nearby places
    await updateNearbyPlaces(location, true);

    // Start watching location for significant movements
    startLocationWatching();
  } catch (error) {
    console.error("Error initializing location and places:", error);
  }
};

/**
 * Start watching location for significant movements
 */
export const startLocationWatching = async (): Promise<() => void> => {
  try {
    const cleanup = await watchUserLocation(
      // Regular update - do nothing for minor changes
      () => {},
      // Error handler
      (error) => console.error("Location watcher error:", error),
      // Significant move handler
      async (location) => {
        console.log("Significant movement detected, refreshing nearby places");
        await updateNearbyPlaces(location, false);
      }
    );
    return cleanup;
  } catch (error) {
    console.error("Error setting up location watcher:", error);
    return () => {};
  }
};

/**
 * Updates nearby places based on location
 */
export const updateNearbyPlaces = async (
  location: Region,
  forceRefresh: boolean = false
): Promise<void> => {
  // Prevent multiple simultaneous fetch operations
  if (globalPlacesState.isLoading) {
    console.log("Already fetching nearby places, skipping request");
    return;
  }

  try {
    // Set loading state and notify listeners
    globalPlacesState.isLoading = true;
    notifyPlaceUpdates();

    console.log(`Fetching nearby places (force: ${forceRefresh})`);
    const result = await fetchNearbyPlaces(location.latitude, location.longitude, forceRefresh);

    // Update global places state
    globalPlacesState.places = result.places;
    globalPlacesState.furthestDistance = result.furthestDistance;
    globalPlacesState.lastUpdated = Date.now();
    globalPlacesState.isLoading = false;
    globalPlacesState.hasPreloaded = true;

    // Notify listeners
    notifyPlaceUpdates();
    console.log(`Updated nearby places: found ${result.places.length} places`);
  } catch (error) {
    console.error("Error updating nearby places:", error);
    globalPlacesState.isLoading = false;
    notifyPlaceUpdates();
  }
};

/**
 * Get the current nearby places state
 */
export const getNearbyPlacesState = () => {
  return {
    places: globalPlacesState.places,
    isLoading: globalPlacesState.isLoading,
    lastUpdated: globalPlacesState.lastUpdated,
    furthestDistance: globalPlacesState.furthestDistance,
    hasPreloaded: globalPlacesState.hasPreloaded,
    isPreloading: globalPlacesState.isPreloading,
  };
};

/**
 * Starts watching the user's location in real-time.
 * @param onLocationUpdate - Callback function to handle location updates.
 * @param onError - Callback function to handle errors.
 * @param onSignificantMove - Optional callback when user moves significantly.
 * @returns A cleanup function to stop watching the location.
 */
export const watchUserLocation = async (
  onLocationUpdate: (region: Region) => void,
  onError: (error: any) => void,
  onSignificantMove?: (region: Region) => void
): Promise<() => void> => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    Alert.alert("Permission to access location was denied");
    return () => {};
  }

  try {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 5, // Update every 5 meters (more frequent than the 10m threshold)
        timeInterval: 1000,
      },
      (location) => {
        const { latitude, longitude } = location.coords;
        const currentRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        };

        // Always call regular update
        onLocationUpdate(currentRegion);

        // Check if moved significantly for the special callback
        if (onSignificantMove && hasMovedSignificantly({ latitude, longitude })) {
          onSignificantMove(currentRegion);
        }
      }
    );

    // Return a cleanup function to stop watching the location
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  } catch (error: any) {
    console.error("Error watching location:", error);
    onError(error);
    return () => {};
  }
};

// Self-executing async function that runs immediately when the module is imported
(async function initializeAutomatically() {
  try {
    console.log("🚀 Automatically initializing location tracking and places preloading...");

    // Set preloading in progress
    globalPlacesState.isPreloading = true;
    globalPlacesState.isLoading = true;

    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      console.warn("⚠️ Location permission denied during automatic initialization");
      markPreloadingComplete();
      return;
    }

    // Get current location
    const location = await getCurrentLocation();
    if (!location) {
      console.warn("⚠️ Could not get initial location for automatic preloading");
      markPreloadingComplete();
      return;
    }

    console.log("📍 Got initial location, preloading nearby places...");

    // Fetch places data
    try {
      const placesData = await fetchNearbyPlaces(location.latitude, location.longitude, false);

      // Update global state
      globalPlacesState.places = placesData.places;
      globalPlacesState.furthestDistance = placesData.furthestDistance;
      globalPlacesState.lastUpdated = Date.now();
      globalPlacesState.hasPreloaded = true;
      globalPlacesState.isLoading = false;

      console.log(`✅ Successfully preloaded ${placesData.places.length} places`);

      // Start location watching to keep places updated
      startLocationWatching();
    } catch (fetchError) {
      console.error("❌ Error fetching nearby places:", fetchError);
      globalPlacesState.isLoading = false;
    } finally {
      // Mark preloading as complete regardless of success/failure
      markPreloadingComplete();
    }
  } catch (error) {
    console.error("❌ Error in automatic location initialization:", error);
    markPreloadingComplete();
  }
})();
