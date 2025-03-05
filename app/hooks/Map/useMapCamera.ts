// useMapCamera.ts - Hook for managing map camera behavior
import { useRef, useCallback, useEffect } from "react";
import { Dimensions, Platform } from "react-native";
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
  isTransitioningRef: React.MutableRefObject<boolean>;
}

const useMapCamera = (): UseMapCameraReturn => {
  // Get screen dimensions for responsive calculations
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const aspectRatio = screenWidth / screenHeight;

  // Refs for camera state management
  const mapRef = useRef<MapView>(null);
  const routeOverviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cameraUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cameraUpdatePendingRef = useRef<boolean>(false);
  const lastCameraUpdateTimeRef = useRef<number>(0);
  const lastCameraHeadingRef = useRef<number>(0);
  const lastZoomLevelRef = useRef<number>(NAVIGATION_ZOOM_LEVEL);
  const initialRouteLoadedRef = useRef<boolean>(false);
  const isTransitioningRef = useRef<boolean>(false);

  // Platform-specific adjustments
  const isPlatformIOS = Platform.OS === "ios";

  /**
   * Show route overview to display the entire route
   * Uses fitToCoordinates for consistent display across devices
   */
  const showRouteOverview = useCallback(
    (
      userLocation: Coordinate,
      destinationCoordinate: Coordinate,
      setViewMode: (mode: string) => void
    ): void => {
      if (!mapRef.current || !userLocation || !destinationCoordinate) return;

      // Set transition state to true
      isTransitioningRef.current = true;

      // Set view mode to overview
      setViewMode("overview");

      // Calculate the distance between user and destination
      const routeDistance = haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        destinationCoordinate.latitude,
        destinationCoordinate.longitude
      );

      // Use fitToCoordinates to ensure the entire route is visible
      // This is more reliable across different screen sizes
      mapRef.current.fitToCoordinates([userLocation, destinationCoordinate], {
        edgePadding: {
          top: screenHeight * 0.2,
          right: screenWidth * 0.2,
          bottom: screenHeight * 0.2,
          left: screenWidth * 0.2,
        },
        animated: true,
      });

      // For devices where fitToCoordinates doesn't provide enough control,
      // we can manually set additional camera parameters
      setTimeout(() => {
        if (mapRef.current) {
          // Calculate appropriate zoom based on route distance and screen size
          const zoomLevel = calculateAppropriateZoom(routeDistance, aspectRatio);

          // Adjust pitch for better visibility
          const pitch = isPlatformIOS ? 10 : 5;

          mapRef.current.animateCamera(
            {
              pitch: pitch,
              heading: 0, // North up for overview
            },
            { duration: 500 }
          );

          // Store the zoom level for reference
          lastZoomLevelRef.current = zoomLevel;
        }
      }, 100);

      // Set transition state back to false after animation completes
      // Increased timeout to account for the longer second animation
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 1600);

      // Update the last camera update time to avoid immediate camera changes
      lastCameraUpdateTimeRef.current = Date.now();
    },
    [screenWidth, screenHeight, aspectRatio, isPlatformIOS]
  );

  /**
   * Calculate appropriate zoom level based on route distance and screen dimensions
   */
  const calculateAppropriateZoom = (distance: number, aspectRatio: number): number => {
    // Base calculation adjusted for screen aspect ratio
    let baseZoom = 15;

    if (distance > 5000) {
      baseZoom = 13;
    } else if (distance > 2000) {
      baseZoom = 14;
    } else if (distance > 1000) {
      baseZoom = 15;
    } else {
      baseZoom = 16;
    }

    // Apply platform-specific adjustments
    if (isPlatformIOS) {
      // iOS typically needs slightly different zoom levels
      baseZoom = baseZoom + 0.5;
    }

    // Adjust for very wide or tall screens
    if (aspectRatio > 2.0) {
      // Very tall screen - increase zoom slightly
      baseZoom += 0.5;
    } else if (aspectRatio < 0.5) {
      // Very wide screen - decrease zoom slightly
      baseZoom -= 0.5;
    }

    return baseZoom;
  };

  /**
   * Update camera to focus on user with improved responsiveness for different devices
   */
  const updateUserCamera = useCallback(
    (location: Coordinate, heading: number, forceUpdate = false, viewMode: string): boolean => {
      if (!mapRef.current || viewMode !== "follow") return false;

      if (!location) return false;

      // If a camera update is already pending, skip unless forced
      if (cameraUpdatePendingRef.current && !forceUpdate) return false;

      // Set transition state to true for forced updates (like mode switches)
      if (forceUpdate) {
        isTransitioningRef.current = true;
      }

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

      // Focus directly on user's position instead of looking ahead
      // We'll use the user's exact location to center the camera
      const userCoordinate = {
        latitude: location.latitude,
        longitude: location.longitude,
      };

      // Calculate device-appropriate zoom level
      const deviceAdjustment = isPlatformIOS ? 0.5 : 0;
      const closeUpZoom = NAVIGATION_ZOOM_LEVEL + 1 + deviceAdjustment;

      // Adjust altitude based on screen dimensions
      const altitudeBase = 100;
      const altitudeAdjustment = isPlatformIOS
        ? aspectRatio > 1.8
          ? 20
          : 0
        : aspectRatio > 1.8
        ? 30
        : 0;

      // Create camera configuration focused directly on user with device-specific parameters
      const camera: CameraConfig = {
        center: userCoordinate,
        heading: smoothedHeading,
        pitch: NAVIGATION_PITCH + (isPlatformIOS ? 5 : 8), // Platform-specific pitch
        altitude: altitudeBase - altitudeAdjustment,
        zoom: closeUpZoom,
      };

      // Log camera update for debugging
      console.log("Updating camera to follow mode:", {
        center: [userCoordinate.latitude.toFixed(5), userCoordinate.longitude.toFixed(5)],
        heading: smoothedHeading.toFixed(1),
        zoom: closeUpZoom,
        altitude: altitudeBase - altitudeAdjustment,
        platform: Platform.OS,
        aspectRatio: aspectRatio.toFixed(2),
      });

      // Animate camera with slower duration for smoother transition
      mapRef.current.animateCamera(camera, {
        duration: isPlatformIOS ? 800 : 600, // iOS often needs slightly slower animations
      });

      // Set transition state back to false after animation completes if this was a forced update
      if (forceUpdate) {
        setTimeout(
          () => {
            isTransitioningRef.current = false;
          },
          isPlatformIOS ? 900 : 700
        );
      }

      // Update tracking variables
      lastCameraUpdateTimeRef.current = now;
      lastCameraHeadingRef.current = smoothedHeading;
      cameraUpdatePendingRef.current = false;
      return true; // Indicate that update was performed
    },
    [aspectRatio, isPlatformIOS]
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
        isTransitioningRef.current = true;

        // Show overview first
        showRouteOverview(userLocation, destinationCoordinate, setViewMode);

        // Then switch to navigation view after a delay
        if (routeOverviewTimeoutRef.current) {
          clearTimeout(routeOverviewTimeoutRef.current);
        }

        routeOverviewTimeoutRef.current = setTimeout(() => {
          // Switch to follow mode
          setViewMode("follow");

          // Reset transition state after follow mode is set
          setTimeout(() => {
            isTransitioningRef.current = false;
          }, 700);
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
    isTransitioningRef.current = false;
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
    isTransitioningRef,
  };
};

export default useMapCamera;
