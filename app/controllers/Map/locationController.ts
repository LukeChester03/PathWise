// src/controllers/Map/locationController.ts
import * as Location from "expo-location";
import { Alert, Platform, AppState } from "react-native";
import { Region, Coordinate } from "../../types/MapTypes";
import { haversineDistance } from "../../utils/mapUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  GeoPoint,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";
import { fetchNearbyPlaces } from "./placesController"; // Ensure this import exists

// Constants for location tracking
const LOCATION_UPDATE_DISTANCE_THRESHOLD = 2000; // 2km for significant movement
const LOCATION_STORAGE_KEY = "last_location_v1";
const PLACES_UPDATE_THRESHOLD_KM = 15; // 15km movement before refreshing places
const MIN_PLACES_UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Store last location to check if user has moved significantly
let lastKnownLocation: Coordinate | null = null;
let lastPlacesUpdateTime = 0;
let lastPlacesUpdateLocation: Coordinate | null = null;

// Track initialization status to prevent duplicate initialization
let initializationInProgress = false;
let placesPreloadComplete = false;

// Flag to control places loading - DISABLED by default until user logs in
let placesLoadingEnabled = false;

// Function to enable/disable places loading
export const setPlacesLoadingEnabled = (enabled: boolean) => {
  console.log(`[locationController] Places loading ${enabled ? "ENABLED" : "DISABLED"}`);
  placesLoadingEnabled = enabled;
};

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
  places: [],
  furthestDistance: 0,
  isLoading: false,
  lastUpdated: 0,
  hasPreloaded: false,
  isPreloading: true,
};

// Callbacks for place updates
const placeUpdateCallbacks: ((places: any) => void)[] = [];
// Callbacks for location updates
const locationUpdateCallbacks: ((location: any) => void)[] = [];

/**
 * Save location to Firebase for analytics and tracking
 */
const saveLocationToFirebase = async (location: Coordinate): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Save to user's location history
    const locationData = {
      location: new GeoPoint(location.latitude, location.longitude),
      timestamp: serverTimestamp(),
      accuracy: 0, // Not available in this context
      heading: globalLocationState.userHeading || 0,
    };

    // Use a unique ID based on timestamp to avoid duplicates
    const locationId = `loc_${Date.now()}`;
    const locationRef = doc(db, "users", currentUser.uid, "locationHistory", locationId);

    await setDoc(locationRef, locationData);

    // Also update the user's last known location
    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(
      userDocRef,
      {
        lastLocation: new GeoPoint(location.latitude, location.longitude),
        lastLocationTimestamp: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("[locationController] Error saving location to Firebase:", error);
    // Continue even if Firebase save fails
  }
};

/**
 * Load last known location from storage and Firebase
 */
const loadLastKnownLocation = async () => {
  try {
    // First try Firebase if user is logged in
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().lastLocation) {
        const firestoreLocation = userDoc.data().lastLocation;
        lastKnownLocation = {
          latitude: firestoreLocation.latitude,
          longitude: firestoreLocation.longitude,
        };

        // Also try to get places update info
        if (userDoc.data().lastPlacesUpdateTime) {
          lastPlacesUpdateTime = userDoc.data().lastPlacesUpdateTime.toDate().getTime();
        }

        if (userDoc.data().lastPlacesUpdateLocation) {
          const placeUpdateLoc = userDoc.data().lastPlacesUpdateLocation;
          lastPlacesUpdateLocation = {
            latitude: placeUpdateLoc.latitude,
            longitude: placeUpdateLoc.longitude,
          };
        }

        console.log(
          `[locationController] Loaded last location from Firebase: ${lastKnownLocation.latitude}, ${lastKnownLocation.longitude}`
        );

        // Use this to initialize global state if we have nothing else
        if (!globalLocationState.userLocation) {
          globalLocationState.userLocation = lastKnownLocation;
          globalLocationState.region = {
            latitude: lastKnownLocation.latitude,
            longitude: lastKnownLocation.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          };
        }

        return;
      }
    }

    // Try AsyncStorage as fallback
    const storedLocation = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    if (storedLocation) {
      const locationData = JSON.parse(storedLocation);
      lastKnownLocation = locationData.location;
      lastPlacesUpdateTime = locationData.placesUpdateTime || 0;
      lastPlacesUpdateLocation = locationData.placesUpdateLocation || null;

      console.log(
        `[locationController] Loaded last location from storage: ${lastKnownLocation.latitude}, ${lastKnownLocation.longitude}`
      );

      // Use this to initialize global state if we have nothing else
      if (!globalLocationState.userLocation) {
        globalLocationState.userLocation = lastKnownLocation;
        globalLocationState.region = {
          latitude: lastKnownLocation.latitude,
          longitude: lastKnownLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
      }
    }
  } catch (error) {
    console.error("[locationController] Error loading last location:", error);
  }
};

