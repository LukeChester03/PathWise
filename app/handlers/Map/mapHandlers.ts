import { Alert } from "react-native";
import { fetchRoute } from "../../controllers/Map/routesController";
import { Region, Place } from "../../types/MapTypes";
import MapView from "react-native-maps";

/**
 * Handles the marker press event.
 * Fetches the route and updates the state to show the ExploreCard.
 */
export const handleMarkerPress = async (
  place: Place,
  region: Region | null,
  setSelectedPlace: (place: Place | null) => void,
  setRouteCoordinates: (coords: { latitude: number; longitude: number }[]) => void,
  setTravelTime: (duration: string | null) => void,
  setShowCard: (show: boolean) => void
) => {
  setSelectedPlace(place);
  if (region) {
    const origin = `${region.latitude},${region.longitude}`;
    const destination = `${place.geometry.location.lat},${place.geometry.location.lng}`;
    const route = await fetchRoute(origin, destination);
    if (route && route.duration && route.distance !== undefined) {
      const duration = parseFloat(route.duration).toFixed(1);
      setShowCard(true);
      setRouteCoordinates(route.coords);
      setTravelTime(`${duration} mins`);
    }
  }
};

/**
 * Handles the start journey event.
 * Requests location permissions and starts tracking the user's location.
 */
export const handleStartJourney = async (
  requestLocationPermission: () => Promise<boolean>,
  setShowCard: (show: boolean) => void,
  setShowDetailCard: (showDetail: boolean) => void,
  setJourneyStarted: (started: boolean) => void,
  setShowArrow: (showArrow: boolean) => void,
  setIsMapFocused: (focused: boolean) => void,
  mapRef: React.RefObject<MapView>,
  userLocation: Region | null
) => {
  const hasPermission = await requestLocationPermission();
  if (hasPermission) {
    setShowCard(false);
    setShowDetailCard(true);
    setShowArrow(false);
    setJourneyStarted(true);
    setIsMapFocused(true); // Focus on user location when journey starts
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion(userLocation, 1000); // Animate to user location
    }
  } else {
    Alert.alert("Permission Denied", "Location permission is required to start the journey.");
  }
};

/**
 * Handles the cancel journey event.
 * Resets all journey-related state.
 */
export const handleCancel = (
  setConfirmEndJourney: (confirm: boolean) => void,
  setSelectedPlace: (place: Place | null) => void,
  setRouteCoordinates: (coords: { latitude: number; longitude: number }[]) => void,
  setTravelTime: (duration: string | null) => void,
  setDistance: (distance: string | null) => void,
  setShowCard: (show: boolean) => void,
  setShowDetailCard: (showDetail: boolean) => void,
  setShowArrow: (showArrow: boolean) => void,
  setJourneyStarted: (started: boolean) => void
) => {
  setConfirmEndJourney(true);
  setSelectedPlace(null);
  setRouteCoordinates([]);
  setTravelTime(null);
  setDistance(null);
  setShowCard(false);
  setShowDetailCard(false);
  setShowArrow(false);
  setJourneyStarted(false);
};

/**
 * Handles the region change event.
 * Re-centers the map on the user's location after a delay.
 */
// export const handleRegionChangeComplete = (
//   journeyStarted: boolean,
//   setIsMapFocused: (focused: boolean) => void,
//   mapRef: React.RefObject<MapView>,
//   userLocation: Region | null
// ) => {
//   if (journeyStarted) {
//     setIsMapFocused(false);
//     setTimeout(() => {
//       setIsMapFocused(true);
//       if (mapRef.current && userLocation) {
//         mapRef.current.animateToRegion(userLocation, 500);
//       }
//     }, 3000);
//   }
// };
