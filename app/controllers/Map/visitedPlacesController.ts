// controllers/Database/visitedPlacesController.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../../config/firebaseConfig"; // Import from your existing Firebase config
import { collection, doc, setDoc, getDocs, getDoc } from "firebase/firestore";
import { Place, PlaceDetails } from "../../types/MapTypes";
import { processVisitedPlace } from "../../services/statsService"; // Import the stats service function

/**
 * Save a visited place to the database, preserving all properties from Place or PlaceDetails
 * @param {Place | PlaceDetails['result']} place - The place object to save
 * @param {string} userId - The user ID (optional, will use current user if not provided)
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const saveVisitedPlace = async (place, userId = null) => {
  try {
    // Get the current user if userId is not provided
    const currentUser = userId || auth.currentUser?.uid;

    if (!currentUser) {
      console.error("No user is currently logged in");
      return false;
    }

    // Create a place object that maintains all existing properties
    const placeData = "result" in place ? place.result : place;

    // Log the place object to verify rating data is present
    console.log("Saving place with rating:", placeData.rating);

    // Ensure we have all the required fields and preserve all existing properties
    const visitedPlace = {
      ...placeData, // Keep all existing properties
      // Add metadata about the visit
      visitedAt: new Date().toISOString(),
      userId: currentUser,

      // Ensure critical fields exist (as fallbacks)
      place_id: placeData.place_id,
      name: placeData.name,

      // Make sure ratings are included (if they exist)
      rating: placeData.rating || null,
      user_ratings_total: placeData.user_ratings_total || null,
    };

    // Save to Firestore
    const userVisitedPlacesRef = collection(db, "users", currentUser, "visitedPlaces");
    await setDoc(doc(userVisitedPlacesRef, placeData.place_id), visitedPlace);

    // Also save to AsyncStorage for offline access
    await saveVisitedPlaceLocally(visitedPlace);

    // Update stats with the newly visited place
    try {
      // Extract country information - using address_components if available
      let country = "Unknown";

      if (placeData.address_components) {
        // Try to find country in address components
        const countryComponent = placeData.address_components.find((component) =>
          component.types.includes("country")
        );

        if (countryComponent) {
          country = countryComponent.long_name || countryComponent.short_name;
        }
      } else if (placeData.formatted_address) {
        // Try to extract country from formatted address (last part often contains country)
        const addressParts = placeData.formatted_address.split(",");
        if (addressParts.length > 0) {
          country = addressParts[addressParts.length - 1].trim();
        }
      } else if (placeData.vicinity) {
        // Last resort - vicinity might have location info
        country = placeData.vicinity;
      }

      // Get coordinates
      const location = {
        latitude: placeData.geometry?.location?.lat || 0,
        longitude: placeData.geometry?.location?.lng || 0,
      };

      // Process the place visit for stats
      await processVisitedPlace({
        placeId: placeData.place_id,
        name: placeData.name,
        country: country,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      console.log(`Updated stats for visit to ${placeData.name} in ${country}`);
    } catch (statsError) {
      // If stats update fails, still consider the save successful
      console.error("Error updating stats for place visit:", statsError);
    }

    console.log(`Successfully saved place ${placeData.name} to database`);
    return true;
  } catch (error) {
    console.error("Error saving visited place to database:", error);
    return false;
  }
};

/**
 * Get all visited places for a user
 * @param {string} userId - The user ID (optional, will use current user if not provided)
 * @returns {Promise<Array>} - Array of visited places
 */
export const getVisitedPlaces = async (userId = null) => {
  try {
    // Get the current user if userId is not provided
    const currentUser = userId || auth.currentUser?.uid;

    if (!currentUser) {
      console.error("No user is currently logged in");
      return [];
    }

    // Try to get from Firestore first
    const userVisitedPlacesRef = collection(db, "users", currentUser, "visitedPlaces");
    const snapshot = await getDocs(userVisitedPlacesRef);

    if (!snapshot.empty) {
      return snapshot.docs.map((doc) => doc.data());
    }

    // If Firestore call fails or returns empty, try to get from AsyncStorage
    return await getVisitedPlacesLocally();
  } catch (error) {
    console.error("Error getting visited places from database:", error);

    // Attempt to get from local storage as a fallback
    return await getVisitedPlacesLocally();
  }
};

/**
 * Check if a place has been visited before
 * @param {string} placeId - The place ID to check
 * @param {string} userId - The user ID (optional, will use current user if not provided)
 * @returns {Promise<boolean>} - True if visited, false otherwise
 */
export const isPlaceVisited = async (placeId, userId = null) => {
  try {
    const currentUser = userId || auth.currentUser?.uid;

    if (!currentUser) {
      console.log("No authenticated user found");
      return false;
    }

    // Check directly in Firestore for this specific place
    const placeDocRef = doc(db, "users", currentUser, "visitedPlaces", placeId);
    const placeDoc = await getDoc(placeDocRef);

    // Return true if the document exists, false otherwise
    const exists = placeDoc.exists();

    // Log for debugging
    console.log(`Checking if place ${placeId} is visited: ${exists}`);

    return exists;
  } catch (error) {
    console.error("Error checking if place is visited:", error);
    return false;
  }
};

// Helper function to save visited places to AsyncStorage
const saveVisitedPlaceLocally = async (place) => {
  try {
    // Get existing visited places
    const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
    let visitedPlaces = visitedPlacesJSON ? JSON.parse(visitedPlacesJSON) : [];

    // Check if place already exists
    const existingIndex = visitedPlaces.findIndex((p) => p.place_id === place.place_id);

    if (existingIndex >= 0) {
      // Update existing place
      visitedPlaces[existingIndex] = place;
    } else {
      // Add new place
      visitedPlaces.push(place);
    }

    // Save back to AsyncStorage
    await AsyncStorage.setItem("visitedPlaces", JSON.stringify(visitedPlaces));
    return true;
  } catch (error) {
    console.error("Error saving visited place to local storage:", error);
    return false;
  }
};

// Helper function to get visited places from AsyncStorage
const getVisitedPlacesLocally = async () => {
  try {
    const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
    return visitedPlacesJSON ? JSON.parse(visitedPlacesJSON) : [];
  } catch (error) {
    console.error("Error getting visited places from local storage:", error);
    return [];
  }
};
