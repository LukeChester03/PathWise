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

const visitedStatusCache = new Map<string, { status: boolean; timestamp: number }>();
const VISITED_STATUS_CACHE_EXPIRATION = 7 * 24 * 60 * 60 * 1000;

/**
 * Helper function to ensure all place data is normalized for Firestore
 */
const normalizePlaceData = (place: any) => {
  return {
    place_id: place.place_id || place.id || `place-${Date.now()}`,
    id: place.id || place.place_id || `place-${Date.now()}`,
    name: place.name || "Unnamed Place",
    vicinity: place.vicinity || place.formatted_address || "",
    formatted_address: place.formatted_address || place.vicinity || "",
    geometry: {
      location: {
        lat: place.geometry?.location?.lat || 0,
        lng: place.geometry?.location?.lng || 0,
      },
    },
    description: place.description || place.editorial_summary?.overview || "",
    types: Array.isArray(place.types) ? place.types : [],
    rating: typeof place.rating === "number" ? place.rating : null,
    user_ratings_total: place.user_ratings_total || 0,
    photos: Array.isArray(place.photos) ? place.photos : [],
    formatted_phone_number: place.formatted_phone_number || place.phone || "",
    website: place.website || "",
    url: place.url || "",
    visitedAt: place.visitedAt || new Date().toISOString(),
    visitDate: place.visitedAt || new Date().toISOString(),
    isVisited: true,
    country: extractCountryFromPlace(place) || "Unknown",
    city: extractCityFromPlace(place) || "Unknown",
    category: extractCategoryFromPlace(place) || "Other",
    location: {
      latitude: place.geometry?.location?.lat || 0,
      longitude: place.geometry?.location?.lng || 0,
    },
  };
};