/**
 * Save location to persistent storage and Firebase
 */
const saveLocationToPersistentStorage = async () => {
  if (!lastKnownLocation) return;

  try {
    // Save to AsyncStorage
    const locationData = {
      location: lastKnownLocation,
      placesUpdateTime: lastPlacesUpdateTime,
      placesUpdateLocation: lastPlacesUpdateLocation,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));

    // Also save to Firebase
    saveLocationToFirebase(lastKnownLocation);
  } catch (error) {
    console.error("[locationController] Error saving location:", error);
  }
};

// Initialize by loading last location
loadLastKnownLocation();

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

/**
 * Mark initialization as complete
 */
const markPreloadingComplete = () => {
  globalPlacesState.isPreloading = false;
  globalLocationState.isInitializing = false;
  placesPreloadComplete = true;
  notifyPlaceUpdates();
  notifyLocationUpdates();
  console.log("[locationController] Preloading complete - marked all states as ready");
};

/**
 * Requests foreground location permissions.
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
 * Check if user has moved significantly from last known location
 */
export const hasMovedSignificantly = (currentLocation: Coordinate): boolean => {
  if (!lastKnownLocation) {
    // If no last location, consider it significant
    lastKnownLocation = currentLocation;
    saveLocationToPersistentStorage();
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
    saveLocationToPersistentStorage();
    console.log(`User moved ${distance.toFixed(2)}m - updating location`);
    return true;
  }

  return false;
};

/**
 * Update user heading based on movement
 */
export const updateHeadingFromMovement = (newLocation: Coordinate): boolean => {
  if (!lastKnownLocation) return false;

  const distance = haversineDistance(
    lastKnownLocation.latitude,
    lastKnownLocation.longitude,
    newLocation.latitude,
    newLocation.longitude
  );

  // Only calculate heading if we've moved enough
  if (distance > 10) {
    // At least 10 meters of movement
    // Calculate bearing/heading
    const y =
      Math.sin(newLocation.longitude - lastKnownLocation.longitude) *
      Math.cos(newLocation.latitude);
    const x =
      Math.cos(lastKnownLocation.latitude) * Math.sin(newLocation.latitude) -
      Math.sin(lastKnownLocation.latitude) *
        Math.cos(newLocation.latitude) *
        Math.cos(newLocation.longitude - lastKnownLocation.longitude);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;

    // Convert to 0-360 degrees
    const heading = (bearing + 360) % 360;

    // Update global state
    globalLocationState.userHeading = heading;

    return true;
  }

  return false;
};

/**
 * Check if places should be updated based on location and time
 */
export const shouldUpdatePlaces = (currentLocation: Coordinate): boolean => {
  // If we already have places and it's been less than MIN_PLACES_UPDATE_INTERVAL
  // since the last update, don't update
  const timeSinceLastUpdate = Date.now() - globalPlacesState.lastUpdated;

  if (
    globalPlacesState.places.length > 0 &&
    timeSinceLastUpdate < MIN_PLACES_UPDATE_INTERVAL &&
    globalPlacesState.lastUpdated > 0
  ) {
    console.log(
      `[locationController] Places last updated ${Math.round(
        timeSinceLastUpdate / 1000 / 60
      )} minutes ago - too recent to update`
    );
    return false;
  }

  if (!lastPlacesUpdateLocation || !lastPlacesUpdateTime) {
    console.log(`[locationController] No previous places update, should update`);
    return true;
  }

  // Check if enough time has passed
  if (timeSinceLastUpdate < MIN_PLACES_UPDATE_INTERVAL) {
    console.log(
      `[locationController] Last places update was ${Math.round(
        timeSinceLastUpdate / 1000 / 60 / 60
      )} hours ago - too recent to update`
    );
    return false;
  }

  // Check if user has moved significantly from last places update location
  const distanceFromLastUpdate = haversineDistance(
    lastPlacesUpdateLocation.latitude,
    lastPlacesUpdateLocation.longitude,
    currentLocation.latitude,
    currentLocation.longitude
  );

  // Convert to km for readability
  const distanceKm = distanceFromLastUpdate / 1000;

  if (distanceKm >= PLACES_UPDATE_THRESHOLD_KM) {
    console.log(
      `[locationController] Moved ${distanceKm.toFixed(
        1
      )}km since last places update - should update`
    );
    return true;
  }

  console.log(
    `[locationController] Moved ${distanceKm.toFixed(
      1
    )}km since last places update - not enough to update`
  );
  return false;
};

