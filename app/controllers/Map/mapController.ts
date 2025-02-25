import { Region } from "../../types/MapTypes";
import { getCurrentLocation } from "./locationController";
import { fetchNearbyPlaces } from "./placesController";

export const initializeMap = async () => {
  const region = await getCurrentLocation();
  if (!region) return null;

  const places = await fetchNearbyPlaces(region.latitude, region.longitude);
  return { region, places };
};
