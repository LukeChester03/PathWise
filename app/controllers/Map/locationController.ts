// controllers/Map/locationController.ts
import * as Location from "expo-location";
import { Alert, Platform } from "react-native";
import { Region, Coordinate, Place } from "../../types/MapTypes";
import { fetchNearbyPlaces } from "./placesController";
import { haversineDistance } from "../../utils/mapUtils";

console.log("Loading locationController module...");

// Store last location to check if user has moved significantly
let lastKnownLocation: Coordinate | null = null;
const LOCATION_UPDATE_DISTANCE_THRESHOLD = 10; // 10 meters threshold

// Global state for location and nearby places
export const globalLocationState = {
  userLocation: null as Coordinate | null,
  region: null as Region | null,
  userHeading: 0,
  locationPermissionGranted: false,
  isInitialized: false,
  isInitializing: true,
  lastUpdated: 0,
  locationError: null as string | null,
  watchId: null as Location.LocationSubscription | null,
};

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
// Callbacks for location updates
const locationUpdateCallbacks: ((location: any) => void)[] = [];

/**
 * Register a callback to be notified when location is updated
 */
export const onLocationUpdate = (callback: (location: any) => void): (() => void) => {
  // Immediately send current state to the callback
  setTimeout(() => {
    callback({
      userLocation: globalLocationState.userLocation,
      region: globalLocationState.region,
      userHeading: globalLocationState.userHeading,
      locationPermissionGranted: globalLocationState.locationPermissionGranted,
      isInitialized: globalLocationState.isInitialized,
      isInitializing: globalLocationState.isInitializing,
      lastUpdated: globalLocationState.lastUpdated,
      locationError: globalLocationState.locationError,
    });
  }, 0);

  // Add to callback list
  locationUpdateCallbacks.push(callback);

  // Return a function to unregister the callback
  return () => {
    const index = locationUpdateCallbacks.indexOf(callback);
    if (index !== -1) {
      locationUpdateCallbacks.splice(index, 1);
    }
  };
};

/**
 * Notify all registered callbacks about location updates
 */
const notifyLocationUpdates = () => {
  const locationData = {
    userLocation: globalLocationState.userLocation,
    region: globalLocationState.region,
    userHeading: globalLocationState.userHeading,
    locationPermissionGranted: globalLocationState.locationPermissionGranted,
    isInitialized: globalLocationState.isInitialized,
    isInitializing: globalLocationState.isInitializing,
    lastUpdated: globalLocationState.lastUpdated,
    locationError: globalLocationState.locationError,
  };

  locationUpdateCallbacks.forEach((callback) => {
    callback(locationData);
  });
};

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
  globalLocationState.isInitializing = false;
  notifyPlaceUpdates();
  notifyLocationUpdates();
};

/**
 * Requests foreground location permissions.
 * @returns A Promise resolving to `true` if permission is granted, otherwise `false`.
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  globalLocationState.locationPermissionGranted = status === "granted";
  return status === "granted";
};

/**
 * Get the current location state
 */
export const getLocationState = () => {
  return {
    userLocation: globalLocationState.userLocation,
    region: globalLocationState.region,
    userHeading: globalLocationState.userHeading,
    locationPermissionGranted: globalLocationState.locationPermissionGranted,
    isInitialized: globalLocationState.isInitialized,
    isInitializing: globalLocationState.isInitializing,
    lastUpdated: globalLocationState.lastUpdated,
    locationError: globalLocationState.locationError,
  };
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
 * Requests foreground location permissions and fetches the current location.
 * @returns A Promise resolving to the user's current location as a `Region` object.
 *          Returns `null` if permission is denied or an error occurs.
 */
export const getCurrentLocation = async (): Promise<Region | null> => {
  try {
    // First, check if we already have a cached location
    if (globalLocationState.userLocation && !globalLocationState.locationError) {
      console.log("Returning cached location:", globalLocationState.userLocation);
      return globalLocationState.region;
    }

    const hasPermission = await requestLocationPermission();
    console.log("Location permission granted:", hasPermission);

    if (!hasPermission) {
      globalLocationState.locationError = "Permission to access location was denied";
      notifyLocationUpdates();
      return null;
    }

    // Configure location for better accuracy on Android
    if (Platform.OS === "android") {
      try {
        await Location.enableNetworkProviderAsync();
      } catch (error) {
        console.warn("Error enabling network provider:", error);
        // Continue anyway - this is not critical
      }
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });

    const { latitude, longitude } = location.coords;

    // Update last known location
    lastKnownLocation = { latitude, longitude };

    // Create a region for map display
    const region = {
      latitude,
      longitude,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    };

    // Update global state
    globalLocationState.userLocation = { latitude, longitude };
    globalLocationState.region = region;
    globalLocationState.isInitialized = true;
    globalLocationState.isInitializing = false;
    globalLocationState.lastUpdated = Date.now();
    globalLocationState.locationError = null;

    // Notify listeners
    notifyLocationUpdates();

    return region;
  } catch (error: any) {
    console.error("Error getting location:", error);
    globalLocationState.locationError = error.message;
    globalLocationState.isInitializing = false;
    notifyLocationUpdates();
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
    console.log("Starting location and places initialization...");

    // Set initialization in progress
    globalLocationState.isInitializing = true;
    globalPlacesState.isPreloading = true;

    // Notify listeners of initialization status
    notifyLocationUpdates();
    notifyPlaceUpdates();

    // Request location permissions first
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.warn("Location permission denied during initialization");
      globalLocationState.locationError = "Location permission denied";
      markPreloadingComplete();
      return;
    }

    // Configure location for better accuracy on Android
    if (Platform.OS === "android") {
      try {
        await Location.enableNetworkProviderAsync();
      } catch (error) {
        console.warn("Error enabling network provider:", error);
        // Continue anyway - this is not critical
      }
    }

    console.log("Getting initial location...");

    // Get initial location with high accuracy
    const locationResult = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });

    const { latitude, longitude } = locationResult.coords;

    // Create a region for map display
    const region = {
      latitude,
      longitude,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    };

    console.log("Initial location acquired:", { latitude, longitude });

    // Update global location state
    globalLocationState.userLocation = { latitude, longitude };
    globalLocationState.region = region;
    globalLocationState.isInitialized = true;
    globalLocationState.isInitializing = false;
    globalLocationState.lastUpdated = Date.now();

    // Update last known location for movement detection
    lastKnownLocation = { latitude, longitude };

    // Notify location listeners
    notifyLocationUpdates();

    // Fetch nearby places based on this location
    await updateNearbyPlaces(region, true);

    // Start watching for location updates
    startLocationWatching();

    console.log("Location and places initialization complete");
  } catch (error) {
    console.error("Error initializing location and places:", error);
    globalLocationState.locationError = error.message;
    globalLocationState.isInitializing = false;
    notifyLocationUpdates();
    markPreloadingComplete();
  }
};

