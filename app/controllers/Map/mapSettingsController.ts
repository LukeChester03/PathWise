import { clearPlacesCache, updatePlacesSettings } from "./placesController";
import { getLocationState } from "./locationController";

let mapConfig = {
  MAX_PLACES: 40,
  SEARCH_RADIUS: 20000,
};

/**
 * Get the current map settings
 */
export const getMapSettings = () => {
  return {
    maxPlaces: mapConfig.MAX_PLACES,
    searchRadius: mapConfig.SEARCH_RADIUS / 1000,
  };
};

/**
 * Update map settings and clear cache to apply changes
 */
export const updateMapSettings = (maxPlaces: number, radiusKm: number) => {
  mapConfig.MAX_PLACES = Math.min(Math.max(10, maxPlaces), 50);
  mapConfig.SEARCH_RADIUS = Math.min(Math.max(1000, radiusKm * 1000), 50000);

  updatePlacesSettings(mapConfig.MAX_PLACES, radiusKm);

  console.log(
    `Map settings updated: MAX_PLACES=${mapConfig.MAX_PLACES}, SEARCH_RADIUS=${mapConfig.SEARCH_RADIUS}m`
  );

  return getMapSettings();
};

//force refresh with current settings
export const refreshMap = async () => {
  try {
    clearPlacesCache();

    const locationState = getLocationState();

    if (!locationState || !locationState.userLocation) {
      console.warn("Cannot refresh map: user location not available");
      return false;
    }

    console.log("Refreshing map with current settings...");

    const { updateNearbyPlaces } = require("./locationController");

    if (locationState.region) {
      await updateNearbyPlaces(locationState.region, true);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error refreshing map:", error);
    return false;
  }
};

export const initializeMapSettings = (initialMaxPlaces = 40, initialRadiusKm = 20) => {
  updateMapSettings(initialMaxPlaces, initialRadiusKm);
};

export const getMapConfig = () => mapConfig;
