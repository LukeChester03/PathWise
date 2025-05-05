import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveVisitedPlace, isPlaceVisited } from "../../controllers/Map/visitedPlacesController";
import { Alert } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";

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

    const placeToSave = {
      ...place,
      isVisited: true,
      visitedAt: place.visitedAt || new Date().toISOString(),
    };

    console.log(`Saving visited place: ${placeToSave.name}`);
    const success = await saveVisitedPlace(placeToSave);

    if (success) {
      console.log(`Successfully saved destination ${placeToSave.name} to visited places`);
      onSuccess(true);
      return true;
    } else {
      console.error(`Failed to save destination ${placeToSave.name} to visited places`);

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

export const checkVisitedPlaces = async (places) => {
  try {
    if (!places || places.length === 0) {
      return [];
    }

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

    const placeDocRef = doc(db, "users", currentUser, "visitedPlaces", placeId);
    const placeDoc = await getDoc(placeDocRef);

    if (placeDoc.exists()) {
      console.log(`Retrieved visited place details for ${placeId} from firebase`);
      return {
        ...placeDoc.data(),
        id: placeId,
        place_id: placeId,
      };
    }

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
