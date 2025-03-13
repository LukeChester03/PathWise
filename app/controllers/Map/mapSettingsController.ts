// controllers/Map/mapSettingsController.ts
import { clearPlacesCache, updatePlacesSettings } from "./placesController";
import { getLocationState } from "./locationController";

// Map configuration that can be dynamically updated
let mapConfig = {
  MAX_PLACES: 40,
  SEARCH_RADIUS: 20000, // 20km in meters
};

/**
 * Get the current map settings
 */
export const getMapSettings = () => {
  return {
    maxPlaces: mapConfig.MAX_PLACES,
    searchRadius: mapConfig.SEARCH_RADIUS / 1000, // Convert to km for UI
  };
};

/**
 * Update map settings and clear cache to apply changes
 * @param maxPlaces Maximum number of places to fetch (10-50)
 * @param radiusKm Search radius in kilometers (1-50)
 * @returns Updated settings
 */
export const updateMapSettings = (maxPlaces: number, radiusKm: number) => {
  // Enforce limits
  mapConfig.MAX_PLACES = Math.min(Math.max(10, maxPlaces), 50);
  mapConfig.SEARCH_RADIUS = Math.min(Math.max(1000, radiusKm * 1000), 50000);

  // Update the actual settings in placesController
  updatePlacesSettings(mapConfig.MAX_PLACES, radiusKm);

  console.log(
    `Map settings updated: MAX_PLACES=${mapConfig.MAX_PLACES}, SEARCH_RADIUS=${mapConfig.SEARCH_RADIUS}m`
  );

  return getMapSettings();
};

/**
 * Force refresh the map with current settings
 */
export const refreshMap = async () => {
  try {
    // Clear the cache
    clearPlacesCache();

    // Get current location from global state
    const locationState = getLocationState();

    if (!locationState || !locationState.userLocation) {
      console.warn("Cannot refresh map: user location not available");
      return false;
    }

    console.log("Refreshing map with current settings...");

    // Import the function directly to avoid circular dependencies
    const { updateNearbyPlaces } = require("./locationController");

    // Force refresh with current location and settings
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

/**
 * Apply map settings from system or user preferences
 * Call this during app initialization
 */
export const initializeMapSettings = (initialMaxPlaces = 40, initialRadiusKm = 20) => {
  // You could load from AsyncStorage or other persistent storage here
  updateMapSettings(initialMaxPlaces, initialRadiusKm);
};

// Export current config for direct access by placesController
export const getMapConfig = () => mapConfig;
