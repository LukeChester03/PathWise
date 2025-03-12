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
  focusOnUserLocation: (userLocation: Coordinate, animate?: boolean, zoomLevel?: number) => void;
  cleanupCameraTimeouts: () => void;
  resetCameraState: () => void;
  initialRouteLoadedRef: React.MutableRefObject<boolean>;
  initialCameraSetRef: React.MutableRefObject<boolean>; // New ref for tracking initial camera setup
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
  const initialCameraSetRef = useRef<boolean>(false); // New ref to track if camera has been initially focused on user
  const isTransitioningRef = useRef<boolean>(false);

  // Platform-specific adjustments
  const isPlatformIOS = Platform.OS === "ios";

  /**
   * Show route overview to display the entire route
   * Improved to prevent excessive zoom-out
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

      console.log("Route distance:", routeDistance, "meters");

      // Calculate a midpoint with a slight bias toward destination for better centering
      const midpoint = {
        latitude: userLocation.latitude * 0.5 + destinationCoordinate.latitude * 0.5,
        longitude: userLocation.longitude * 0.5 + destinationCoordinate.longitude * 0.5,
      };

      // For very short routes, we want to keep a minimum reasonable padding
      // For longer routes, we scale the padding based on distance
      const edgePaddingPercent = Math.min(0.25, Math.max(0.15, routeDistance / 50000));

      // Use fitToCoordinates with moderate padding
      // Balanced approach between showing the route and not zooming out too far
      mapRef.current.fitToCoordinates([userLocation, destinationCoordinate], {
        edgePadding: {
          top: screenHeight * edgePaddingPercent,
          right: screenWidth * edgePaddingPercent,
          bottom: screenHeight * edgePaddingPercent,
          left: screenWidth * edgePaddingPercent,
        },
        animated: true,
      });

      // After fitToCoordinates, apply additional camera adjustments with better control
      setTimeout(() => {
        if (mapRef.current) {
          // Get current camera settings to make relative adjustments
          mapRef.current.getCamera().then((currentCamera) => {
            // Calculate a more appropriate zoom level based on distance
            // This is a dynamic approach that prevents excessive zoom-out
            const zoomLevel = calculateAppropriateZoom(routeDistance, aspectRatio);

            // Moderate pitch for better route visibility without excessive perspective
            const pitch = isPlatformIOS ? 8 : 5;

            // New camera configuration that prioritizes keeping the route visible
            // without excessive zoom-out
            const camera = {
              center: midpoint, // Use the calculated midpoint
              heading: 0, // North up for overview
              pitch: pitch,
              zoom: currentCamera.zoom
                ? // If the current zoom is more zoomed in than our target, keep it
                  Math.max(currentCamera.zoom, zoomLevel)
                : zoomLevel,
              // Don't set altitude if we're setting zoom level
            };

            console.log("Overview camera adjustment:", {
              routeDistance,
              targetZoom: zoomLevel,
              actualZoom: camera.zoom,
              platform: Platform.OS,
            });

            // Apply camera adjustments with a smooth animation
            mapRef.current.animateCamera(camera, { duration: 700 });

            // Store the zoom level for reference
            lastZoomLevelRef.current = camera.zoom;
          });
        }
      }, 300); // Slightly longer delay to ensure fitToCoordinates completes

      // Set transition state back to false after all animations complete
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 1200);

      // Update the last camera update time to avoid immediate camera changes
      lastCameraUpdateTimeRef.current = Date.now();
    },
    [screenWidth, screenHeight, aspectRatio, isPlatformIOS]
  );

  /**
   * Calculate appropriate zoom level based on route distance - revised for better scaling
   */
  const calculateAppropriateZoom = (distance: number, aspectRatio: number): number => {
    // Revised base zoom calculation with less aggressive scaling for distance
    // Higher numbers mean more zoomed in
    let baseZoom = 16; // Start at a reasonably zoomed in level

    // More graduated zoom levels for different distances
    if (distance > 10000) {
      // > 10km
      baseZoom = 13;
    } else if (distance > 5000) {
      // 5-10km
      baseZoom = 13.5;
    } else if (distance > 3000) {
      // 3-5km
      baseZoom = 14;
    } else if (distance > 2000) {
      // 2-3km
      baseZoom = 14.5;
    } else if (distance > 1000) {
      // 1-2km
      baseZoom = 15;
    } else if (distance > 500) {
      // 500m-1km
      baseZoom = 15.5;
    } else if (distance > 250) {
      // 250-500m
      baseZoom = 16;
    } else {
      // < 250m
      baseZoom = 16.5; // Closer zoom for very short distances
    }

    // Platform-specific adjustments
    if (isPlatformIOS) {
      // iOS typically renders maps differently
      baseZoom += 0.2;
    }

    // Adjust for very wide or tall screens, but with smaller adjustments
    if (aspectRatio > 2.0) {
      // Very tall screen
      baseZoom += 0.3;
    } else if (aspectRatio < 0.5) {
      // Very wide screen
      baseZoom -= 0.3;
    }

    // Add some small random variation to prevent getting stuck at edge cases
    const smallVariation = Math.random() * 0.2 - 0.1;

    return baseZoom + smallVariation;
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

      // Mark that initial camera has been set
      initialCameraSetRef.current = true;

      // Update tracking variables
      lastCameraUpdateTimeRef.current = now;
      lastCameraHeadingRef.current = smoothedHeading;
      cameraUpdatePendingRef.current = false;
      return true; // Indicate that update was performed
    },
    [aspectRatio, isPlatformIOS]
  );

  /**
   * New function to focus specifically on user location for initial map load
   */
  const focusOnUserLocation = useCallback(
    (userLocation: Coordinate, animate = true, zoomLevel = 15): void => {
      if (!mapRef.current || !userLocation) return;

      console.log("Focusing on user location:", userLocation);

      const region = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01, // Moderate zoom level
        longitudeDelta: 0.01,
      };

      if (animate) {
        mapRef.current.animateToRegion(region, 500);
      } else {
        mapRef.current.setRegion(region);
      }

      // Mark that initial camera has been set
      initialCameraSetRef.current = true;
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
   * Modified to start in follow mode with immediate view of the user
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

        // Start immediately in follow mode
        setViewMode("follow");

        // Force an immediate camera update to focus on user
        setTimeout(() => {
          // Ensure we update the camera to focus on the user
          updateUserCamera(userLocation, userHeading, true, "follow");

          // Reset transition state after the initial camera setup
          setTimeout(() => {
            isTransitioningRef.current = false;
          }, 700);
        }, 300);

        // Mark that initial camera has been set
        initialCameraSetRef.current = true;
        return true;
      }
      return false;
    },
    [updateUserCamera]
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
    // Don't reset initialCameraSetRef here as we still want to remember that the camera
    // was initially set to the user location during this session
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
    focusOnUserLocation,
    cleanupCameraTimeouts,
    resetCameraState,
    initialRouteLoadedRef,
    initialCameraSetRef,
    lastCameraHeadingRef,
    cameraUpdateTimeoutRef,
    isTransitioningRef,
  };
};

export default useMapCamera;
