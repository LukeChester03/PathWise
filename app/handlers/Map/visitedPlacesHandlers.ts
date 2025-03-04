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
