// controllers/Map/visitedPlacesController.ts
import { doc, getDoc, setDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { processVisitedPlace } from "../../services/statsService";
import { showXPAward } from "../../components/Levelling/XPNotificationsManager";

/**
 * Helper function to ensure all place data is normalized and safe for Firestore
 */
const normalizePlaceData = (place: any) => {
  // Create a clean place object with all required fields
  return {
    // Essential identification
    place_id: place.place_id || place.id || `place-${Date.now()}`,
    id: place.id || place.place_id || `place-${Date.now()}`,

    // Basic information
    name: place.name || "Unnamed Place",
    vicinity: place.vicinity || place.formatted_address || "",
    formatted_address: place.formatted_address || place.vicinity || "",

    // Location data - ensure it has proper structure
    geometry: {
      location: {
        lat: place.geometry?.location?.lat || 0,
        lng: place.geometry?.location?.lng || 0,
      },
    },

    // Optional fields with defaults
    description: place.description || place.editorial_summary?.overview || "",
    types: Array.isArray(place.types) ? place.types : [],
    rating: typeof place.rating === "number" ? place.rating : null,
    user_ratings_total: place.user_ratings_total || 0,
    photos: Array.isArray(place.photos) ? place.photos : [],

    // Contact and other details
    formatted_phone_number: place.formatted_phone_number || place.phone || "",
    website: place.website || "",
    url: place.url || "",

    // Metadata about the visit
    visitedAt: place.visitedAt || new Date().toISOString(),
    visitDate: place.visitedAt || new Date().toISOString(),
    isVisited: true,

    // Additional useful data
    country: extractCountryFromPlace(place) || "Unknown",
    city: extractCityFromPlace(place) || "Unknown",
    category: extractCategoryFromPlace(place) || "Other",

    // For backward compatibility
    location: {
      latitude: place.geometry?.location?.lat || 0,
      longitude: place.geometry?.location?.lng || 0,
    },
  };
};

/**
 * Check if a place has already been visited
 * @param placeId The ID of the place to check
 * @returns Boolean indicating whether the place has been visited
 */
export const isPlaceVisited = async (placeId: string): Promise<boolean> => {
  try {
    if (!placeId) {
      console.log("Cannot check if visited: no placeId provided");
      return false;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("No user logged in, can't check if place is visited");
      return false;
    }

    // Check if place exists in Firestore
    const placeDocRef = doc(db, "users", currentUser.uid, "visitedPlaces", placeId);
    const placeDoc = await getDoc(placeDocRef);

    // If place exists in Firestore and isn't the initialization document, it's been visited
    if (placeDoc.exists()) {
      const data = placeDoc.data();
      // Skip the initialization document
      if (data && !data._isInitDocument) {
        return true;
      }
    }

    // If not in Firestore, try local storage as fallback
    const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
    if (visitedPlacesJSON) {
      const visitedPlaces = JSON.parse(visitedPlacesJSON);
      const isVisitedLocal = visitedPlaces.some((place: any) => place.place_id === placeId);
      if (isVisitedLocal) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking if place visited:", error);
    return false;
  }
};

/**
 * Save a place as visited and update stats
 * @param place The place to save as visited
 * @returns Boolean indicating success
 */
// controllers/Map/visitedPlacesController.ts - saveVisitedPlace function (only need to modify this function)
export const saveVisitedPlace = async (place: any): Promise<boolean> => {
  try {
    // Validate input
    if (!place) {
      console.error("Cannot save null place");
      return false;
    }

    const placeId = place.place_id || place.id;
    if (!placeId) {
      console.error("Cannot save place without an ID");
      return false;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("No user logged in, can't save visited place");
      return false;
    }

    console.log(`Attempting to save place: ${place.name} (ID: ${placeId})`);

    // Check if already visited to avoid duplicates
    const alreadyVisited = await isPlaceVisited(placeId);
    if (alreadyVisited) {
      console.log(`Place ${place.name || "Unknown"} already visited, not saving again`);
      return true; // Consider this a success since the end state is as expected
    }

    // Normalize place data to ensure consistent format
    const visitTime = new Date();
    const normalizedPlace = normalizePlaceData({
      ...place,
      visitedAt: visitTime.toISOString(),
      isVisited: true, // Explicitly set this flag
    });

    // Save to Firestore
    const placeDocRef = doc(db, "users", currentUser.uid, "visitedPlaces", placeId);
    await setDoc(placeDocRef, normalizedPlace);
    console.log(`Successfully saved place to Firestore: ${placeId}`);

    // Also update in local storage for legacy support
    try {
      const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
      let visitedPlaces = visitedPlacesJSON ? JSON.parse(visitedPlacesJSON) : [];

      // Add to local storage without duplicates
      if (!visitedPlaces.some((p: any) => p.place_id === placeId)) {
        visitedPlaces.push(normalizedPlace);
        await AsyncStorage.setItem("visitedPlaces", JSON.stringify(visitedPlaces));
        console.log(`Added place to local storage cache: ${placeId}`);
      }
    } catch (localStorageError) {
      console.warn("Error updating local storage:", localStorageError);
      // Continue even if local storage fails
    }

    // Process this place for user stats
    await processVisitedPlace({
      placeId: normalizedPlace.place_id,
      name: normalizedPlace.name,
      country: normalizedPlace.country,
      city: normalizedPlace.city,
      category: normalizedPlace.category,
      latitude: normalizedPlace.geometry.location.lat,
      longitude: normalizedPlace.geometry.location.lng,
      visitedAt: visitTime,
      stayDuration: 30, // Default 30 minutes
      photosTaken: normalizedPlace.photos ? normalizedPlace.photos.length : 0,
    });

    // Show XP notification with a tiny delay to ensure XP notification system is ready
    setTimeout(() => {
      showXPAward(10, `Discovered ${normalizedPlace.name}`);
    }, 500);

    console.log(`Successfully saved ${normalizedPlace.name} as visited`);
    return true;
  } catch (error) {
    console.error("Error saving visited place:", error);
    return false;
  }
};

/**
 * Get all places visited by the user
 * @returns Array of visited places
 */
export const getVisitedPlaces = async (): Promise<any[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("No user logged in, can't get visited places");
      return [];
    }

    // Get from Firestore
    const visitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
    const query_ = query(visitedPlacesRef, orderBy("visitedAt", "desc"));
    const snapshot = await getDocs(query_);

    if (snapshot.empty) {
      console.log("No visited places found in Firestore");

      // Try local storage as fallback
      const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
      if (visitedPlacesJSON) {
        const parsedPlaces = JSON.parse(visitedPlacesJSON);
        return parsedPlaces.map((place: any) => normalizePlaceData(place));
      }

      return [];
    }

    // Convert to array of normalized places
    const visitedPlaces = snapshot.docs.map((doc) => {
      const data = doc.data();
      return normalizePlaceData({
        ...data,
        id: doc.id,
        place_id: doc.id,
      });
    });

    return visitedPlaces;
  } catch (error) {
    console.error("Error getting visited places:", error);

    // Try local storage as fallback
    try {
      const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
      if (visitedPlacesJSON) {
        const parsedPlaces = JSON.parse(visitedPlacesJSON);
        return parsedPlaces.map((place: any) => normalizePlaceData(place));
      }
    } catch (e) {
      console.error("Error getting visited places from local storage:", e);
    }

    return [];
  }
};

