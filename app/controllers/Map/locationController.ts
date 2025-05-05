import * as Location from "expo-location";
import { Alert, Platform, AppState } from "react-native";
import { Region, Coordinate } from "../../types/MapTypes";
import { calcDist } from "../../utils/mapUtils";
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
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";
import { fetchNearbyPlaces } from "./placesController";

const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;
const LOCATION_UPDATE_DISTANCE_THRESHOLD = 2000;
const LOCATION_STORAGE_KEY = "last_location_v2";
const PLACES_UPDATE_THRESHOLD_KM = 15;
const MIN_PLACES_UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
const LOCATION_HISTORY_MAX_ENTRIES = 100;
const LOCATION_CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000;
const LAST_LOCATION_CLEANUP_KEY = "last_location_cleanup";

let lastKnownLocation: Coordinate | null = null;
let lastPlacesUpdateTime = 0;
let lastPlacesUpdateLocation: Coordinate | null = null;

let initializationInProgress = false;
let placesPreloadComplete = false;

let placesLoadingEnabled = false;

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

export const globalPlacesState = {
  places: [],
  furthestDistance: 0,
  isLoading: false,
  lastUpdated: 0,
  hasPreloaded: false,
  isPreloading: true,
};

const placeUpdateCallbacks: ((places: any) => void)[] = [];
const locationUpdateCallbacks: ((location: any) => void)[] = [];

/**
 * Function to enable/disable places loading
 */
export const setPlacesLoadingEnabled = (enabled: boolean) => {
  console.log(`[locationController] Places loading ${enabled ? "ENABLED" : "DISABLED"}`);
  placesLoadingEnabled = enabled;
};

/**
 * Clean up old location history entries
 */
const cleanupLocationHistory = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const now = Date.now();
    const lastCleanupStr = await AsyncStorage.getItem(LAST_LOCATION_CLEANUP_KEY);
    const lastCleanup = lastCleanupStr ? parseInt(lastCleanupStr, 10) : 0;

    if (now - lastCleanup < LOCATION_CLEANUP_INTERVAL) {
      console.log("[locationController] Location history cleanup not due yet");
      return;
    }

    console.log("[locationController] Starting location history cleanup");

    const locationHistoryRef = collection(db, "users", currentUser.uid, "locationHistory");
    const historyQuery = query(locationHistoryRef, where("timestamp", "!=", null));
    const historySnapshot = await getDocs(historyQuery);

    const entries = historySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        timestamp: doc.data().timestamp,
      }))
      .sort((a, b) => {
        const aTime = a.timestamp?.toDate().getTime() || 0;
        const bTime = b.timestamp?.toDate().getTime() || 0;
        return bTime - aTime;
      });

    if (entries.length > LOCATION_HISTORY_MAX_ENTRIES) {
      const entriesToDelete = entries.slice(LOCATION_HISTORY_MAX_ENTRIES);

      console.log(
        `[locationController] Deleting ${entriesToDelete.length} old location history entries`
      );

      for (const entry of entriesToDelete) {
        try {
          const entryRef = doc(db, "users", currentUser.uid, "locationHistory", entry.id);
          await deleteDoc(entryRef);
        } catch (error) {
          console.error(
            `[locationController] Error deleting location history entry ${entry.id}:`,
            error
          );
        }
      }
    }

    await AsyncStorage.setItem(LAST_LOCATION_CLEANUP_KEY, now.toString());
    console.log("[locationController] Location history cleanup completed");
  } catch (error) {
    console.error("[locationController] Error cleaning up location history:", error);
  }
};

/**
 * Save location to Firebase for analytics and tracking
 */
const saveLocationToFirebase = async (location: Coordinate): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const now = new Date();
    const expiryDate = new Date(now.getTime() + TWO_MONTHS_MS);

    const locationData = {
      location: new GeoPoint(location.latitude, location.longitude),
      timestamp: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiryDate),
      accuracy: 0,
      heading: globalLocationState.userHeading || 0,
    };

    const locationId = `loc_${Date.now()}`;
    const locationRef = doc(db, "users", currentUser.uid, "locationHistory", locationId);

    await setDoc(locationRef, locationData);

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

    cleanupLocationHistory().catch((e) =>
      console.error("[locationController] Error during history cleanup:", e)
    );
  } catch (error) {
    console.error("[locationController] Error saving location to Firebase:", error);
  }
};

