import { Region } from "../../types/MapTypes";
import { getCurrentLocation } from "./locationController";
import { fetchNearbyPlaces } from "./placesController";

/**
 * Initializes the map with the user's current location and nearby places.
 * @returns Object containing the region and places, or null if initialization fails.
 */
export const initializeMap = async () => {
  const region = await getCurrentLocation();
  if (!region) return null;

  const places = await fetchNearbyPlaces(region.latitude, region.longitude);
  return { region, places };
};
