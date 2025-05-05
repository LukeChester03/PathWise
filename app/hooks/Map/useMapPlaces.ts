import { useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo";
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
import { calcDist } from "../../utils/mapUtils";
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
  isLoadingDetails: boolean;
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
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [initialLoadingComplete, setInitialLoadingComplete] = useState<boolean>(false);
  const [visitedPlaceDetails, setVisitedPlaceDetails] = useState<VisitedPlaceDetails | null>(null);

  const lastRefreshPositionRef = useRef<Coordinate | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const destinationCoordinateRef = useRef<Coordinate | null>(null);
  const detailsFetchingRef = useRef<Set<string>>(new Set());

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
        const networkState = await NetInfo.fetch();
        if (!networkState.isConnected) {
          console.log("[useMapPlaces] No network connection, using cached places");
          if (places.length > 0) {
            setIsRefreshingPlaces(false);
            return true;
          }
        }

        const placesResponse: NearbyPlacesResponse = await fetchNearbyPlaces(latitude, longitude);

        console.log(
          `[useMapPlaces] Fetched ${placesResponse.places.length} places with radius ${placesResponse.furthestDistance}m`
        );

        setCircleRadius(placesResponse.furthestDistance);

        if (placesResponse.places && placesResponse.places.length > 0) {
          const placesWithVisitedStatus = await checkVisitedPlaces(placesResponse.places);
          if (selectedPlace) {
            const selectedPlaceExists = placesWithVisitedStatus.some(
              (place: any) => place.place_id === selectedPlace.place_id
            );

            if (!selectedPlaceExists) {
              const selectedWithVisitedStatus = await checkVisitedPlaces([selectedPlace]);
              setPlaces([...placesWithVisitedStatus, ...selectedWithVisitedStatus]);
            } else {
              setPlaces(placesWithVisitedStatus);
            }
          } else {
            setPlaces(placesWithVisitedStatus);
          }

          const placeTypes = placesWithVisitedStatus
            .map((p) => p.types?.join(", ") || "no-type")
            .slice(0, 3);
          console.log(`[useMapPlaces] Sample place types: ${placeTypes.join(" | ")}`);
        } else if (placesResponse.places && placesResponse.places.length === 0) {
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

        if (!initialLoadingComplete) {
          setInitialLoadingComplete(true);
        }

        return true;
      } catch (error) {
        console.error("[useMapPlaces] Error refreshing nearby places:", error);

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

  const checkAndRefreshPlaces = useCallback(
    (newLocation: Coordinate): boolean => {
      if (!initialLoadingComplete || !lastRefreshPositionRef.current) return false;

      const currentTime = Date.now();
      const timeSinceLastRefresh = currentTime - lastRefreshTimeRef.current;

      if (timeSinceLastRefresh < 120000) {
        return false;
      }

      const distance = calcDist(
        lastRefreshPositionRef.current.latitude,
        lastRefreshPositionRef.current.longitude,
        newLocation.latitude,
        newLocation.longitude
      );

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

        const routeResult = await fetchRoute(origin, destination);

        if (routeResult) {
          const {
            coords,
            duration,
            distance: distanceKm,
            travelMode: routeTravelMode,
          } = routeResult;

          console.log(
            `[useMapPlaces] Route calculation: ${distanceKm.toFixed(
              1
            )}km, mode: ${routeTravelMode}, time: ${duration}`
          );

          setRouteCoordinates(coords);
          setTravelTime(duration);
          setDistance(distanceKm.toFixed(1) + " km");

          if (place?.geometry?.location) {
            destinationCoordinateRef.current = {
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            };
          }

          if (routeTravelMode === "bicycling" || routeTravelMode === "transit") {
            setTravelMode("driving");
          } else {
            setTravelMode(routeTravelMode);
          }

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

  const fetchPlaceDetails = useCallback(
    async (place: Place): Promise<Place | null> => {
      if (detailsFetchingRef.current.has(place.place_id) || place.hasFullDetails) {
        console.log(`[useMapPlaces] Already fetching or has details for ${place.name}, skipping`);
        return null;
      }

      try {
        detailsFetchingRef.current.add(place.place_id);
        setIsLoadingDetails(true);

        console.log(`[useMapPlaces] Fetching full details for ${place.name}`);

        const networkState = await NetInfo.fetch();
        if (!networkState.isConnected) {
          console.log("[useMapPlaces] No network connection, using basic place info");
          detailsFetchingRef.current.delete(place.place_id);
          setIsLoadingDetails(false);
          return null;
        }

        const detailedPlace = await fetchPlaceDetailsOnDemand(place.place_id);

        if (detailedPlace) {
          console.log(`[useMapPlaces] Successfully fetched details for ${detailedPlace.name}`);

          if (selectedPlace?.place_id === place.place_id) {
            setSelectedPlace(detailedPlace);
          }

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
        detailsFetchingRef.current.delete(place.place_id);
        setIsLoadingDetails(false);
      }
    },
    [selectedPlace?.place_id]
  );

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

      setSelectedPlace(place);
      console.log(`[useMapPlaces] Selected place: ${place.name}`);

      try {
        const isVisited = await isPlaceVisited(place.place_id);
        console.log(`[useMapPlaces] Place visited status: ${isVisited}`);

        if (isVisited) {
          console.log("[useMapPlaces] Selected place has been discovered:", place.name);

          const visitedDetails = await getVisitedPlaceDetails(place.place_id);

          if (visitedDetails) {
            setVisitedPlaceDetails(visitedDetails);

            await getRouteInfo(place, userLocation, region);

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

        if (place.isVisited === true) {
          const visitedDetails = await getVisitedPlaceDetails(place.place_id);
          setVisitedPlaceDetails(visitedDetails || null);

          fetchPlaceDetails(place).catch((err) =>
            console.warn("[useMapPlaces] Background fetch error:", err)
          );

          return {
            isDiscovered: true,
            isAlreadyAt: false,
            details: visitedDetails,
          };
        } else {
          await getRouteInfo(place, userLocation, region);
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
      if (place.isVisited === true) {
        return colors.VISITED;
      }
      return colors.DEFAULT;
    },
    [selectedPlace]
  );

  const resetPlacesAndRoutes = useCallback((): void => {
    console.log("[useMapPlaces] Resetting places and routes");
    setSelectedPlace(null);
    setRouteCoordinates([]);
    setTravelTime(null);
    setDistance(null);
    destinationCoordinateRef.current = null;
    setRouteKey(0);
    detailsFetchingRef.current.clear();
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