//load last known loc from storage
const loadLastKnownLocation = async () => {
  try {
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

    const storedLocation = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    if (storedLocation) {
      const locationData = JSON.parse(storedLocation);

      if (locationData.expiresAt && Date.now() > locationData.expiresAt) {
        console.log("[locationController] Stored location has expired");
        return;
      }

      lastKnownLocation = locationData.location;
      lastPlacesUpdateTime = locationData.placesUpdateTime || 0;
      lastPlacesUpdateLocation = locationData.placesUpdateLocation || null;

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
 * Save location to persistent storage and Firebase with expiration
 */
const saveLocationToPersistentStorage = async () => {
  if (!lastKnownLocation) return;

  try {
    const now = Date.now();

    const locationData = {
      location: lastKnownLocation,
      placesUpdateTime: lastPlacesUpdateTime,
      placesUpdateLocation: lastPlacesUpdateLocation,
      timestamp: now,
      expiresAt: now + TWO_MONTHS_MS,
    };

    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));

    saveLocationToFirebase(lastKnownLocation);
  } catch (error) {
    console.error("[locationController] Error saving location:", error);
  }
};

loadLastKnownLocation();

export const onLocationUpdate = (callback: (location: any) => void): (() => void) => {
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

  locationUpdateCallbacks.push(callback);

  return () => {
    const index = locationUpdateCallbacks.indexOf(callback);
    if (index !== -1) {
      locationUpdateCallbacks.splice(index, 1);
    }
  };
};

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

export const onPlacesUpdate = (callback: (places: any) => void): (() => void) => {
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

  placeUpdateCallbacks.push(callback);

  return () => {
    const index = placeUpdateCallbacks.indexOf(callback);
    if (index !== -1) {
      placeUpdateCallbacks.splice(index, 1);
    }
  };
};

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

const markPreloadingComplete = () => {
  globalPlacesState.isPreloading = false;
  globalLocationState.isInitializing = false;
  placesPreloadComplete = true;
  notifyPlaceUpdates();
  notifyLocationUpdates();
  console.log("[locationController] Preloading complete - marked all states as ready");
};

export const requestLocationPermission = async (): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  globalLocationState.locationPermissionGranted = status === "granted";
  return status === "granted";
};

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

export const hasMovedSignificantly = (currentLocation: Coordinate): boolean => {
  if (!lastKnownLocation) {
    lastKnownLocation = currentLocation;
    saveLocationToPersistentStorage();
    return true;
  }

  const distance = calcDist(
    lastKnownLocation.latitude,
    lastKnownLocation.longitude,
    currentLocation.latitude,
    currentLocation.longitude
  );

  if (distance >= LOCATION_UPDATE_DISTANCE_THRESHOLD) {
    lastKnownLocation = currentLocation;
    saveLocationToPersistentStorage();
    console.log(`User moved ${distance.toFixed(2)}m - updating location`);
    return true;
  }

  return false;
};

export const updateHeadingFromMovement = (newLocation: Coordinate): boolean => {
  if (!lastKnownLocation) return false;

  const distance = calcDist(
    lastKnownLocation.latitude,
    lastKnownLocation.longitude,
    newLocation.latitude,
    newLocation.longitude
  );

  if (distance > 10) {
    const y =
      Math.sin(newLocation.longitude - lastKnownLocation.longitude) *
      Math.cos(newLocation.latitude);
    const x =
      Math.cos(lastKnownLocation.latitude) * Math.sin(newLocation.latitude) -
      Math.sin(lastKnownLocation.latitude) *
        Math.cos(newLocation.latitude) *
        Math.cos(newLocation.longitude - lastKnownLocation.longitude);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;

    const heading = (bearing + 360) % 360;

    globalLocationState.userHeading = heading;

    return true;
  }

  return false;
};