/**
 * Record that places were updated at current location and time
 */
export const recordPlacesUpdate = async (location: Coordinate): Promise<void> => {
  lastPlacesUpdateLocation = location;
  lastPlacesUpdateTime = Date.now();
  saveLocationToPersistentStorage();
  console.log(
    `[locationController] Recorded places update at ${location.latitude.toFixed(
      6
    )}, ${location.longitude.toFixed(6)}`
  );

  // Also record to Firebase if logged in
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(
        userDocRef,
        {
          lastPlacesUpdateLocation: new GeoPoint(location.latitude, location.longitude),
          lastPlacesUpdateTime: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("[locationController] Error recording places update to Firebase:", error);
    }
  }
};

/**
 * Reset the last known location.
 */
export const resetLastKnownLocation = (): void => {
  lastKnownLocation = null;
  lastPlacesUpdateLocation = null;
  lastPlacesUpdateTime = 0;
  saveLocationToPersistentStorage();
};

/**
 * Retrieves the current location.
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
      accuracy: Location.Accuracy.Balanced, // Changed from Highest to Balanced
    });

    const { latitude, longitude } = location.coords;

    // Update last known location
    lastKnownLocation = { latitude, longitude };
    saveLocationToPersistentStorage();

    // Create a region for map display
    const region = {
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
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
 * Update nearby places based on current location
 * This function:
 * 1. Updates global state to indicate loading
 * 2. Fetches places from cache or API
 * 3. Updates global state with results
 * 4. Notifies all subscribers
 */
export const updateNearbyPlaces = async (
  location: Coordinate | Region,
  forceRefresh: boolean = false
): Promise<boolean> => {
  try {
    // Check if places loading is enabled
    if (!placesLoadingEnabled) {
      console.log(`[locationController] Places loading is disabled - skipping fetch`);
      return false;
    }

    // Check if app is in background
    if (AppState.currentState !== "active") {
      console.log("[locationController] App is in background, skipping places update");
      return false;
    }

    // Extract coordinates from location
    const latitude = "latitudeDelta" in location ? location.latitude : location.latitude;
    const longitude = "longitudeDelta" in location ? location.longitude : location.longitude;

    // Sanity check for coordinates
    if (latitude === undefined || longitude === undefined) {
      console.error("[locationController] Invalid coordinates for updateNearbyPlaces");
      return false;
    }

    console.log(
      `[locationController] Updating nearby places at ${latitude.toFixed(6)}, ${longitude.toFixed(
        6
      )}, force=${forceRefresh}`
    );

    // If we already have places loaded and this isn't a forced refresh,
    // check if we really need to update
    if (
      !forceRefresh &&
      globalPlacesState.places.length > 0 &&
      !shouldUpdatePlaces({ latitude, longitude })
    ) {
      console.log("[locationController] Using existing places data, no need to refresh");
      return true;
    }

    // Update global state to indicate loading
    globalPlacesState.isLoading = true;
    notifyPlaceUpdates();

    // Fetch nearby places
    const placesResponse = await fetchNearbyPlaces(latitude, longitude, forceRefresh);

    // Update global state with results
    globalPlacesState.places = placesResponse.places;
    globalPlacesState.furthestDistance = placesResponse.furthestDistance;
    globalPlacesState.isLoading = false;
    globalPlacesState.lastUpdated = Date.now();
    globalPlacesState.hasPreloaded = true;
    globalPlacesState.isPreloading = false;

    // Record this update
    await recordPlacesUpdate({ latitude, longitude });

    // Notify all subscribers
    notifyPlaceUpdates();

    console.log(
      `[locationController] Updated nearby places: ${placesResponse.places.length} places`
    );
    return true;
  } catch (error) {
    console.error("[locationController] Error updating nearby places:", error);
    globalPlacesState.isLoading = false;
    notifyPlaceUpdates();
    return false;
  }
};