/**
 * Start watching location for significant movements
 */
export const startLocationWatching = async (): Promise<() => void> => {
  try {
    // Clean up any existing watch
    if (globalLocationState.watchId) {
      globalLocationState.watchId.remove();
      globalLocationState.watchId = null;
    }

    console.log("Starting location watching...");

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        distanceInterval: 5, // Update every 5 meters
        timeInterval: 1000, // Or every second
      },
      (location) => {
        const { latitude, longitude } = location.coords;

        // Create updated region and coordinate
        const newCoordinate = { latitude, longitude };
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: globalLocationState.region?.latitudeDelta || 0.002,
          longitudeDelta: globalLocationState.region?.longitudeDelta || 0.002,
        };

        // Update global state
        globalLocationState.userLocation = newCoordinate;
        globalLocationState.region = newRegion;
        globalLocationState.lastUpdated = Date.now();

        // Notify listeners
        notifyLocationUpdates();

        // Check if moved significantly for places update
        if (hasMovedSignificantly(newCoordinate)) {
          updateNearbyPlaces(newRegion, false);
        }
      }
    );

    // Store the subscription for cleanup
    globalLocationState.watchId = subscription;

    return () => {
      if (globalLocationState.watchId) {
        globalLocationState.watchId.remove();
        globalLocationState.watchId = null;
      }
    };
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

    // Set initialization in progress
    globalLocationState.isInitializing = true;
    globalPlacesState.isPreloading = true;

    // Notify listeners of initialization status
    notifyLocationUpdates();
    notifyPlaceUpdates();

    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      console.warn("⚠️ Location permission denied during automatic initialization");
      globalLocationState.locationError = "Location permission denied";
      markPreloadingComplete();
      return;
    }

    // Configure location for better accuracy on Android
    if (Platform.OS === "android") {
      try {
        await Location.enableNetworkProviderAsync();
      } catch (error) {
        console.warn("Error enabling network provider:", error);
        // Continue anyway - this is not critical
      }
    }

    // Get current location with highest accuracy
    try {
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const { latitude, longitude } = locationResult.coords;

      // Create a region for map display
      const region = {
        latitude,
        longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      };

      console.log("📍 Initial location acquired:", { latitude, longitude });

      // Update global location state
      globalLocationState.userLocation = { latitude, longitude };
      globalLocationState.region = region;
      globalLocationState.isInitialized = true;
      globalLocationState.lastUpdated = Date.now();

      // Update last known location for movement detection
      lastKnownLocation = { latitude, longitude };

      // Notify location listeners
      notifyLocationUpdates();

      // Fetch places data
      console.log("Fetching nearby places based on location");
      const placesData = await fetchNearbyPlaces(latitude, longitude, false);

      // Update global places state
      globalPlacesState.places = placesData.places;
      globalPlacesState.furthestDistance = placesData.furthestDistance;
      globalPlacesState.lastUpdated = Date.now();
      globalPlacesState.hasPreloaded = true;
      globalPlacesState.isLoading = false;

      console.log(`✅ Successfully preloaded ${placesData.places.length} places`);
      notifyPlaceUpdates();

      // Start location watching to keep state updated
      startLocationWatching();
    } catch (locationError) {
      console.error("❌ Error getting initial location:", locationError);
      globalLocationState.locationError = "Error getting initial location";
      globalLocationState.isInitialized = false;
    }
  } catch (error) {
    console.error("❌ Error in automatic location initialization:", error);
  } finally {
    // Mark preloading as complete regardless of success/failure
    markPreloadingComplete();
  }
})();
