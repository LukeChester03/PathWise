// useMapLocation.ts - Hook for handling location services
import { useState, useRef, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import {
  requestLocationPermission,
  watchUserLocation,
  getCurrentLocation,
  hasMovedSignificantly,
} from "../../controllers/Map/locationController";
import { calculateBearing, haversineDistance } from "../../utils/mapUtils";
import { HEADING_UPDATE_MIN_DISTANCE, MIN_HEADING_CHANGE } from "../../constants/Map/mapConstants";
import { Coordinate, Region } from "../../types/MapTypes";

export interface UseMapLocationReturn {
  region: Region | null;
  userLocation: Coordinate | null;
  userHeading: number;
  initializeLocation: (onInitialLocationReceived?: (location: Region) => void) => Promise<boolean>;
  updateHeadingFromMovement: (newLocation: Coordinate) => boolean;
  checkDestinationReached: (destinationCoord: Coordinate, threshold: number) => boolean;
  cleanupLocationWatcher: () => void;
  resetLocationTracking: () => void;
  previousPositionRef: React.MutableRefObject<Coordinate | null>;
  lastSignificantHeadingRef: React.MutableRefObject<number>;
  locationUpdateCounterRef: React.MutableRefObject<number>;
  setUserLocation: React.Dispatch<React.SetStateAction<Coordinate | null>>;
  setRegion: React.Dispatch<React.SetStateAction<Region | null>>;
}

const useMapLocation = (): UseMapLocationReturn => {
  const [region, setRegion] = useState<Region | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [locationWatcherCleanup, setLocationWatcherCleanup] = useState<(() => void) | null>(null);

  // Refs for tracking user movement
  const previousPositionRef = useRef<Coordinate | null>(null);
  const lastSignificantHeadingRef = useRef<number>(0);
  const locationUpdateCounterRef = useRef<number>(0);

  /**
   * Initialize location tracking
   */
  const initializeLocation = useCallback(
    async (onInitialLocationReceived?: (location: Region) => void): Promise<boolean> => {
      try {
        console.log("Initializing location tracking...");

        // Request location permission first
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          Alert.alert(
            "Location Permission Required",
            "We need your location to show you nearby attractions."
          );
          return false;
        }

        console.log("Location permission granted, getting current location...");

        // First get current location immediately
        const currentLocation = await getCurrentLocation();
        if (currentLocation) {
          console.log("Initial location received:", currentLocation);
          setRegion(currentLocation);
          setUserLocation(currentLocation);

          if (onInitialLocationReceived) {
            onInitialLocationReceived(currentLocation);
          }
        } else {
          console.warn("Failed to get initial location");
        }

        console.log("Starting location watching...");

        // Now start watching for location updates
        const locationWatcher = await watchUserLocation(
          (locationUpdate: Region) => {
            // Only update if the movement is significant
            if (
              userLocation &&
              hasMovedSignificantly({
                latitude: locationUpdate.latitude,
                longitude: locationUpdate.longitude,
              })
            ) {
              console.log("Significant location update received:", locationUpdate);
              // Just update the user location, not the map region
              setUserLocation(locationUpdate);
            } else if (!userLocation) {
              // Always update if we don't have a location yet
              setUserLocation(locationUpdate);
            }
          },
          (error: Error) => {
            console.error("Error watching location:", error);
            Alert.alert("Location Error", "Could not track your location.");
          }
        );

        // Set cleanup function
        setLocationWatcherCleanup(() => locationWatcher);
        return true;
      } catch (error) {
        console.error("Error initializing location:", error);
        Alert.alert("Location Error", "Failed to initialize location services.");
        return false;
      }
    },
    [userLocation]
  );

  /**
   * Update user heading based on movement
   * UPDATED: Requires more movement to update heading (20m instead of previous value)
   */
  const updateHeadingFromMovement = useCallback((newLocation: Coordinate): boolean => {
    if (!previousPositionRef.current) {
      previousPositionRef.current = { ...newLocation };
      return false;
    }

    // Only calculate new heading if we've moved enough distance
    const distanceMoved = haversineDistance(
      previousPositionRef.current.latitude,
      previousPositionRef.current.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    if (distanceMoved >= HEADING_UPDATE_MIN_DISTANCE) {
      console.log(`Moved ${distanceMoved.toFixed(2)}m, updating heading...`);

      // Calculate heading based on movement
      const newHeading = calculateBearing(
        previousPositionRef.current.latitude,
        previousPositionRef.current.longitude,
        newLocation.latitude,
        newLocation.longitude
      );

      // Only update heading if it has changed significantly
      const headingDiff = Math.abs(newHeading - lastSignificantHeadingRef.current);
      if (headingDiff > MIN_HEADING_CHANGE) {
        console.log(
          `Heading changed by ${headingDiff.toFixed(2)} degrees, updating to ${newHeading.toFixed(
            2
          )}`
        );
        setUserHeading(newHeading);
        lastSignificantHeadingRef.current = newHeading;

        // Update previous position for next calculation
        previousPositionRef.current = { ...newLocation };
        return true;
      }

      // Still update position even if heading didn't change significantly
      previousPositionRef.current = { ...newLocation };
    }

    return false;
  }, []);

  /**
   * Check if user has reached a destination
   */
  const checkDestinationReached = useCallback(
    (destinationCoord: Coordinate, threshold: number): boolean => {
      if (!userLocation || !destinationCoord) return false;

      const distanceToDestination = haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        destinationCoord.latitude,
        destinationCoord.longitude
      );

      return distanceToDestination <= threshold;
    },
    [userLocation]
  );

  /**
   * Clean up location watcher
   */
  const cleanupLocationWatcher = useCallback((): void => {
    console.log("Cleaning up location watcher");
    if (locationWatcherCleanup) {
      locationWatcherCleanup();
    }
  }, [locationWatcherCleanup]);

  /**
   * Reset tracking state
   */
  const resetLocationTracking = useCallback((): void => {
    console.log("Resetting location tracking");
    previousPositionRef.current = null;
    lastSignificantHeadingRef.current = 0;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupLocationWatcher();
    };
  }, [cleanupLocationWatcher]);

  return {
    region,
    userLocation,
    userHeading,
    initializeLocation,
    updateHeadingFromMovement,
    checkDestinationReached,
    cleanupLocationWatcher,
    resetLocationTracking,
    previousPositionRef,
    lastSignificantHeadingRef,
    locationUpdateCounterRef,
    setUserLocation,
    setRegion,
  };
};

export default useMapLocation;
