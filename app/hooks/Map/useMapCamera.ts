// useMapCamera.ts - Hook for managing map camera behavior
import { useRef, useCallback } from "react";
import {
  NAVIGATION_ZOOM_LEVEL,
  NAVIGATION_PITCH,
  CAMERA_UPDATE_THROTTLE,
  LOOK_AHEAD_DISTANCE,
  INITIAL_ROUTE_OVERVIEW_DURATION,
} from "../../constants/Map/mapConstants";
import { calculateLookAheadPosition, haversineDistance } from "../../utils/mapUtils";
import { Coordinate, CameraConfig } from "../../types/MapTypes";
import MapView from "react-native-maps";

export interface UseMapCameraReturn {
  mapRef: React.RefObject<MapView>;
  showRouteOverview: (
    userLocation: Coordinate,
    destinationCoordinate: Coordinate,
    setViewMode: (mode: string) => void
  ) => void;
  updateUserCamera: (
    location: Coordinate,
    heading: number,
    forceUpdate: boolean,
    viewMode: string
  ) => boolean;
  toggleViewMode: (
    viewMode: string,
    setViewMode: (mode: string) => void,
    userLocation: Coordinate,
    userHeading: number
  ) => void;
  setupInitialRouteView: (
    userLocation: Coordinate,
    destinationCoordinate: Coordinate | null,
    setViewMode: (mode: string) => void,
    userHeading: number
  ) => boolean;
  cleanupCameraTimeouts: () => void;
  resetCameraState: () => void;
  initialRouteLoadedRef: React.MutableRefObject<boolean>;
  lastCameraHeadingRef: React.MutableRefObject<number>;
  cameraUpdateTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

const useMapCamera = (): UseMapCameraReturn => {
  // Refs for camera state management
  const mapRef = useRef<MapView>(null);
  const routeOverviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cameraUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cameraUpdatePendingRef = useRef<boolean>(false);
  const lastCameraUpdateTimeRef = useRef<number>(0);
  const lastCameraHeadingRef = useRef<number>(0);
  const lastZoomLevelRef = useRef<number>(NAVIGATION_ZOOM_LEVEL);
  const initialRouteLoadedRef = useRef<boolean>(false);

  /**
   * Show route overview to display the entire route
   */
  const showRouteOverview = useCallback(
    (
      userLocation: Coordinate,
      destinationCoordinate: Coordinate,
      setViewMode: (mode: string) => void
    ): void => {
      if (!mapRef.current || !userLocation || !destinationCoordinate) return;

      // Set view mode to overview
      setViewMode("overview");

      // Calculate the distance between user and destination
      const routeDistance = haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        destinationCoordinate.latitude,
        destinationCoordinate.longitude
      );

      // Calculate a midpoint slightly weighted toward destination
      const bias = 0.6; // Consistent bias value for predictability
      const midpoint = {
        latitude: userLocation.latitude * (1 - bias) + destinationCoordinate.latitude * bias,
        longitude: userLocation.longitude * (1 - bias) + destinationCoordinate.longitude * bias,
      };

      // Fixed altitude based on distance - more consistent camera behavior
      const altitude = Math.min(Math.max(2500, routeDistance * 2.5), 5000);

      // Determine zoom level based on distance - more gradual transitions
      const zoomLevel =
        routeDistance > 5000 ? 12 : routeDistance > 2000 ? 13 : routeDistance > 1000 ? 14 : 15;

      // Store the zoom level for smoother transitions back to navigation view
      lastZoomLevelRef.current = zoomLevel;

      // Create camera for overview - showing the whole route
      const camera: CameraConfig = {
        center: midpoint,
        heading: 0, // Always North up for overview
        pitch: 0, // No pitch for consistency in overview
        altitude: altitude,
        zoom: zoomLevel,
      };

      // Log camera update for debugging
      console.log("Updating camera to overview mode:", camera);

      // Animate camera with longer duration for smoother transition
      mapRef.current.animateCamera(camera, { duration: 1500 });

      // Update the last camera update time to avoid immediate camera changes
      lastCameraUpdateTimeRef.current = Date.now();
    },
    []
  );

