// handlers/Map/visitedPlacesHandlers.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveVisitedPlace, isPlaceVisited } from "../../controllers/Map/visitedPlacesController";
import { Alert } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";

/**
 * Handle when a user reaches a destination
 * @param {object} place - The place that was reached
 * @param {function(boolean):void} onSuccess - Function to call after successful save, receives isNewPlace boolean
 * @param {function(Error):void} onError - Function to call after error
 */
export const handleDestinationReached = async (
  place,
  onSuccess = (isNewPlace) => {},
  onError = (error) => {}
) => {
  try {
    if (!place || !place.place_id) {
      console.error("Invalid place object in handleDestinationReached");
      onError(new Error("Invalid place data"));
      return false;
    }

    console.log(`Handling destination reached: ${place.name} (${place.place_id})`);

    // Ensure place has isVisited flag set
    const placeToSave = {
      ...place,
      isVisited: true,
      visitedAt: place.visitedAt || new Date().toISOString(),
    };

    // Save the visited place to the database
    console.log(`Saving visited place: ${placeToSave.name}`);
    const success = await saveVisitedPlace(placeToSave);

    if (success) {
      console.log(`Successfully saved destination ${placeToSave.name} to visited places`);
      onSuccess(true);
      return true;
    } else {
      console.error(`Failed to save destination ${placeToSave.name} to visited places`);

      // Try one more time with a delay
      setTimeout(async () => {
        console.log(`Retrying save for: ${placeToSave.name}`);
        const retrySuccess = await saveVisitedPlace(placeToSave);
        if (retrySuccess) {
          console.log(`Retry successful for: ${placeToSave.name}`);
          onSuccess(true);
        } else {
          console.error(`Retry also failed for: ${placeToSave.name}`);
          onError(new Error(`Failed to save destination ${placeToSave.name}`));
        }
      }, 1000);

      return false;
    }
  } catch (error) {
    console.error("Error in handleDestinationReached:", error);
    onError(error instanceof Error ? error : new Error(String(error)));
    return false;
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

export const getVisitedPlaceDetails = async (placeId, userId = null) => {
  try {
    const currentUser = userId || auth.currentUser?.uid;

    if (!currentUser) {
      console.log("No authenticated user found");
      return null;
    }

    // Check directly in Firestore for this specific place
    const placeDocRef = doc(db, "users", currentUser, "visitedPlaces", placeId);
    const placeDoc = await getDoc(placeDocRef);

    if (placeDoc.exists()) {
      console.log(`Retrieved visited place details for ${placeId}`);
      return {
        ...placeDoc.data(),
        id: placeId,
        place_id: placeId,
      };
    }

    // If not in Firestore, try local storage as fallback
    const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
    if (visitedPlacesJSON) {
      const visitedPlaces = JSON.parse(visitedPlacesJSON);

      const localPlace = visitedPlaces.find((p) => p.place_id === placeId);
      if (localPlace) {
        console.log(`Retrieved visited place details from local storage for ${placeId}`);
        return localPlace;
      }
    }

    console.log(`No visited place found with ID: ${placeId}`);
    return null;
  } catch (error) {
    console.error("Error fetching visited place details:", error);
    return null;
  }
};
