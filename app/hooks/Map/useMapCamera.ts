import { useRef, useCallback, useEffect } from "react";
import { Dimensions, Platform } from "react-native";
import {
  NAVIGATION_ZOOM_LEVEL,
  NAVIGATION_PITCH,
  CAMERA_UPDATE_THROTTLE,
  LOOK_AHEAD_DISTANCE,
  INITIAL_ROUTE_OVERVIEW_DURATION,
} from "../../constants/Map/mapConstants";
import { calculateLookAheadPosition, calcDist } from "../../utils/mapUtils";
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
  initialCameraSetRef: React.MutableRefObject<boolean>;
  lastCameraHeadingRef: React.MutableRefObject<number>;
  cameraUpdateTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  isTransitioningRef: React.MutableRefObject<boolean>;
}

const useMapCamera = (): UseMapCameraReturn => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const aspectRatio = screenWidth / screenHeight;
  const mapRef = useRef<MapView>();
  const routeOverviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cameraUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cameraUpdatePendingRef = useRef<boolean>(false);
  const lastCameraUpdateTimeRef = useRef<number>(0);
  const lastCameraHeadingRef = useRef<number>(0);
  const lastZoomLevelRef = useRef<number>(NAVIGATION_ZOOM_LEVEL);
  const initialRouteLoadedRef = useRef<boolean>(false);
  const initialCameraSetRef = useRef<boolean>(false);
  const isTransitioningRef = useRef<boolean>(false);
  const isPlatformIOS = Platform.OS === "ios";

  const showRouteOverview = useCallback(
    (
      userLocation: Coordinate,
      destinationCoordinate: Coordinate,
      setViewMode: (mode: string) => void
    ): void => {
      if (!mapRef.current || !userLocation || !destinationCoordinate) return;

      isTransitioningRef.current = true;
      setViewMode("overview");

      const routeDistance = calcDist(
        userLocation.latitude,
        userLocation.longitude,
        destinationCoordinate.latitude,
        destinationCoordinate.longitude
      );

      console.log("Route distance:", routeDistance, "meters");

      const midpoint = {
        latitude: userLocation.latitude * 0.5 + destinationCoordinate.latitude * 0.5,
        longitude: userLocation.longitude * 0.5 + destinationCoordinate.longitude * 0.5,
      };
      const edgePaddingPercent = Math.min(0.25, Math.max(0.15, routeDistance / 50000));
      mapRef.current.fitToCoordinates([userLocation, destinationCoordinate], {
        edgePadding: {
          top: screenHeight * edgePaddingPercent,
          right: screenWidth * edgePaddingPercent,
          bottom: screenHeight * edgePaddingPercent,
          left: screenWidth * edgePaddingPercent,
        },
        animated: true,
      });

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.getCamera().then((currentCamera) => {
            const zoomLevel = calculateAppropriateZoom(routeDistance, aspectRatio);
            const pitch = isPlatformIOS ? 8 : 5;
            const camera = {
              center: midpoint,
              heading: 0,
              pitch: pitch,
              zoom: currentCamera.zoom ? Math.max(currentCamera.zoom, zoomLevel) : zoomLevel,
            };

            console.log("Overview camera adjustment:", {
              routeDistance,
              targetZoom: zoomLevel,
              actualZoom: camera.zoom,
              platform: Platform.OS,
            });
            mapRef.current.animateCamera(camera, { duration: 700 });
            lastZoomLevelRef.current = camera.zoom;
          });
        }
      }, 300);
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 1200);
      lastCameraUpdateTimeRef.current = Date.now();
    },
    [screenWidth, screenHeight, aspectRatio, isPlatformIOS]
  );

  /**
   * Calculate appropriate zoom level based on route distance - revised for better scaling
   */
  const calculateAppropriateZoom = (distance: number, aspectRatio: number): number => {
    let baseZoom = 16;
    if (distance > 10000) {
      baseZoom = 13;
    } else if (distance > 5000) {
      baseZoom = 13.5;
    } else if (distance > 3000) {
      baseZoom = 14;
    } else if (distance > 2000) {
      baseZoom = 14.5;
    } else if (distance > 1000) {
      baseZoom = 15;
    } else if (distance > 500) {
      baseZoom = 15.5;
    } else if (distance > 250) {
      baseZoom = 16;
    } else {
      baseZoom = 16.5;
    }

    if (isPlatformIOS) {
      baseZoom += 0.2;
    }

    if (aspectRatio > 2.0) {
      baseZoom += 0.3;
    } else if (aspectRatio < 0.5) {
      baseZoom -= 0.3;
    }

    const smallVariation = Math.random() * 0.2 - 0.1;

    return baseZoom + smallVariation;
  };

  const updateUserCamera = useCallback(
    (location: Coordinate, heading: number, forceUpdate = false, viewMode: string): boolean => {
      if (!mapRef.current || viewMode !== "follow") return false;

      if (!location) return false;

      if (cameraUpdatePendingRef.current && !forceUpdate) return false;

      if (forceUpdate) {
        isTransitioningRef.current = true;
      }

      const now = Date.now();
      if (!forceUpdate && now - lastCameraUpdateTimeRef.current < CAMERA_UPDATE_THROTTLE) {
        if (!cameraUpdatePendingRef.current) {
          cameraUpdatePendingRef.current = true;
          cameraUpdateTimeoutRef.current = setTimeout(() => {
            cameraUpdatePendingRef.current = false;
          }, CAMERA_UPDATE_THROTTLE);
        }
        return false;
      }
      const headingDifference = Math.abs(heading - lastCameraHeadingRef.current);
      const smoothedHeading = headingDifference > 15 ? heading : lastCameraHeadingRef.current;
      const userCoordinate = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      const deviceAdjustment = isPlatformIOS ? 0.5 : 0;
      const closeUpZoom = NAVIGATION_ZOOM_LEVEL + 1 + deviceAdjustment;
      const altitudeBase = 100;
      const altitudeAdjustment = isPlatformIOS
        ? aspectRatio > 1.8
          ? 20
          : 0
        : aspectRatio > 1.8
        ? 30
        : 0;

      const camera: CameraConfig = {
        center: userCoordinate,
        heading: smoothedHeading,
        pitch: NAVIGATION_PITCH + (isPlatformIOS ? 5 : 8),
        altitude: altitudeBase - altitudeAdjustment,
        zoom: closeUpZoom,
      };

      console.log("Updating camera to follow mode:", {
        center: [userCoordinate.latitude.toFixed(5), userCoordinate.longitude.toFixed(5)],
        heading: smoothedHeading.toFixed(1),
        zoom: closeUpZoom,
        altitude: altitudeBase - altitudeAdjustment,
        platform: Platform.OS,
        aspectRatio: aspectRatio.toFixed(2),
      });

      mapRef.current.animateCamera(camera, {
        duration: isPlatformIOS ? 800 : 600,
      });

      if (forceUpdate) {
        setTimeout(
          () => {
            isTransitioningRef.current = false;
          },
          isPlatformIOS ? 900 : 700
        );
      }

      initialCameraSetRef.current = true;

      lastCameraUpdateTimeRef.current = now;
      lastCameraHeadingRef.current = smoothedHeading;
      cameraUpdatePendingRef.current = false;
      return true;
    },
    [aspectRatio, isPlatformIOS]
  );

  const focusOnUserLocation = useCallback(
    (userLocation: Coordinate, animate = true, zoomLevel = 15): void => {
      if (!mapRef.current || !userLocation) return;

      console.log("Focusing on user location:", userLocation);

      const region = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      if (animate) {
        mapRef.current.animateToRegion(region, 500);
      } else {
        mapRef.current.setRegion(region);
      }
      initialCameraSetRef.current = true;
    },
    []
  );

  const toggleViewMode = useCallback(
    (
      viewMode: string,
      setViewMode: (mode: string) => void,
      userLocation: Coordinate,
      userHeading: number
    ): void => {
      if (viewMode === "follow") {
        setViewMode("overview");
      } else {
        setViewMode("follow");
      }
    },
    []
  );

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

        setViewMode("follow");
        setTimeout(() => {
          updateUserCamera(userLocation, userHeading, true, "follow");
          setTimeout(() => {
            isTransitioningRef.current = false;
          }, 700);
        }, 300);
        initialCameraSetRef.current = true;
        return true;
      }
      return false;
    },
    [updateUserCamera]
  );

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