  /**
   * Update camera to focus on user with stability improvements
   */
  const updateUserCamera = useCallback(
    (location: Coordinate, heading: number, forceUpdate = false, viewMode: string): boolean => {
      if (!mapRef.current || viewMode !== "follow") return false;

      if (!location) return false;

      // If a camera update is already pending, skip unless forced
      if (cameraUpdatePendingRef.current && !forceUpdate) return false;

      // Throttle camera updates to prevent jerky motion
      const now = Date.now();
      if (!forceUpdate && now - lastCameraUpdateTimeRef.current < CAMERA_UPDATE_THROTTLE) {
        // Schedule an update for later if we're throttling
        if (!cameraUpdatePendingRef.current) {
          cameraUpdatePendingRef.current = true;
          cameraUpdateTimeoutRef.current = setTimeout(() => {
            cameraUpdatePendingRef.current = false;
            // At this point, we'd call updateUserCamera again with the latest values
            // This is handled by the caller
          }, CAMERA_UPDATE_THROTTLE);
        }
        return false; // Indicate that update was throttled
      }

      // Apply heading smoothing to reduce jitter
      // Only significantly different headings trigger camera updates
      const headingDifference = Math.abs(heading - lastCameraHeadingRef.current);
      const smoothedHeading = headingDifference > 15 ? heading : lastCameraHeadingRef.current;

      // Calculate look-ahead position with consistent distance
      const lookAheadCoordinate = calculateLookAheadPosition(
        location.latitude,
        location.longitude,
        smoothedHeading,
        LOOK_AHEAD_DISTANCE
      );

      // Create camera configuration focused on user with consistent parameters
      const camera: CameraConfig = {
        center: lookAheadCoordinate,
        heading: smoothedHeading,
        pitch: NAVIGATION_PITCH,
        altitude: 1300, // Consistent altitude for stability
        zoom: NAVIGATION_ZOOM_LEVEL,
      };

      // Log camera update for debugging
      console.log("Updating camera to follow mode:", {
        center: [lookAheadCoordinate.latitude.toFixed(5), lookAheadCoordinate.longitude.toFixed(5)],
        heading: smoothedHeading.toFixed(1),
        zoom: NAVIGATION_ZOOM_LEVEL,
      });

      // Animate camera with slower duration for smoother transition
      mapRef.current.animateCamera(camera, { duration: 1200 });

      // Update tracking variables
      lastCameraUpdateTimeRef.current = now;
      lastCameraHeadingRef.current = smoothedHeading;
      cameraUpdatePendingRef.current = false;
      return true; // Indicate that update was performed
    },
    []
  );

  /**
   * Toggle between navigation and overview modes with improved transitions
   */
  const toggleViewMode = useCallback(
    (
      viewMode: string,
      setViewMode: (mode: string) => void,
      userLocation: Coordinate,
      userHeading: number
    ): void => {
      if (viewMode === "follow") {
        // Switching to overview mode
        setViewMode("overview");
      } else {
        // Switching to follow mode - use a delay for smoother transition
        setViewMode("follow");
      }
    },
    []
  );

  /**
   * Setup initial route overview and follow transition
   */
  const setupInitialRouteView = useCallback(
    (
      userLocation: Coordinate,
      destinationCoordinate: Coordinate | null,
      setViewMode: (mode: string) => void,
      userHeading: number
    ): boolean => {
      if (!initialRouteLoadedRef.current && destinationCoordinate) {
        initialRouteLoadedRef.current = true;

        // Show overview first
        showRouteOverview(userLocation, destinationCoordinate, setViewMode);

        // Then switch to navigation view after a delay
        if (routeOverviewTimeoutRef.current) {
          clearTimeout(routeOverviewTimeoutRef.current);
        }

        routeOverviewTimeoutRef.current = setTimeout(() => {
          // Switch to follow mode
          setViewMode("follow");
        }, INITIAL_ROUTE_OVERVIEW_DURATION);

        return true;
      }
      return false;
    },
    [showRouteOverview]
  );

  /**
   * Clean up any pending timeouts
   */
  const cleanupCameraTimeouts = useCallback((): void => {
    if (routeOverviewTimeoutRef.current) {
      clearTimeout(routeOverviewTimeoutRef.current);
      routeOverviewTimeoutRef.current = null;
    }
    if (cameraUpdateTimeoutRef.current) {
      clearTimeout(cameraUpdateTimeoutRef.current);
      cameraUpdateTimeoutRef.current = null;
    }
  }, []);

  /**
   * Reset camera state when journey ends
   */
  const resetCameraState = useCallback((): void => {
    initialRouteLoadedRef.current = false;
    lastCameraHeadingRef.current = 0;
    cameraUpdatePendingRef.current = false;
    cleanupCameraTimeouts();
  }, [cleanupCameraTimeouts]);

  return {
    mapRef,
    showRouteOverview,
    updateUserCamera,
    toggleViewMode,
    setupInitialRouteView,
    cleanupCameraTimeouts,
    resetCameraState,
    initialRouteLoadedRef,
    lastCameraHeadingRef,
    cameraUpdateTimeoutRef,
  };
};

export default useMapCamera;
