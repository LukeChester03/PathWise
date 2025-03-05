// useMapPlaces.ts - Hook for managing places data
import { useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { fetchNearbyPlaces } from "../../controllers/Map/placesController";
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
  const [initialLoadingComplete, setInitialLoadingComplete] = useState<boolean>(false);
  const [visitedPlaceDetails, setVisitedPlaceDetails] = useState<VisitedPlaceDetails | null>(null);

  // Refs for tracking places refresh
  const lastRefreshPositionRef = useRef<Coordinate | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const destinationCoordinateRef = useRef<Coordinate | null>(null);

  /**
   * Load nearby places based on coordinates
   */
  const refreshNearbyPlaces = useCallback(
    async (latitude: number, longitude: number): Promise<boolean> => {
      if (isRefreshingPlaces) return false;

      try {
        console.log(`Refreshing nearby places at ${latitude}, ${longitude}`);
        setIsRefreshingPlaces(true);

        // Get places using the updated controller that returns places and furthestDistance
        const placesResponse: NearbyPlacesResponse = await fetchNearbyPlaces(latitude, longitude);

        console.log(
          `Fetched ${placesResponse.places.length} places with radius ${placesResponse.furthestDistance}m`
        );

        // Set the circle radius based on the furthest place
        setCircleRadius(placesResponse.furthestDistance);

        if (placesResponse.places && placesResponse.places.length > 0) {
          // Check which places have been visited before
          const placesWithVisitedStatus = await checkVisitedPlaces(placesResponse.places);

          // Keep selected place in the list if it exists
          if (selectedPlace) {
            const selectedPlaceExists = placesWithVisitedStatus.some(
              (place) => place.place_id === selectedPlace.place_id
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
        } else if (placesResponse.places && placesResponse.places.length === 0) {
          // If no places found, keep selected place if it exists
          if (selectedPlace) {
            const selectedWithVisitedStatus = await checkVisitedPlaces([selectedPlace]);
            setPlaces(selectedWithVisitedStatus);
          } else {
            setPlaces([]);
          }
        }

        lastRefreshPositionRef.current = { latitude, longitude };
        lastRefreshTimeRef.current = Date.now();

        // Mark initial loading as complete
        if (!initialLoadingComplete) {
          setInitialLoadingComplete(true);
        }

        return true;
      } catch (error) {
        console.error("Error refreshing nearby places:", error);

        // Still mark initial loading as complete even if there was an error
        if (!initialLoadingComplete) {
          setInitialLoadingComplete(true);
        }

        return false;
      } finally {
        setIsRefreshingPlaces(false);
      }
    },
    [selectedPlace, isRefreshingPlaces, initialLoadingComplete]
  );

  /**
   * Check if we should refresh places based on user movement
   */
  const checkAndRefreshPlaces = useCallback(
    (newLocation: Coordinate): boolean => {
      // Don't try to refresh if initial loading isn't complete or if lastRefreshPosition isn't set
      if (!initialLoadingComplete || !lastRefreshPositionRef.current) return false;

      const currentTime = Date.now();
      const timeSinceLastRefresh = currentTime - lastRefreshTimeRef.current;

      // Only refresh if enough time has passed since the last refresh
      if (timeSinceLastRefresh < MARKER_REFRESH_THRESHOLD) return false;

      const distance = haversineDistance(
        lastRefreshPositionRef.current.latitude,
        lastRefreshPositionRef.current.longitude,
        newLocation.latitude,
        newLocation.longitude
      );

      // If user has moved more than 50% of the circle radius, refresh places
      if (distance > circleRadius * 0.5) {
        console.log(`User moved ${distance.toFixed(2)}m, refreshing places`);
        refreshNearbyPlaces(newLocation.latitude, newLocation.longitude);
        return true;
      }

      return false;
    },
    [refreshNearbyPlaces, initialLoadingComplete, circleRadius]
  );

  /**
   * Handle place selection
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

      // Set the selected place
      setSelectedPlace(place);
      console.log(`Selected place: ${place.name}`);

      try {
        // Check if this place is already visited and fetch details if necessary
        const isVisited = await isPlaceVisited(place.place_id);
        console.log(`Place visited status: ${isVisited}`);

        if (isVisited) {
          console.log("Selected place has been discovered:", place.name);

          // Fetch the visited place details from the controller
          const visitedDetails = await getVisitedPlaceDetails(place.place_id);

          if (visitedDetails) {
            // Store the full details for use in the DiscoveredCard
            setVisitedPlaceDetails(visitedDetails);

            // Still get route info for reference
            await getRouteInfo(place, userLocation, region);
            return { isDiscovered: true, details: visitedDetails };
          }
        }

        // If we get here, place is not visited or we couldn't get details
        // Show the regular card based on standard isVisited flag
        if (place.isVisited === true) {
          const visitedDetails = await getVisitedPlaceDetails(place.place_id);
          setVisitedPlaceDetails(visitedDetails || null);
          return { isDiscovered: true, details: visitedDetails };
        } else {
          // Always get route information
          await getRouteInfo(place, userLocation, region);
          return { isDiscovered: false };
        }
      } catch (error) {
        console.error("Error in place selection:", error);
        Alert.alert("Error", "There was a problem processing this place.");
        return false;
      }
    },
    []
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
        console.log(`Getting route to ${place.name}`);

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
            `Route calculation: ${distanceKm.toFixed(
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
          console.warn("Could not calculate a route to this destination.");
          return false;
        }
      } catch (error) {
        console.error("Error getting route:", error);
        return false;
      }
    },
    []
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
    console.log("Resetting places and routes");
    setSelectedPlace(null);
    setRouteCoordinates([]);
    setTravelTime(null);
    setDistance(null);
    destinationCoordinateRef.current = null;
    setRouteKey(0);
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
  };
};

export default useMapPlaces;
