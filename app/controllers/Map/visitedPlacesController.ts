// controllers/Database/visitedPlacesController.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../../config/firebaseConfig"; // Import from your existing Firebase config
import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore";

/**
 * Save a visited place to the database
 * @param {object} place - The place object to save
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

    // Create a simplified place object to save to the database
    const visitedPlace = {
      place_id: place.place_id,
      name: place.name,
      geometry: place.geometry,
      photos: place.photos || [],
      types: place.types || [],
      vicinity: place.vicinity || "",
      description: place.description || "",
      visitedAt: new Date().toISOString(),
    };

    // Save to Firestore
    const userVisitedPlacesRef = collection(db, "users", currentUser, "visitedPlaces");
    await setDoc(doc(userVisitedPlacesRef, place.place_id), visitedPlace);

    // Also save to AsyncStorage for offline access
    await saveVisitedPlaceLocally(visitedPlace);

    console.log(`Successfully saved place ${place.name} to database`);
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
    // Get all visited places
    const visitedPlaces = await getVisitedPlaces(userId);

    // Check if the place exists in the visited places
    return visitedPlaces.some((place) => place.place_id === placeId);
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