/**
 * Extract country from place details
 */
function extractCountryFromPlace(place: any): string {
  // Try to extract from address components
  if (place.address_components && Array.isArray(place.address_components)) {
    const countryComponent = place.address_components.find(
      (component: any) => component.types && component.types.includes("country")
    );
    if (countryComponent) {
      return countryComponent.long_name;
    }
  }

  // Try to extract from formatted address
  if (place.formatted_address) {
    const addressParts = place.formatted_address.split(",");
    if (addressParts.length > 1) {
      return addressParts[addressParts.length - 1].trim();
    }
  }

  // Default country
  return "Unknown";
}

/**
 * Extract city from place details
 */
function extractCityFromPlace(place: any): string {
  // Try to extract from address components
  if (place.address_components && Array.isArray(place.address_components)) {
    const cityComponent = place.address_components.find(
      (component: any) =>
        component.types &&
        (component.types.includes("locality") ||
          component.types.includes("administrative_area_level_1"))
    );
    if (cityComponent) {
      return cityComponent.long_name;
    }
  }

  // Try to extract from formatted address or vicinity
  if (place.vicinity) {
    const parts = place.vicinity.split(",");
    if (parts.length > 0) {
      return parts[0].trim();
    }
  }

  // Default
  return "Unknown";
}

/**
 * Extract category from place details
 */
function extractCategoryFromPlace(place: any): string {
  if (place.types && Array.isArray(place.types) && place.types.length > 0) {
    // Map common Google Place types to more user-friendly categories
    const typeMapping: { [key: string]: string } = {
      restaurant: "Restaurant",
      cafe: "Café",
      bar: "Bar",
      lodging: "Accommodation",
      hotel: "Accommodation",
      museum: "Cultural",
      art_gallery: "Cultural",
      park: "Nature",
      tourist_attraction: "Sightseeing",
      shopping_mall: "Shopping",
      store: "Shopping",
      amusement_park: "Entertainment",
      stadium: "Entertainment",
      airport: "Transport",
      train_station: "Transport",
      church: "Religious",
      mosque: "Religious",
      temple: "Religious",
      hospital: "Healthcare",
      pharmacy: "Healthcare",
      school: "Education",
      university: "Education",
      library: "Education",
      bakery: "Food",
      grocery_store: "Food",
      gym: "Sports",
      beach: "Nature",
      mountain: "Nature",
      forest: "Nature",
      night_club: "Entertainment",
      movie_theater: "Entertainment",
      theater: "Entertainment",
    };

    // Try to match with known types
    for (const type of place.types) {
      if (typeMapping[type]) {
        return typeMapping[type];
      }
    }

    // If no match, use first type with underscores converted to spaces
    return place.types[0]
      .replace(/_/g, " ")
      .split(" ")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Default
  return "Other";
}
