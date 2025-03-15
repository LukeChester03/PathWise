// useMapPlaces.ts - Enhanced hook for managing places data with on-demand details fetching
import { useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo"; // Add NetInfo import for connection checks
import {
  fetchNearbyPlaces,
  fetchPlaceDetailsOnDemand,
} from "../../controllers/Map/placesController";
import { fetchRoute } from "../../controllers/Map/routesController";
import {
  checkVisitedPlaces,
  getVisitedPlaceDetails,
} from "../../handlers/Map/visitedPlacesHandlers";
import { isPlaceVisited } from "../../controllers/Map/visitedPlacesController";
import { haversineDistance } from "../../utils/mapUtils";
import { DEFAULT_CIRCLE_RADIUS, MARKER_REFRESH_THRESHOLD } from "../../constants/Map/mapConstants";
import {
  Place,
  Coordinate,
  Region,
  VisitedPlaceDetails,
  PlaceSelectionResult,
  NearbyPlacesResponse,
  TravelMode,
} from "../../types/MapTypes";

export interface UseMapPlacesReturn {
  places: Place[];
  selectedPlace: Place | null;
  routeCoordinates: Coordinate[];
  travelTime: string | null;
  distance: string | null;
  travelMode: TravelMode;
  routeKey: number;
  circleRadius: number;
  visitedPlaceDetails: VisitedPlaceDetails | null;
  destinationCoordinateRef: React.MutableRefObject<Coordinate | null>;
  lastRefreshPositionRef: React.MutableRefObject<Coordinate | null>;
  refreshNearbyPlaces: (latitude: number, longitude: number) => Promise<boolean>;
  checkAndRefreshPlaces: (newLocation: Coordinate) => boolean;
  handlePlaceSelection: (
    place: Place,
    userLocation: Coordinate | null,
    region: Region | null
  ) => Promise<PlaceSelectionResult | false>;
  getRouteInfo: (
    place: Place,
    userLocation: Coordinate | null,
    region: Region | null
  ) => Promise<boolean>;
  getMarkerColor: (place: Place, colors: Record<string, string>) => string;
  resetPlacesAndRoutes: () => void;
  setVisitedPlaceDetails: React.Dispatch<React.SetStateAction<VisitedPlaceDetails | null>>;
  setSelectedPlace: React.Dispatch<React.SetStateAction<Place | null>>;
  initialLoadingComplete: boolean;
  updatePlaces: (newPlaces: Place[]) => void;
  isLoadingDetails: boolean; // Added to track when details are being loaded
}

const useMapPlaces = (): UseMapPlacesReturn => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [travelTime, setTravelTime] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>("walking");
  const [routeKey, setRouteKey] = useState<number>(0);
  const [circleRadius, setCircleRadius] = useState<number>(DEFAULT_CIRCLE_RADIUS);
  const [isRefreshingPlaces, setIsRefreshingPlaces] = useState<boolean>(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false); // New state for tracking details loading
  const [initialLoadingComplete, setInitialLoadingComplete] = useState<boolean>(false);
  const [visitedPlaceDetails, setVisitedPlaceDetails] = useState<VisitedPlaceDetails | null>(null);

  // Refs for tracking places refresh
  const lastRefreshPositionRef = useRef<Coordinate | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const destinationCoordinateRef = useRef<Coordinate | null>(null);
  // Add a ref to track details fetch attempts to prevent duplicate calls
  const detailsFetchingRef = useRef<Set<string>>(new Set());

  /**
   * Load nearby places based on coordinates
   * ENHANCED: More conservative refresh strategy, better logging
   */
  const refreshNearbyPlaces = useCallback(
    async (latitude: number, longitude: number): Promise<boolean> => {
      if (isRefreshingPlaces) {
        console.log("[useMapPlaces] Already refreshing places, skipping");
        return false;
      }

      try {
        console.log(
          `[useMapPlaces] Refreshing nearby places at ${latitude.toFixed(6)}, ${longitude.toFixed(
            6
          )}`
        );
        setIsRefreshingPlaces(true);

        // Check network connectivity first
        const networkState = await NetInfo.fetch();
        if (!networkState.isConnected) {
          console.log("[useMapPlaces] No network connection, using cached places");
          // If we have places already, don't clear them - just use what we have
          if (places.length > 0) {
            setIsRefreshingPlaces(false);
            return true;
          }
        }

        // Get places using the updated controller that returns places and furthestDistance
        const placesResponse: NearbyPlacesResponse = await fetchNearbyPlaces(latitude, longitude);

        console.log(
          `[useMapPlaces] Fetched ${placesResponse.places.length} places with radius ${placesResponse.furthestDistance}m`
        );

        // Set the circle radius based on the furthest place
        setCircleRadius(placesResponse.furthestDistance);

        if (placesResponse.places && placesResponse.places.length > 0) {
          // Check which places have been visited before
          const placesWithVisitedStatus = await checkVisitedPlaces(placesResponse.places);

          // Keep selected place in the list if it exists
          if (selectedPlace) {
            const selectedPlaceExists = placesWithVisitedStatus.some(
              (place: any) => place.place_id === selectedPlace.place_id
            );

            if (!selectedPlaceExists) {
              // If the selected place isn't in the new list, add it
              const selectedWithVisitedStatus = await checkVisitedPlaces([selectedPlace]);
              setPlaces([...placesWithVisitedStatus, ...selectedWithVisitedStatus]);
            } else {
              setPlaces(placesWithVisitedStatus);
            }
          } else {
            setPlaces(placesWithVisitedStatus);
          }

          // Log the types of places received for debugging
          const placeTypes = placesWithVisitedStatus
            .map((p) => p.types?.join(", ") || "no-type")
            .slice(0, 3);
          console.log(`[useMapPlaces] Sample place types: ${placeTypes.join(" | ")}`);
        } else if (placesResponse.places && placesResponse.places.length === 0) {
          // If no places found, keep selected place if it exists
          if (selectedPlace) {
            const selectedWithVisitedStatus = await checkVisitedPlaces([selectedPlace]);
            setPlaces(selectedWithVisitedStatus);
          } else {
            setPlaces([]);
          }
          console.log("[useMapPlaces] No places found in the area");
        }

        lastRefreshPositionRef.current = { latitude, longitude };
        lastRefreshTimeRef.current = Date.now();

        // Mark initial loading as complete
        if (!initialLoadingComplete) {
          setInitialLoadingComplete(true);
        }

        return true;
      } catch (error) {
        console.error("[useMapPlaces] Error refreshing nearby places:", error);

        // Still mark initial loading as complete even if there was an error
        if (!initialLoadingComplete) {
          setInitialLoadingComplete(true);
        }

        return false;
      } finally {
        setIsRefreshingPlaces(false);
      }
    },
    [selectedPlace, isRefreshingPlaces, initialLoadingComplete, places.length]
  );

  /**
   * Check if we should refresh places based on user movement
   * ENHANCED: Even more conservative refreshes to minimize API calls
   */
  const checkAndRefreshPlaces = useCallback(
    (newLocation: Coordinate): boolean => {
      // Don't try to refresh if initial loading isn't complete or if lastRefreshPosition isn't set
      if (!initialLoadingComplete || !lastRefreshPositionRef.current) return false;

      const currentTime = Date.now();
      const timeSinceLastRefresh = currentTime - lastRefreshTimeRef.current;

      // ENHANCED: Even more conservative - increase to 2 minutes minimum between refreshes
      // Only refresh if enough time has passed since the last refresh (120 seconds minimum)
      if (timeSinceLastRefresh < 120000) {
        return false;
      }

      const distance = haversineDistance(
        lastRefreshPositionRef.current.latitude,
        lastRefreshPositionRef.current.longitude,
        newLocation.latitude,
        newLocation.longitude
      );

      // ENHANCED: Even more conservative - only refresh if moved 90% of circle radius
      if (distance > circleRadius * 0.9) {
        console.log(
          `[useMapPlaces] User moved ${distance.toFixed(0)}m (${(distance / 1000).toFixed(
            2
          )}km), refreshing places`
        );
        refreshNearbyPlaces(newLocation.latitude, newLocation.longitude);
        return true;
      }

      return false;
    },
    [refreshNearbyPlaces, initialLoadingComplete, circleRadius]
  );

  /**
   * Get route information for a selected place
   */
  const getRouteInfo = useCallback(
    async (
      place: Place,
      userLocation: Coordinate | null,
      region: Region | null
    ): Promise<boolean> => {
      try {
        console.log(`[useMapPlaces] Getting route to ${place.name}`);

        const origin = `${userLocation?.latitude || region?.latitude},${
          userLocation?.longitude || region?.longitude
        }`;
        const destination = `${place.geometry.location.lat},${place.geometry.location.lng}`;

        // Fetch route details with travel mode determination
        const routeResult = await fetchRoute(origin, destination);

        if (routeResult) {
          const {
            coords,
            duration,
            distance: distanceKm,
            travelMode: routeTravelMode,
          } = routeResult;

          // Log the detected travel mode and distance
          console.log(
            `[useMapPlaces] Route calculation: ${distanceKm.toFixed(
              1
            )}km, mode: ${routeTravelMode}, time: ${duration}`
          );

          setRouteCoordinates(coords);
          setTravelTime(duration);
          setDistance(distanceKm.toFixed(1) + " km");

          // Set destination coordinate
          if (place?.geometry?.location) {
            destinationCoordinateRef.current = {
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            };
          }

          // Set travel mode - restrict to just walking or driving
          if (routeTravelMode === "bicycling" || routeTravelMode === "transit") {
            // Map other modes to driving for simplicity
            setTravelMode("driving");
          } else {
            setTravelMode(routeTravelMode);
          }

          // Force route recalculation by updating the key
          setRouteKey((prev) => prev + 1);

          return true;
        } else {
          console.warn("[useMapPlaces] Could not calculate a route to this destination");
          return false;
        }
      } catch (error) {
        console.error("[useMapPlaces] Error getting route:", error);
        return false;
      }
    },
    []
  );

  /**
   * Fetch detailed place information
   * NEW: Dedicated function for fetching place details that ensures we only fetch once
   */
  const fetchPlaceDetails = useCallback(
    async (place: Place): Promise<Place | null> => {
      // Skip if already fetching or if already has full details
      if (detailsFetchingRef.current.has(place.place_id) || place.hasFullDetails) {
        console.log(`[useMapPlaces] Already fetching or has details for ${place.name}, skipping`);
        return null;
      }

      try {
        // Mark as fetching to prevent duplicate calls
        detailsFetchingRef.current.add(place.place_id);
        setIsLoadingDetails(true);

        console.log(`[useMapPlaces] Fetching full details for ${place.name}`);

        // Check connectivity
        const networkState = await NetInfo.fetch();
        if (!networkState.isConnected) {
          console.log("[useMapPlaces] No network connection, using basic place info");
          detailsFetchingRef.current.delete(place.place_id);
          setIsLoadingDetails(false);
          return null;
        }

        // Use the enhanced fetchPlaceDetailsOnDemand which checks Firebase first
        const detailedPlace = await fetchPlaceDetailsOnDemand(place.place_id);

        if (detailedPlace) {
          console.log(`[useMapPlaces] Successfully fetched details for ${detailedPlace.name}`);

          // If our selected place is still the same, update it
          if (selectedPlace?.place_id === place.place_id) {
            setSelectedPlace(detailedPlace);
          }

          // Also update in the main places array
          setPlaces((prevPlaces) =>
            prevPlaces.map((p) => (p.place_id === detailedPlace.place_id ? detailedPlace : p))
          );

          return detailedPlace;
        }

        return null;
      } catch (error) {
        console.error(`[useMapPlaces] Error fetching details for ${place.name}:`, error);
        return null;
      } finally {
        // Clean up
        detailsFetchingRef.current.delete(place.place_id);
        setIsLoadingDetails(false);
      }
    },
    [selectedPlace?.place_id]
  );

  /**
   * Handle place selection
   * ENHANCED: Always fetch full details when a marker is clicked
   */
  const handlePlaceSelection = useCallback(
    async (
      place: Place,
      userLocation: Coordinate | null,
      region: Region | null
    ): Promise<PlaceSelectionResult | false> => {
      if (!userLocation && !region) {
        Alert.alert("Location Error", "Unable to determine your current location.");
        return false;
      }

      // Set the selected place with basic info first for immediate feedback
      setSelectedPlace(place);
      console.log(`[useMapPlaces] Selected place: ${place.name}`);

      try {
        // Check if this place is already visited and fetch details if necessary
        const isVisited = await isPlaceVisited(place.place_id);
        console.log(`[useMapPlaces] Place visited status: ${isVisited}`);

        // For visited places, get the full details from the database
        if (isVisited) {
          console.log("[useMapPlaces] Selected place has been discovered:", place.name);

          // Fetch the visited place details from the controller
          const visitedDetails = await getVisitedPlaceDetails(place.place_id);

          if (visitedDetails) {
            // Store the full details for use in the DiscoveredCard
            setVisitedPlaceDetails(visitedDetails);

            // Still get route info for reference
            await getRouteInfo(place, userLocation, region);

            // ENHANCED: Always fetch full details from Google/Firebase in background
            // This ensures our database stays updated with the latest info
            fetchPlaceDetails(place).catch((err) =>
              console.warn("[useMapPlaces] Background fetch error:", err)
            );

            return {
              isDiscovered: true,
              isAlreadyAt: false,
              details: visitedDetails,
            };
          }
        }

        // If we get here, place is not visited or we couldn't get details
        if (place.isVisited === true) {
          const visitedDetails = await getVisitedPlaceDetails(place.place_id);
          setVisitedPlaceDetails(visitedDetails || null);

          // ENHANCED: Always fetch full details for database building
          fetchPlaceDetails(place).catch((err) =>
            console.warn("[useMapPlaces] Background fetch error:", err)
          );

          return {
            isDiscovered: true,
            isAlreadyAt: false,
            details: visitedDetails,
          };
        } else {
          // Always get route information first for immediate feedback
          await getRouteInfo(place, userLocation, region);

          // ENHANCED: Always fetch detailed place info in the background
          // This is the key change - we always fetch details for every marker click
          fetchPlaceDetails(place).catch((err) =>
            console.warn("[useMapPlaces] Error fetching details:", err)
          );

          return {
            isDiscovered: false,
            isAlreadyAt: false,
          };
        }
      } catch (error) {
        console.error("[useMapPlaces] Error in place selection:", error);
        Alert.alert("Error", "There was a problem processing this place.");
        return false;
      }
    },
    [getRouteInfo, fetchPlaceDetails]
  );

  /**
   * Get marker color based on place status
   */
  const getMarkerColor = useCallback(
    (place: Place, colors: Record<string, string>): string => {
      if (selectedPlace?.place_id === place.place_id) {
        return colors.SELECTED;
      }
      if (selectedPlace?.place_id === place.place_id && place.isVisited === true) {
        return colors.VISITED;
      }
      if (selectedPlace?.place_id === place.place_id && place.isVisited === false) {
        return colors.SELECTED;
      }
      // Only show visited color if explicitly marked as visited in the database
      if (place.isVisited === true) {
        return colors.VISITED;
      }
      return colors.DEFAULT;
    },
    [selectedPlace]
  );

  /**
   * Reset places and routes when journey ends
   */
  const resetPlacesAndRoutes = useCallback((): void => {
    console.log("[useMapPlaces] Resetting places and routes");
    setSelectedPlace(null);
    setRouteCoordinates([]);
    setTravelTime(null);
    setDistance(null);
    destinationCoordinateRef.current = null;
    setRouteKey(0);
    detailsFetchingRef.current.clear(); // Clear any pending details fetches
  }, []);

  const updatePlaces = useCallback((newPlaces: Place[]) => {
    setPlaces(newPlaces);
  }, []);

  return {
    places,
    selectedPlace,
    routeCoordinates,
    travelTime,
    distance,
    travelMode,
    routeKey,
    circleRadius,
    visitedPlaceDetails,
    destinationCoordinateRef,
    lastRefreshPositionRef,
    refreshNearbyPlaces,
    checkAndRefreshPlaces,
    handlePlaceSelection,
    getRouteInfo,
    getMarkerColor,
    resetPlacesAndRoutes,
    setVisitedPlaceDetails,
    setSelectedPlace,
    initialLoadingComplete,
    updatePlaces,
    isLoadingDetails,
  };
};

export default useMapPlaces;
