// handlers/Map/visitedPlacesHandlers.js
import { saveVisitedPlace, isPlaceVisited } from "../../controllers/Map/visitedPlacesController";
import { Alert } from "react-native";

/**
 * Handle when a user reaches a destination
 * @param {object} place - The place that was reached
 * @param {function(boolean):void} onSuccess - Function to call after successful save, receives isNewPlace boolean
 * @param {function(Error):void} onError - Function to call after error
 */
export const handleDestinationReached = async (
  place,
  onSuccess = (isNewPlace: boolean) => {},
  onError = (error: Error) => {}
) => {
  try {
    // Check if this place has already been visited
    const alreadyVisited = await isPlaceVisited(place.place_id);

    if (alreadyVisited) {
      console.log(`Place ${place.name} has already been visited`);
      onSuccess(false); // Success but not a new place
      return;
    }

    // Save the visited place to the database
    const success = await saveVisitedPlace(place);

    if (success) {
      console.log(`Successfully saved destination ${place.name} to visited places`);
      //   Alert.alert("New Discovery!", `${place.name} has been added to your discoveries.`, [
      //     { text: "Great!", onPress: () => onSuccess(true) },
      //   ]);
    } else {
      console.error(`Failed to save destination ${place.name} to visited places`);
      onError(new Error(`Failed to save destination ${place.name}`));
    }
  } catch (error) {
    console.error("Error in handleDestinationReached:", error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
};

/**
 * Check a list of places against the database to determine which ones have been visited
 * @param {Array} places - Array of places to check
 * @returns {Promise<Array>} - Array of places with isVisited property added
 */
export const checkVisitedPlaces = async (places) => {
  try {
    if (!places || places.length === 0) {
      return [];
    }

    // Create a new array with isVisited property
    const updatedPlaces = await Promise.all(
      places.map(async (place) => {
        const visited = await isPlaceVisited(place.place_id);
        return {
          ...place,
          isVisited: visited,
        };
      })
    );

    return updatedPlaces;
  } catch (error) {
    console.error("Error checking visited places:", error);
    // Return original places if there's an error
    return places.map((place) => ({ ...place, isVisited: false }));
  }
};