export const shouldUpdatePlaces = (currentLocation: Coordinate): boolean => {
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

  if (timeSinceLastUpdate < MIN_PLACES_UPDATE_INTERVAL) {
    console.log(
      `[locationController] Last places update was ${Math.round(
        timeSinceLastUpdate / 1000 / 60 / 60
      )} hours ago - too recent to update`
    );
    return false;
  }

  const distanceFromLastUpdate = calcDist(
    lastPlacesUpdateLocation.latitude,
    lastPlacesUpdateLocation.longitude,
    currentLocation.latitude,
    currentLocation.longitude
  );

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

export const recordPlacesUpdate = async (location: Coordinate): Promise<void> => {
  lastPlacesUpdateLocation = location;
  lastPlacesUpdateTime = Date.now();
  saveLocationToPersistentStorage();
  console.log(
    `[locationController] Recorded places update at ${location.latitude.toFixed(
      6
    )}, ${location.longitude.toFixed(6)}`
  );

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

export const resetLastKnownLocation = (): void => {
  lastKnownLocation = null;
  lastPlacesUpdateLocation = null;
  lastPlacesUpdateTime = 0;
  saveLocationToPersistentStorage();
};

export const getCurrentLocation = async (): Promise<Region | null> => {
  try {
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

    if (Platform.OS === "android") {
      try {
        await Location.enableNetworkProviderAsync();
      } catch (error) {
        console.warn("Error enabling network provider:", error);
      }
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;

    lastKnownLocation = { latitude, longitude };
    saveLocationToPersistentStorage();

    const region = {
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    globalLocationState.userLocation = { latitude, longitude };
    globalLocationState.region = region;
    globalLocationState.isInitialized = true;
    globalLocationState.isInitializing = false;
    globalLocationState.lastUpdated = Date.now();
    globalLocationState.locationError = null;

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

export const updateNearbyPlaces = async (
  location: Coordinate | Region,
  forceRefresh: boolean = false
): Promise<boolean> => {
  try {
    if (!placesLoadingEnabled) {
      console.log(`[locationController] Places loading is disabled - skipping fetch`);
      return false;
    }

    if (AppState.currentState !== "active") {
      console.log("[locationController] App is in background, skipping places update");
      return false;
    }

    const latitude = "latitudeDelta" in location ? location.latitude : location.latitude;
    const longitude = "longitudeDelta" in location ? location.longitude : location.longitude;

    if (latitude === undefined || longitude === undefined) {
      console.error("[locationController] Invalid coordinates for updateNearbyPlaces");
      return false;
    }

    console.log(
      `Updating nearby places at ${latitude.toFixed(6)}, ${longitude.toFixed(
        6
      )}, force=${forceRefresh}`
    );

    if (
      !forceRefresh &&
      globalPlacesState.places.length > 0 &&
      !shouldUpdatePlaces({ latitude, longitude })
    ) {
      console.log("[locationController] Using existing places data, no need to refresh");
      return true;
    }

    globalPlacesState.isLoading = true;
    notifyPlaceUpdates();

    const placesResponse = await fetchNearbyPlaces(latitude, longitude, forceRefresh);

    globalPlacesState.places = placesResponse.places;
    globalPlacesState.furthestDistance = placesResponse.furthestDistance;
    globalPlacesState.isLoading = false;
    globalPlacesState.lastUpdated = Date.now();
    globalPlacesState.hasPreloaded = true;
    globalPlacesState.isPreloading = false;

    await recordPlacesUpdate({ latitude, longitude });

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

export const initLocationAndPlaces = async (): Promise<void> => {
  try {
    if (initializationInProgress) {
      console.log("[locationController] Initialization already in progress, skipping");
      return;
    }

    initializationInProgress = true;
    console.log("Starting location initialization...");

    globalLocationState.isInitializing = true;
    globalPlacesState.isPreloading = true;

    notifyLocationUpdates();
    notifyPlaceUpdates();

    if (placesPreloadComplete && globalPlacesState.places.length > 0) {
      console.log("[locationController] Using already preloaded places data");
      globalPlacesState.isPreloading = false;
      globalLocationState.isInitializing = false;
      initializationInProgress = false;
      notifyLocationUpdates();
      notifyPlaceUpdates();
      return;
    }

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.warn("Location permission denied during initialization");
      globalLocationState.locationError = "Location permission denied";
      markPreloadingComplete();
      initializationInProgress = false;
      return;
    }

    if (Platform.OS === "android") {
      try {
        await Location.enableNetworkProviderAsync();
      } catch (error) {
        console.warn("Error enabling network provider:", error);
      }
    }

    console.log("Getting initial location...");

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

      if (placesLoadingEnabled && globalPlacesState.places.length === 0) {
        console.log("[locationController] Loading places based on stored location");
        await updateNearbyPlaces(lastKnownLocation, false);
      } else {
        console.log("[locationController] Places loading not enabled, skipping place fetch");
      }

      setTimeout(() => {
        markPreloadingComplete();
        initializationInProgress = false;
      }, 500);

      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
        .then((location) => {
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

    try {
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = locationResult.coords;

      const region = {
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      console.log("Initial location acquired:", { latitude, longitude });

      globalLocationState.userLocation = { latitude, longitude };
      globalLocationState.region = region;
      globalLocationState.isInitialized = true;
      globalLocationState.isInitializing = false;
      globalLocationState.lastUpdated = Date.now();

      lastKnownLocation = { latitude, longitude };
      saveLocationToPersistentStorage();

      notifyLocationUpdates();

      if (placesLoadingEnabled && globalPlacesState.places.length === 0) {
        await updateNearbyPlaces({ latitude, longitude }, false);
      } else {
        console.log("[locationController] Places loading not enabled, skipping place fetch");
      }

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

export const startLocationWatching = async (): Promise<() => void> => {
  try {
    if (globalLocationState.watchId) {
      globalLocationState.watchId.remove();
      globalLocationState.watchId = null;
    }

    console.log("Starting location watching...");

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,

        distanceInterval: 100,
        timeInterval: 30000,
      },
      (location) => {
        if (AppState.currentState !== "active") {
          return;
        }

        const { latitude, longitude } = location.coords;
        const newCoordinate = { latitude, longitude };

        if (hasMovedSignificantly(newCoordinate)) {
          const newRegion = {
            latitude,
            longitude,
            latitudeDelta: globalLocationState.region?.latitudeDelta || 0.02,
            longitudeDelta: globalLocationState.region?.longitudeDelta || 0.02,
          };

          globalLocationState.userLocation = newCoordinate;
          globalLocationState.region = newRegion;
          globalLocationState.lastUpdated = Date.now();

          updateHeadingFromMovement(newCoordinate);

          notifyLocationUpdates();
        }
      }
    );

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

export const isPlacesLoadingEnabled = (): boolean => {
  return placesLoadingEnabled;
};

export const checkAuthAndEnablePlacesLoading = (): boolean => {
  const currentUser = auth.currentUser;
  const wasEnabled = placesLoadingEnabled;

  if (currentUser) {
    if (!placesLoadingEnabled) {
      setPlacesLoadingEnabled(true);
    }
    return true;
  } else {
    if (placesLoadingEnabled) {
      setPlacesLoadingEnabled(false);
    }
    return false;
  }
};

(async function initializeAutomatically() {
  try {
    console.log("Automatically initializing location tracking...");

    checkAuthAndEnablePlacesLoading();

    AppState.addEventListener("change", (nextAppState) => {
      const appIsActive = nextAppState === "active";
      console.log(`App state changed to: ${nextAppState}`);

      if (appIsActive && globalLocationState.userLocation) {
        const isEnabled = checkAuthAndEnablePlacesLoading();

        if (isEnabled) {
          const timeSinceLastUpdate = Date.now() - globalPlacesState.lastUpdated;
          if (timeSinceLastUpdate > 5 * 60 * 1000) {
            updateNearbyPlaces(globalLocationState.userLocation, false);
          }
        }
      }
    });

    await initLocationAndPlaces();
  } catch (error) {
    console.error("Error in automatic location initialization:", error);
    markPreloadingComplete();
    initializationInProgress = false;
  }
})();
