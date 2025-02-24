// src/controllers/Map/mapHandlers.ts
import { Alert } from "react-native";
import { fetchRoute } from "../../controllers/Map/routesController";
import { Region, Place } from "../../types/MapTypes";

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
    if (route) {
      setShowCard(true);
      setRouteCoordinates(route.coords);
      setTravelTime(route.duration);
    }
  }
};

export const handleStartJourney = () => {
  Alert.alert("JOURNEY STARTED");
};

export const handleCancel = (
  setSelectedPlace: (place: Place | null) => void,
  setRouteCoordinates: (coords: { latitude: number; longitude: number }[]) => void,
  setTravelTime: (duration: string | null) => void,
  setShowCard: (show: boolean) => void
) => {
  setSelectedPlace(null);
  setRouteCoordinates([]);
  setTravelTime(null);
  setShowCard(false);
};