/**
 * Initialize location tracking and places preloading
 */
export const initLocationAndPlaces = async (): Promise<void> => {
  try {
    // Prevent multiple initializations running at once
    if (initializationInProgress) {
      console.log("[locationController] Initialization already in progress, skipping");
      return;
    }

    initializationInProgress = true;
    console.log("Starting location initialization...");

    // Set initialization in progress
    globalLocationState.isInitializing = true;
    globalPlacesState.isPreloading = true;

    // Notify listeners of initialization status
    notifyLocationUpdates();
    notifyPlaceUpdates();

    // If we already have preloaded data, use it
    if (placesPreloadComplete && globalPlacesState.places.length > 0) {
      console.log("[locationController] Using already preloaded places data");
      globalPlacesState.isPreloading = false;
      globalLocationState.isInitializing = false;
      initializationInProgress = false;
      notifyLocationUpdates();
      notifyPlaceUpdates();
      return;
    }

    // Request location permissions first
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.warn("Location permission denied during initialization");
      globalLocationState.locationError = "Location permission denied";
      markPreloadingComplete();
      initializationInProgress = false;
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

    // First try to use last known location from storage
    if (lastKnownLocation) {
      console.log("Using stored last known location for initialization");
      globalLocationState.userLocation = lastKnownLocation;
      globalLocationState.region = {
        latitude: lastKnownLocation.latitude,
        longitude: lastKnownLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      globalLocationState.isInitialized = true;
      globalLocationState.isInitializing = false;
      globalLocationState.lastUpdated = Date.now();
      notifyLocationUpdates();

      // If places loading is enabled and we don't have places yet, get them based on the stored location
      // NOTE: This will be skipped until user logs in because placesLoadingEnabled starts as false
      if (placesLoadingEnabled && globalPlacesState.places.length === 0) {
        console.log("[locationController] Loading places based on stored location");
        await updateNearbyPlaces(lastKnownLocation, false);
      } else {
        console.log("[locationController] Places loading not enabled, skipping place fetch");
      }

      // Mark preloading as complete after a short delay
      setTimeout(() => {
        markPreloadingComplete();
        initializationInProgress = false;
      }, 500);

      // Also try to get a fresh location in the background
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
        .then((location) => {
          // Only update if significantly different
          const { latitude, longitude } = location.coords;
          const currentLocation = { latitude, longitude };

          if (hasMovedSignificantly(currentLocation)) {
            globalLocationState.userLocation = currentLocation;
            globalLocationState.region = {
              latitude,
              longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            };
            globalLocationState.lastUpdated = Date.now();
            notifyLocationUpdates();

            // Update places if needed and if places loading is enabled
            if (placesLoadingEnabled && shouldUpdatePlaces(currentLocation)) {
              updateNearbyPlaces(currentLocation, false);
            }
          }
        })
        .catch((error) => {
          console.warn("Background location update failed:", error);
        });

      return;
    }

    // If no stored location, get a fresh one
    try {
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = locationResult.coords;

      // Create a region for map display
      const region = {
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
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
      saveLocationToPersistentStorage();

      // Notify location listeners
      notifyLocationUpdates();

      // Load nearby places only if placesLoadingEnabled is true (after login)
      if (placesLoadingEnabled && globalPlacesState.places.length === 0) {
        await updateNearbyPlaces({ latitude, longitude }, false);
      } else {
        console.log("[locationController] Places loading not enabled, skipping place fetch");
      }

      // Mark preloading as complete
      setTimeout(() => {
        markPreloadingComplete();
        initializationInProgress = false;
      }, 500);
    } catch (error) {
      console.error("Error getting initial location:", error);
      globalLocationState.locationError = "Error getting initial location";
      globalLocationState.isInitialized = false;
      markPreloadingComplete();
      initializationInProgress = false;
    }
  } catch (error) {
    console.error("Error in location initialization:", error);
    markPreloadingComplete();
    initializationInProgress = false;
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
        accuracy: Location.Accuracy.Balanced, // Changed from Highest to Balanced
        // Increase distance interval to reduce updates
        distanceInterval: 100, // 100 meters
        // Increase time interval to reduce updates
        timeInterval: 30000, // 30 seconds
      },
      (location) => {
        // Check if app is in background
        if (AppState.currentState !== "active") {
          // Skip processing location updates when app is in background
          return;
        }

        const { latitude, longitude } = location.coords;
        const newCoordinate = { latitude, longitude };

        // Only update if movement is significant
        if (hasMovedSignificantly(newCoordinate)) {
          // Create updated region and coordinate
          const newRegion = {
            latitude,
            longitude,
            latitudeDelta: globalLocationState.region?.latitudeDelta || 0.02,
            longitudeDelta: globalLocationState.region?.longitudeDelta || 0.02,
          };

          // Update global state
          globalLocationState.userLocation = newCoordinate;
          globalLocationState.region = newRegion;
          globalLocationState.lastUpdated = Date.now();

          // Update heading based on movement
          updateHeadingFromMovement(newCoordinate);

          // Notify listeners
          notifyLocationUpdates();
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
 * Auto-initialize when this module is imported
 */
(async function initializeAutomatically() {
  try {
    console.log("🚀 Automatically initializing location tracking...");

    // Start with places loading disabled - will be enabled after login
    setPlacesLoadingEnabled(false);

    // Setup app state change listener to avoid updating when in background
    AppState.addEventListener("change", (nextAppState) => {
      const appIsActive = nextAppState === "active";
      console.log(`App state changed to: ${nextAppState}`);

      // When app returns to active state, check if we need to refresh
      if (appIsActive && globalLocationState.userLocation && placesLoadingEnabled) {
        // Consider refreshing places data if it's been a while
        const timeSinceLastUpdate = Date.now() - globalPlacesState.lastUpdated;
        if (timeSinceLastUpdate > 5 * 60 * 1000) {
          // 5 minutes
          console.log("[locationController] App returned to foreground, refreshing places");
          updateNearbyPlaces(globalLocationState.userLocation, false);
        }
      }
    });

    await initLocationAndPlaces();
  } catch (error) {
    console.error("❌ Error in automatic location initialization:", error);
    markPreloadingComplete();
    initializationInProgress = false;
  }
})();

/**
 * Public function to check if places loading is enabled
 */
export const isPlacesLoadingEnabled = (): boolean => {
  return placesLoadingEnabled;
};

/**
 * Auto-check authentication and enable places loading if needed
 * Call this from screens that need places data
 */
export const checkAuthAndEnablePlacesLoading = (): boolean => {
  const currentUser = auth.currentUser;
  const wasEnabled = placesLoadingEnabled;

  if (currentUser) {
    // User is logged in, enable places loading
    if (!placesLoadingEnabled) {
      console.log("[locationController] User is logged in, enabling places loading");
      setPlacesLoadingEnabled(true);
    }
    return true;
  } else {
    // User is not logged in, disable places loading
    if (placesLoadingEnabled) {
      console.log("[locationController] User is not logged in, disabling places loading");
      setPlacesLoadingEnabled(false);
    }
    return false;
  }
};

// Also modify the auto-init function to check auth on startup:
(async function initializeAutomatically() {
  try {
    console.log("🚀 Automatically initializing location tracking...");

    // Check auth state right away - if logged in, enable places loading
    checkAuthAndEnablePlacesLoading();

    // Setup app state change listener to avoid updating when in background
    AppState.addEventListener("change", (nextAppState) => {
      const appIsActive = nextAppState === "active";
      console.log(`App state changed to: ${nextAppState}`);

      // When app returns to active state, check if we need to refresh
      if (appIsActive && globalLocationState.userLocation) {
        // Check auth state again
        const isEnabled = checkAuthAndEnablePlacesLoading();

        // Consider refreshing places data if logged in and it's been a while
        if (isEnabled) {
          const timeSinceLastUpdate = Date.now() - globalPlacesState.lastUpdated;
          if (timeSinceLastUpdate > 5 * 60 * 1000) {
            // 5 minutes
            console.log("[locationController] App returned to foreground, refreshing places");
            updateNearbyPlaces(globalLocationState.userLocation, false);
          }
        }
      }
    });

    await initLocationAndPlaces();
  } catch (error) {
    console.error("❌ Error in automatic location initialization:", error);
    markPreloadingComplete();
    initializationInProgress = false;
  }
})();