export const isPlaceVisited = async (placeId: string): Promise<boolean> => {
  try {
    if (!placeId) {
      console.log("Cannot check if visited: no placeId provided");
      return false;
    }
    const cachedStatus = visitedStatusCache.get(placeId);
    if (cachedStatus && Date.now() - cachedStatus.timestamp < VISITED_STATUS_CACHE_EXPIRATION) {
      return cachedStatus.status;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("No user logged in, checking local storage only");
      const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
      if (visitedPlacesJSON) {
        const visitedPlaces = JSON.parse(visitedPlacesJSON);
        const isVisitedLocal = visitedPlaces.some((place: any) => place.place_id === placeId);

        visitedStatusCache.set(placeId, {
          status: isVisitedLocal,
          timestamp: Date.now(),
        });

        return isVisitedLocal;
      }
      visitedStatusCache.set(placeId, {
        status: false,
        timestamp: Date.now(),
      });

      return false;
    }
    const placeDocRef = doc(db, "users", currentUser.uid, "visitedPlaces", placeId);
    const placeDoc = await getDoc(placeDocRef);

    if (placeDoc.exists()) {
      const data = placeDoc.data();
      if (data && !data._isInitDocument) {
        visitedStatusCache.set(placeId, {
          status: true,
          timestamp: Date.now(),
        });

        return true;
      }
    }

    const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
    if (visitedPlacesJSON) {
      const visitedPlaces = JSON.parse(visitedPlacesJSON);
      const isVisitedLocal = visitedPlaces.some((place: any) => place.place_id === placeId);

      visitedStatusCache.set(placeId, {
        status: isVisitedLocal,
        timestamp: Date.now(),
      });

      if (isVisitedLocal) {
        return true;
      }
    }

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

export const saveVisitedPlace = async (place: any): Promise<boolean> => {
  try {
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

    const alreadyVisited = await isPlaceVisited(placeId);
    if (alreadyVisited) {
      console.log(`Place ${place.name || "Unknown"} already visited, not saving again`);
      return true;
    }
    const visitTime = new Date();
    const normalizedPlace = normalizePlaceData({
      ...place,
      visitedAt: visitTime.toISOString(),
      isVisited: true,
    });

    const currentUser = auth.currentUser;
    if (currentUser) {
      const placeDocRef = doc(db, "users", currentUser.uid, "visitedPlaces", placeId);
      await setDoc(placeDocRef, {
        ...normalizedPlace,
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
      visitedStatusCache.set(placeId, {
        status: true,
        timestamp: Date.now(),
      });
    }
    try {
      const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
      let visitedPlaces = visitedPlacesJSON ? JSON.parse(visitedPlacesJSON) : [];
      if (!visitedPlaces.some((p: any) => p.place_id === placeId)) {
        visitedPlaces.push(normalizedPlace);
        await AsyncStorage.setItem("visitedPlaces", JSON.stringify(visitedPlaces));
        console.log(`Added place to local storage cache: ${placeId}`);
      }
    } catch (localStorageError) {
      console.warn("Error updating local storage:", localStorageError);
    }

    console.log(`Successfully saved ${normalizedPlace.name} as visited`);
    return true;
  } catch (error) {
    console.error("Error saving visited place:", error);
    return false;
  }
};

export const getVisitedPlaces = async (): Promise<any[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("No user logged in, getting from local storage");

      const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
      if (visitedPlacesJSON) {
        const parsedPlaces = JSON.parse(visitedPlacesJSON);
        return parsedPlaces.map((place: any) => normalizePlaceData(place));
      }

      return [];
    }

    const visitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
    const query_ = query(visitedPlacesRef, orderBy("visitedAt", "desc"));
    const snapshot = await getDocs(query_);

    if (snapshot.empty) {
      console.log("No visited places found in Firestore");

      const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
      if (visitedPlacesJSON) {
        const parsedPlaces = JSON.parse(visitedPlacesJSON);
        return parsedPlaces.map((place: any) => normalizePlaceData(place));
      }

      return [];
    }

    const visitedPlaces = snapshot.docs.map((doc) => {
      const data = doc.data();

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

export const getVisitedPlaceDetails = async (placeId: string, userId = null) => {
  try {
    const currentUser = userId || auth.currentUser?.uid;

    if (!currentUser) {
      console.log("No authenticated user found");
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

    const placeDocRef = doc(db, "users", currentUser, "visitedPlaces", placeId);
    const placeDoc = await getDoc(placeDocRef);

    if (placeDoc.exists()) {
      console.log(`Retrieved visited place details for ${placeId} from firebase`);
      const placeData = placeDoc.data();
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

function extractCountryFromPlace(place: any): string {
  if (place.address_components && Array.isArray(place.address_components)) {
    const countryComponent = place.address_components.find(
      (component: any) => component.types && component.types.includes("country")
    );
    if (countryComponent) {
      return countryComponent.long_name;
    }
  }

  if (place.formatted_address) {
    const addressParts = place.formatted_address.split(",");
    if (addressParts.length > 1) {
      return addressParts[addressParts.length - 1].trim();
    }
  }

  return "Unknown";
}

function extractCityFromPlace(place: any): string {
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

  if (place.vicinity) {
    const parts = place.vicinity.split(",");
    if (parts.length > 0) {
      return parts[0].trim();
    }
  }
  return "Unknown";
}

function extractCategoryFromPlace(place: any): string {
  if (place.types && Array.isArray(place.types) && place.types.length > 0) {
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
    for (const type of place.types) {
      if (typeMapping[type]) {
        return typeMapping[type];
      }
    }
    return place.types[0]
      .replace(/_/g, " ")
      .split(" ")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return "Other";
}

export const checkVisitedPlaces = async (places: any[]): Promise<any[]> => {
  try {
    if (!places || places.length === 0) {
      return [];
    }

    const placeIds = places.map((place) => place.place_id);

    const visitedStatusMap = new Map();

    const uncheckedPlaceIds = [];

    for (const placeId of placeIds) {
      const cachedStatus = visitedStatusCache.get(placeId);
      if (cachedStatus && Date.now() - cachedStatus.timestamp < VISITED_STATUS_CACHE_EXPIRATION) {
        visitedStatusMap.set(placeId, cachedStatus.status);
      } else {
        uncheckedPlaceIds.push(placeId);
      }
    }

    const currentUser = auth.currentUser;
    if (currentUser && uncheckedPlaceIds.length > 0) {
      const batchSize = 10;

      for (let i = 0; i < uncheckedPlaceIds.length; i += batchSize) {
        const batch = uncheckedPlaceIds.slice(i, i + batchSize);
        const placeResults = await Promise.all(
          batch.map((id) => getDoc(doc(db, "users", currentUser.uid, "visitedPlaces", id)))
        );

        placeResults.forEach((docSnapshot, index) => {
          const placeId = batch[index];
          const isVisited = docSnapshot.exists();

          visitedStatusMap.set(placeId, isVisited);

          visitedStatusCache.set(placeId, {
            status: isVisited,
            timestamp: Date.now(),
          });
        });
      }
    } else if (uncheckedPlaceIds.length > 0) {
      const visitedPlacesJSON = await AsyncStorage.getItem("visitedPlaces");
      if (visitedPlacesJSON) {
        const localVisitedPlaces = JSON.parse(visitedPlacesJSON);
        const localVisitedIds = new Set(localVisitedPlaces.map((p: any) => p.place_id));

        uncheckedPlaceIds.forEach((placeId) => {
          const isVisited = localVisitedIds.has(placeId);
          visitedStatusMap.set(placeId, isVisited);

          visitedStatusCache.set(placeId, {
            status: isVisited,
            timestamp: Date.now(),
          });
        });
      } else {
        uncheckedPlaceIds.forEach((placeId) => {
          visitedStatusMap.set(placeId, false);

          visitedStatusCache.set(placeId, {
            status: false,
            timestamp: Date.now(),
          });
        });
      }
    }

    return places.map((place) => ({
      ...place,
      isVisited: visitedStatusMap.get(place.place_id) || false,
    }));
  } catch (error) {
    console.error("Error checking visited places:", error);
    return places.map((place) => ({ ...place, isVisited: false }));
  }
};

export const syncVisitedPlaces = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("Cannot sync visited places: No user logged in");
      return false;
    }

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

    const batchSize = 10;
    let successCount = 0;

    for (let i = 0; i < localVisitedPlaces.length; i += batchSize) {
      const batch = localVisitedPlaces.slice(i, i + batchSize);

      const savePromises = batch.map(async (place: any) => {
        const placeId = place.place_id;
        const placeDocRef = doc(db, "users", currentUser.uid, "visitedPlaces", placeId);

        const placeDoc = await getDoc(placeDocRef);
        if (placeDoc.exists()) {
          return true;
        }

        const normalizedPlace = normalizePlaceData(place);
        await setDoc(placeDocRef, {
          ...normalizedPlace,
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

export const clearVisitedStatusCache = () => {
  visitedStatusCache.clear();
};
