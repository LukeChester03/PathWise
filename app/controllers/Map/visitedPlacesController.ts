// src/controllers/Map/visitedPlacesController.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";

// In-memory cache for visited places status
const visitedStatusCache = new Map<string, { status: boolean; timestamp: number }>();
const VISITED_STATUS_CACHE_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 days

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

    // Check memory cache first
    const cachedStatus = visitedStatusCache.get(placeId);
    if (cachedStatus && Date.now() - cachedStatus.timestamp < VISITED_STATUS_CACHE_EXPIRATION) {
      return cachedStatus.status;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("No user logged in, checking local storage only");

      // Check local storage if no user is logged in
      const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
      if (visitedPlacesJSON) {
        const visitedPlaces = JSON.parse(visitedPlacesJSON);
        const isVisitedLocal = visitedPlaces.some((place: any) => place.place_id === placeId);

        // Update cache
        visitedStatusCache.set(placeId, {
          status: isVisitedLocal,
          timestamp: Date.now(),
        });

        return isVisitedLocal;
      }

      // Not found in local storage
      visitedStatusCache.set(placeId, {
        status: false,
        timestamp: Date.now(),
      });

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
        // Update cache
        visitedStatusCache.set(placeId, {
          status: true,
          timestamp: Date.now(),
        });

        return true;
      }
    }

    // If not in Firestore, try local storage as fallback
    const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
    if (visitedPlacesJSON) {
      const visitedPlaces = JSON.parse(visitedPlacesJSON);
      const isVisitedLocal = visitedPlaces.some((place: any) => place.place_id === placeId);

      // Update cache
      visitedStatusCache.set(placeId, {
        status: isVisitedLocal,
        timestamp: Date.now(),
      });

      if (isVisitedLocal) {
        return true;
      }
    }

    // Update cache with negative result
    visitedStatusCache.set(placeId, {
      status: false,
      timestamp: Date.now(),
    });

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

    // Save to Firestore if user is logged in
    const currentUser = auth.currentUser;
    if (currentUser) {
      const placeDocRef = doc(db, "users", currentUser.uid, "visitedPlaces", placeId);
      await setDoc(placeDocRef, {
        ...normalizedPlace,
        // Convert geometry location to GeoPoint for Firestore
        geometry: {
          location: {
            latitude: normalizedPlace.geometry.location.lat,
            longitude: normalizedPlace.geometry.location.lng,
          },
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`Successfully saved place to Firestore: ${placeId}`);

      // Update cache
      visitedStatusCache.set(placeId, {
        status: true,
        timestamp: Date.now(),
      });
    }

    // Also update in local storage for legacy support and offline use
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
      console.log("No user logged in, getting from local storage");

      // Try local storage
      const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
      if (visitedPlacesJSON) {
        const parsedPlaces = JSON.parse(visitedPlacesJSON);
        return parsedPlaces.map((place: any) => normalizePlaceData(place));
      }

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

      // Convert Firestore GeoPoint back to normal lat/lng
      return normalizePlaceData({
        ...data,
        id: doc.id,
        place_id: doc.id,
        geometry: {
          location: {
            lat: data.geometry?.location?.latitude || 0,
            lng: data.geometry?.location?.longitude || 0,
          },
        },
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
 * Get details for a specific visited place
 */
export const getVisitedPlaceDetails = async (placeId: string, userId = null) => {
  try {
    const currentUser = userId || auth.currentUser?.uid;

    if (!currentUser) {
      console.log("No authenticated user found");

      // Try local storage
      const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
      if (visitedPlacesJSON) {
        const visitedPlaces = JSON.parse(visitedPlacesJSON);
        const localPlace = visitedPlaces.find((p: any) => p.place_id === placeId);

        if (localPlace) {
          console.log(`Retrieved visited place details from local storage for ${placeId}`);
          return localPlace;
        }
      }

      return null;
    }

    // Check directly in Firestore for this specific place
    const placeDocRef = doc(db, "users", currentUser, "visitedPlaces", placeId);
    const placeDoc = await getDoc(placeDocRef);

    if (placeDoc.exists()) {
      console.log(`Retrieved visited place details for ${placeId} from firebase`);
      const placeData = placeDoc.data();

      // Convert GeoPoint back to normal lat/lng
      return {
        ...placeData,
        id: placeId,
        place_id: placeId,
        geometry: {
          location: {
            lat: placeData.geometry?.location?.latitude || 0,
            lng: placeData.geometry?.location?.longitude || 0,
          },
        },
      };
    }

    // If not in Firestore, try local storage as fallback
    const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
    if (visitedPlacesJSON) {
      const visitedPlaces = JSON.parse(visitedPlacesJSON);

      const localPlace = visitedPlaces.find((p: any) => p.place_id === placeId);
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

/**
 * Check a list of places against the database to determine which ones have been visited
 * @param places Array of places to check
 * @returns Array of places with isVisited property added
 */
export const checkVisitedPlaces = async (places: any[]): Promise<any[]> => {
  try {
    if (!places || places.length === 0) {
      return [];
    }

    // Create a new array with isVisited property
    const placeIds = places.map((place) => place.place_id);

    // Batch check place visited status to reduce Firebase reads
    const visitedStatusMap = new Map();

    // First check memory cache
    const uncheckedPlaceIds = [];

    for (const placeId of placeIds) {
      const cachedStatus = visitedStatusCache.get(placeId);
      if (cachedStatus && Date.now() - cachedStatus.timestamp < VISITED_STATUS_CACHE_EXPIRATION) {
        visitedStatusMap.set(placeId, cachedStatus.status);
      } else {
        uncheckedPlaceIds.push(placeId);
      }
    }

    // If user is logged in, batch check in Firebase
    const currentUser = auth.currentUser;
    if (currentUser && uncheckedPlaceIds.length > 0) {
      // We can't query for multiple IDs at once in Firestore, so we need to batch our reads
      const batchSize = 10; // Process in batches of 10

      for (let i = 0; i < uncheckedPlaceIds.length; i += batchSize) {
        const batch = uncheckedPlaceIds.slice(i, i + batchSize);
        const placeResults = await Promise.all(
          batch.map((id) => getDoc(doc(db, "users", currentUser.uid, "visitedPlaces", id)))
        );

        placeResults.forEach((docSnapshot, index) => {
          const placeId = batch[index];
          const isVisited = docSnapshot.exists();

          visitedStatusMap.set(placeId, isVisited);

          // Update cache
          visitedStatusCache.set(placeId, {
            status: isVisited,
            timestamp: Date.now(),
          });
        });
      }
    } else if (uncheckedPlaceIds.length > 0) {
      // If not logged in, check local storage
      const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
      if (visitedPlacesJSON) {
        const localVisitedPlaces = JSON.parse(visitedPlacesJSON);
        const localVisitedIds = new Set(localVisitedPlaces.map((p: any) => p.place_id));

        uncheckedPlaceIds.forEach((placeId) => {
          const isVisited = localVisitedIds.has(placeId);
          visitedStatusMap.set(placeId, isVisited);

          // Update cache
          visitedStatusCache.set(placeId, {
            status: isVisited,
            timestamp: Date.now(),
          });
        });
      } else {
        // No local storage data, mark all as not visited
        uncheckedPlaceIds.forEach((placeId) => {
          visitedStatusMap.set(placeId, false);

          // Update cache
          visitedStatusCache.set(placeId, {
            status: false,
            timestamp: Date.now(),
          });
        });
      }
    }

    // Apply visited status to places
    return places.map((place) => ({
      ...place,
      isVisited: visitedStatusMap.get(place.place_id) || false,
    }));
  } catch (error) {
    console.error("Error checking visited places:", error);
    // Return original places if there's an error
    return places.map((place) => ({ ...place, isVisited: false }));
  }
};

/**
 * Sync local visited places with Firebase
 */
export const syncVisitedPlaces = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("Cannot sync visited places: No user logged in");
      return false;
    }

    // Get local visited places
    const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
    if (!visitedPlacesJSON) {
      console.log("No local visited places to sync");
      return true;
    }

    const localVisitedPlaces = JSON.parse(visitedPlacesJSON);
    if (
      !localVisitedPlaces ||
      !Array.isArray(localVisitedPlaces) ||
      localVisitedPlaces.length === 0
    ) {
      console.log("No local visited places to sync");
      return true;
    }

    console.log(`Syncing ${localVisitedPlaces.length} local visited places to Firebase`);

    // Process in batches to avoid overloading Firestore
    const batchSize = 10;
    let successCount = 0;

    for (let i = 0; i < localVisitedPlaces.length; i += batchSize) {
      const batch = localVisitedPlaces.slice(i, i + batchSize);

      const savePromises = batch.map(async (place: any) => {
        const placeId = place.place_id;
        const placeDocRef = doc(db, "users", currentUser.uid, "visitedPlaces", placeId);

        // Check if already exists in Firebase
        const placeDoc = await getDoc(placeDocRef);
        if (placeDoc.exists()) {
          return true; // Already synced
        }

        // Save to Firebase
        const normalizedPlace = normalizePlaceData(place);
        await setDoc(placeDocRef, {
          ...normalizedPlace,
          // Convert geometry location to GeoPoint for Firestore
          geometry: {
            location: {
              latitude: normalizedPlace.geometry.location.lat,
              longitude: normalizedPlace.geometry.location.lng,
            },
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        return true;
      });

      const results = await Promise.all(savePromises);
      successCount += results.filter(Boolean).length;
    }

    console.log(`Successfully synced ${successCount} visited places to Firebase`);
    return true;
  } catch (error) {
    console.error("Error syncing visited places:", error);
    return false;
  }
};

/**
 * Clear visited status cache
 */
export const clearVisitedStatusCache = () => {
  visitedStatusCache.clear();
  console.log("Visited status cache cleared");
};
