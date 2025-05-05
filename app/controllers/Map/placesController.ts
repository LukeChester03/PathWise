import { Place, PlaceDetails, NearbyPlacesResponse } from "../../types/MapTypes";
import { Alert } from "react-native";
import { haversineDistance } from "../../utils/mapUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { hasQuotaAvailable, recordApiCall } from "./quotaController";
import { GOOGLE_MAPS_APIKEY } from "../../constants/Map/mapConstants";
import { isPlaceVisited } from "../../controllers/Map/visitedPlacesController";
import NetInfo from "@react-native-community/netinfo";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  serverTimestamp,
  GeoPoint,
  Timestamp,
  addDoc,
  updateDoc,
  writeBatch,
  increment,
  limit,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";

const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;
const SEARCH_RADIUS_KM = 25;
const SEARCH_RADIUS_METERS = SEARCH_RADIUS_KM * 1000;
const MAX_PLACES_TO_FETCH = 100;
const RECACHE_THRESHOLD_KM = 20;
const CACHE_EXPIRATION_TIME = TWO_MONTHS_MS;
const LOCAL_CACHE_KEY = "local_places_cache_v3";
const LOCAL_DETAILS_CACHE_KEY = "place_details_cache_v2";
const DETAILS_CACHE_SIZE = 200;
const MAX_DETAILS_TO_FETCH = 20;
const DETAILS_REFRESH_THRESHOLD = TWO_MONTHS_MS;
const BACKGROUND_FETCH_DELAY = 500;
const BATCH_SIZE = 10;
const CACHE_CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000;
const LAST_CLEANUP_KEY = "last_cache_cleanup";
const MIN_TOURISM_SCORE_THRESHOLD = 40;
const DEFINITELY_NOT_TOURIST_SCORE = -50;
const MAX_PAGES = 2;

const NON_TOURIST_TYPES = [
  "restaurant",
  "cafe",
  "food",
  "store",
  "shop",
  "lodging",
  "bar",
  "grocery_or_supermarket",
  "gas_station",
  "parking",
  "pharmacy",
  "bank",
  "atm",
  "hospital",
  "doctor",
  "dentist",
  "salon",
  "school",
  "subway_station",
  "train_station",
  "bus_station",
  "shopping_mall",
  "convenience_store",
  "supermarket",
  "laundry",
  "post_office",
  "political",
  "real_estate_agency",
  "storage",
  "hardware_store",
  "car_dealer",
  "car_rental",
  "car_repair",
  "car_wash",
  "electrician",
  "plumber",
  "local_government_office",
  "transit_station",
  "airport",
];

const TOURIST_TYPES = [
  "tourist_attraction",
  "museum",
  "aquarium",
  "art_gallery",
  "zoo",
  "landmark",
  "castle",
  "historic",
  "monument",
  "amusement_park",
  "national_park",
  "natural_feature",
  "park",
  "point_of_interest",
  "church",
  "mosque",
  "temple",
  "cathedral",
  "synagogue",
  "archaeological_site",
  "unesco_site",
];

const HIGH_PRIORITY_TOURIST_TYPES = [
  "tourist_attraction",
  "museum",
  "aquarium",
  "art_gallery",
  "zoo",
  "landmark",
  "castle",
  "monument",
  "national_park",
  "cathedral",
  "archaeological_site",
  "unesco_site",
];

const TOURIST_KEYWORDS = [
  "attraction",
  "landmark",
  "culture",
  "heritage",
  "nature",
  "park",
  "historical",
  "monument",
  "tourism",
  "famous",
  "castle",
  "palace",
  "scenic",
  "viewpoint",
  "artwork",
  "gallery",
  "exhibit",
  "tour",
  "statue",
  "cathedral",
  "temple",
  "ruins",
  "ancient",
  "trail",
  "overlook",
  "viewpoint",
  "festival",
  "national",
  "memorial",
  "historic",
  "museum",
  "visitor",
  "exhibition",
  "hall",
  "center",
  "centre",
  "gallery",
  "queens",
  "kings",
  "royal",
  "gardens",
];

const NON_TOURIST_KEYWORDS = [
  "railway station",
  "train station",
  "bus station",
  "airport",
  "terminal",
  "supermarket",
  "grocery",
  "shopping centre",
  "mall",
  "hospital",
  "clinic",
  "doctor",
  "school",
  "university",
  "college",
  "gas station",
  "petrol station",
  "police",
  "council",
  "office",
];

const STANDARD_DESCRIPTIONS = {
  museum: "A cultural museum showcasing significant exhibits and artifacts worth exploring.",
  art_gallery: "An art gallery featuring creative works by artists from around the world.",
  park: "A scenic park offering natural beauty and outdoor recreation opportunities.",
  historic: "A historic site with significant cultural and historical importance.",
  monument: "A notable monument commemorating an important person or event.",
  church: "A beautiful church with architectural and historical significance.",
  mosque: "A mosque with cultural and religious significance in the local community.",
  temple: "A temple of cultural and spiritual significance worth visiting.",
  castle: "A historic castle with architectural prominence and historical stories.",
  palace: "A magnificent palace showcasing historical grandeur and cultural heritage.",
  zoo: "A zoo featuring diverse wildlife from around the world.",
  aquarium: "An aquarium showcasing marine life and aquatic ecosystems.",
  amusement_park: "An amusement park offering entertainment and exciting attractions.",
  natural_feature: "A natural landmark with scenic beauty and ecological significance.",
  tourist_attraction: "A popular tourist destination with cultural or historical significance.",
  point_of_interest: "A noteworthy location with unique features worth discovering.",
  default: "A popular destination worth exploring during your visit.",
};

interface FirebaseCacheEntry {
  id: string;
  centerLocation: GeoPoint;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  timestamp: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
  placeIds: string[];
}

interface MemoryCache {
  cacheEntry: FirebaseCacheEntry | null;
  places: Place[];
  lastUpdated: number;
}

interface DetailsCacheEntry {
  placeId: string;
  place: Place;
  fetchedAt: number;
  expiresAt: number;
  lastViewed?: number;
}

let memoryCache: MemoryCache = {
  cacheEntry: null,
  places: [],
  lastUpdated: 0,
};

let detailsCache: Map<string, DetailsCacheEntry> = new Map();

let detailsFetchQueue: Set<string> = new Set();

let isProcessingBackground = false;
let detailsFetchPromises: Map<string, Promise<Place | null>> = new Map();

let lastCacheCleanupTime = 0;

const safeGetDate = (timestamp: any): Date => {
  if (!timestamp) {
    console.log("[placesController] Timestamp is undefined or null, using current date");
    return new Date();
  }

  if (timestamp && typeof timestamp.toDate === "function") {
    try {
      return timestamp.toDate();
    } catch (e) {
      console.error("[placesController] Error converting Firestore timestamp:", e);
      return new Date();
    }
  }

  if (
    timestamp &&
    typeof timestamp === "object" &&
    "seconds" in timestamp &&
    "nanoseconds" in timestamp
  ) {
    try {
      return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    } catch (e) {
      console.error("[placesController] Error reconstructing date from serialized Timestamp:", e);
      return new Date();
    }
  }

  if (typeof timestamp === "number") {
    return new Date(timestamp);
  }

  if (timestamp instanceof Date) {
    return timestamp;
  }

  if (typeof timestamp === "string") {
    try {
      return new Date(timestamp);
    } catch (e) {
      console.error("[placesController] Invalid timestamp string format:", timestamp);
      return new Date();
    }
  }

  console.error("[placesController] Unrecognized timestamp format:", timestamp);
  return new Date();
};

const sanitizeForFirebase = (data: any): any => {
  if (data === undefined) {
    return null;
  }

  if (data === null || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirebase(item));
  }

  const result: any = {};
  for (const key in data) {
    if (typeof data[key] === "function" || typeof data[key] === "symbol") {
      continue;
    }

    if (key === "hasFullDetails" || key === "detailsFetchedAt") {
      continue;
    }

    result[key] = sanitizeForFirebase(data[key]);
  }

  return result;
};

const getAreaKey = (lat: number, lng: number): string => {
  // Round to 2 decimal places (about 1km precision)
  const latKey = Math.floor(lat * 100) / 100;
  const lngKey = Math.floor(lng * 100) / 100;
  return `${latKey},${lngKey}`;
};

const isCacheEntryValidForPosition = (
  cacheEntry: FirebaseCacheEntry,
  latitude: number,
  longitude: number
): boolean => {
  const now = new Date();

  if (cacheEntry.expiresAt) {
    const expiryDate = safeGetDate(cacheEntry.expiresAt);
    if (now > expiryDate) {
      console.log("[placesController] Cache entry expired based on explicit expiresAt");
      return false;
    }
  } else {
    const cacheDate = safeGetDate(cacheEntry.timestamp);
    const ageMs = now.getTime() - cacheDate.getTime();

    if (ageMs > CACHE_EXPIRATION_TIME) {
      console.log(
        `[placesController] Cache entry expired (${Math.round(
          ageMs / (1000 * 60 * 60 * 24)
        )} days old)`
      );
      return false;
    }
  }

  const distance = haversineDistance(
    cacheEntry.centerLatitude,
    cacheEntry.centerLongitude,
    latitude,
    longitude
  );

  const distanceKm = distance / 1000;
  if (distanceKm > RECACHE_THRESHOLD_KM) {
    console.log(
      `[placesController] Current position is ${distanceKm.toFixed(
        1
      )}km from cache center, beyond ${RECACHE_THRESHOLD_KM}km threshold`
    );
    return false;
  }

  return true;
};

const cleanupExpiredCacheEntries = async (): Promise<void> => {
  const now = Date.now();

  const lastCleanup = await AsyncStorage.getItem(LAST_CLEANUP_KEY);
  const lastCleanupTime = lastCleanup ? parseInt(lastCleanup, 10) : 0;

  if (now - lastCleanupTime < CACHE_CLEANUP_INTERVAL) {
    console.log("[placesController] Skipping cache cleanup, last cleanup was recent");
    return;
  }

  console.log("[placesController] Starting cache cleanup process");

  try {
    const expiredDetailIds: string[] = [];
    detailsCache.forEach((entry, id) => {
      if (now > entry.expiresAt) {
        expiredDetailIds.push(id);
      }
    });

    expiredDetailIds.forEach((id) => detailsCache.delete(id));
    console.log(
      `[placesController] Removed ${expiredDetailIds.length} expired entries from details cache`
    );

    if (auth.currentUser) {
      try {
        const cachesRef = collection(db, "placeCaches");
        const cachesSnapshot = await getDocs(cachesRef);

        const batch = writeBatch(db);
        let batchCount = 0;
        let deleteCount = 0;

        for (const cacheDoc of cachesSnapshot.docs) {
          const cacheData = cacheDoc.data();
          let isExpired = false;

          if (cacheData.expiresAt) {
            const expiryDate = safeGetDate(cacheData.expiresAt);
            isExpired = new Date() > expiryDate;
          } else {
            const timestamp = safeGetDate(cacheData.timestamp);
            isExpired = now - timestamp.getTime() > CACHE_EXPIRATION_TIME;
          }

          if (isExpired) {
            batch.delete(doc(db, "placeCaches", cacheDoc.id));
            deleteCount++;
            batchCount++;

            if (batchCount >= BATCH_SIZE) {
              await batch.commit();
              batchCount = 0;
            }
          }
        }

        if (batchCount > 0) {
          await batch.commit();
        }

        console.log(
          `[placesController] Deleted ${deleteCount} expired cache entries from Firebase`
        );
      } catch (error) {
        console.error("[placesController] Error cleaning up Firebase cache:", error);
      }

      try {
        const twoMonthsAgo = new Date(now - CACHE_EXPIRATION_TIME);
        const detailsRef = collection(db, "placeDetails");
        const oldDetailsQuery = query(
          detailsRef,
          where("fetchedAt", "<", Timestamp.fromDate(twoMonthsAgo)),
          limit(BATCH_SIZE * 5)
        );

        const oldDetailsSnapshot = await getDocs(oldDetailsQuery);

        if (!oldDetailsSnapshot.empty) {
          const batch = writeBatch(db);
          let batchCount = 0;

          oldDetailsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
            batchCount++;

            if (batchCount >= BATCH_SIZE) {
              batch.commit().catch((e) => console.error("Error committing delete batch:", e));
              batchCount = 0;
            }
          });

          if (batchCount > 0) {
            batch.commit().catch((e) => console.error("Error committing final delete batch:", e));
          }

          console.log(
            `[placesController] Deleted ${oldDetailsSnapshot.size} old place details from Firebase`
          );
        }
      } catch (error) {
        console.error("[placesController] Error cleaning up old place details:", error);
      }
    }

    await AsyncStorage.setItem(LAST_CLEANUP_KEY, now.toString());
    lastCacheCleanupTime = now;

    console.log("[placesController] Cache cleanup completed");
  } catch (error) {
    console.error("[placesController] Error during cache cleanup:", error);
  }
};

const initializeCaches = async () => {
  try {
    const now = Date.now();

    cleanupExpiredCacheEntries().catch((e) =>
      console.error("[placesController] Error during cache cleanup:", e)
    );

    const cacheData = await AsyncStorage.getItem(LOCAL_CACHE_KEY);
    if (cacheData) {
      const parsedCache = JSON.parse(cacheData);
      if (
        parsedCache.places &&
        Array.isArray(parsedCache.places) &&
        parsedCache.places.length > 0
      ) {
        const isCacheExpired = parsedCache.expiresAt
          ? now > parsedCache.expiresAt
          : now - parsedCache.timestamp > CACHE_EXPIRATION_TIME;

        if (!isCacheExpired) {
          memoryCache = {
            cacheEntry: parsedCache.cacheEntry,
            places: parsedCache.places,
            lastUpdated: parsedCache.timestamp || Date.now(),
          };
          console.log(
            `[placesController] Loaded ${memoryCache.places.length} places from local storage`
          );
        } else {
          console.log("[placesController] Local cache is expired, not loading");
        }
      }
    }

    const detailsData = await AsyncStorage.getItem(LOCAL_DETAILS_CACHE_KEY);
    if (detailsData) {
      const parsedDetails = JSON.parse(detailsData);
      if (Array.isArray(parsedDetails) && parsedDetails.length > 0) {
        detailsCache = new Map();
        parsedDetails.forEach((entry: DetailsCacheEntry) => {
          const isExpired = entry.expiresAt
            ? now > entry.expiresAt
            : now - entry.fetchedAt > DETAILS_REFRESH_THRESHOLD;

          if (!isExpired) {
            if (!entry.expiresAt) {
              entry.expiresAt = entry.fetchedAt + DETAILS_REFRESH_THRESHOLD;
            }
            detailsCache.set(entry.placeId, entry);
          }
        });
        console.log(
          `[placesController] Loaded ${detailsCache.size} valid place details from local storage`
        );
      }
    }
  } catch (error) {
    console.error("[placesController] Error initializing caches:", error);
  }
};

//save caches to local storage
const persistCaches = async () => {
  try {
    if (memoryCache.places.length > 0) {
      const now = Date.now();
      const cacheData = {
        cacheEntry: memoryCache.cacheEntry,
        places: memoryCache.places,
        timestamp: now,
        expiresAt: now + CACHE_EXPIRATION_TIME,
      };
      await AsyncStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cacheData));
    }

    if (detailsCache.size > 0) {
      const detailsArray = Array.from(detailsCache.values());
      detailsArray.sort((a, b) => (b.lastViewed || 0) - (a.lastViewed || 0));
      const limitedDetails = detailsArray.slice(0, DETAILS_CACHE_SIZE);
      await AsyncStorage.setItem(LOCAL_DETAILS_CACHE_KEY, JSON.stringify(limitedDetails));
    }

    console.log("[placesController] Saved caches to local storage");
  } catch (error) {
    console.error("[placesController] Error persisting caches:", error);
  }
};

initializeCaches();

/**
 * Check if place details need a refresh based on explicit expiration or age
 */
const needsDetailsRefresh = (detailsEntry: DetailsCacheEntry): boolean => {
  const now = Date.now();

  if (detailsEntry.expiresAt) {
    return now > detailsEntry.expiresAt;
  }

  const age = now - detailsEntry.fetchedAt;
  return age > DETAILS_REFRESH_THRESHOLD;
};

/*
 * get cache entries for current pos
 */
const fetchCacheEntryForPosition = async (
  latitude: number,
  longitude: number
): Promise<FirebaseCacheEntry | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("[placesController] No user logged in, cannot access Firebase cache");
      return null;
    }

    const areaKey = getAreaKey(latitude, longitude);
    const directCacheRef = doc(db, "placeCaches", areaKey);
    const directCacheDoc = await getDoc(directCacheRef);

    if (directCacheDoc.exists()) {
      const cacheData = directCacheDoc.data() as FirebaseCacheEntry;
      cacheData.id = directCacheDoc.id;

      try {
        safeGetDate(cacheData.timestamp);
      } catch (e) {
        console.warn("[placesController] Invalid timestamp in cache entry:", e);
      }

      if (isCacheEntryValidForPosition(cacheData, latitude, longitude)) {
        console.log(`[placesController] Found valid cache entry for position: ${areaKey}`);
        return cacheData;
      }
    }

    const placeCachesRef = collection(db, "placeCaches");
    const cachesQuery = query(
      placeCachesRef,
      where("centerLatitude", ">=", latitude - 0.5),
      where("centerLatitude", "<=", latitude + 0.5)
    );

    const querySnapshot = await getDocs(cachesQuery);

    if (!querySnapshot.empty) {
      let closestCache: FirebaseCacheEntry | null = null;
      let minDistance = Infinity;

      querySnapshot.forEach((doc) => {
        const cacheData = doc.data() as FirebaseCacheEntry;
        cacheData.id = doc.id;

        if (isCacheEntryValidForPosition(cacheData, latitude, longitude)) {
          const distance = haversineDistance(
            cacheData.centerLatitude,
            cacheData.centerLongitude,
            latitude,
            longitude
          );

          if (distance < minDistance) {
            minDistance = distance;
            closestCache = cacheData;
          }
        }
      });

      if (closestCache) {
        console.log(
          `[placesController] Found valid cache entry ${closestCache.id} at distance ${(
            minDistance / 1000
          ).toFixed(1)}km`
        );
        return closestCache;
      }
    }

    console.log(`[placesController] No valid cache entry found for position`);
    return null;
  } catch (error) {
    console.error("[placesController] Error fetching cache entry:", error);
    return null;
  }
};

/**
 * Create a new cache entry in Firebase
 */
const createNewCacheEntry = async (
  latitude: number,
  longitude: number,
  places: Place[]
): Promise<FirebaseCacheEntry | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("[placesController] No user logged in, cannot create Firebase cache");
      return null;
    }

    const areaKey = getAreaKey(latitude, longitude);
    const now = new Date();
    const expiryDate = new Date(now.getTime() + CACHE_EXPIRATION_TIME);

    const placeIds: string[] = [];

    const batchSize = BATCH_SIZE;

    for (let i = 0; i < places.length; i += batchSize) {
      const batch = writeBatch(db);
      const currentBatch = places.slice(i, i + batchSize);

      console.log(
        `[placesController] Processing batch ${Math.floor(i / batchSize) + 1} with ${
          currentBatch.length
        } places`
      );

      for (const place of currentBatch) {
        const placeId = place.place_id;
        placeIds.push(placeId);

        const sanitizedPlace = sanitizeForFirebase(place);

        const placeData = {
          ...sanitizedPlace,
          geometry: {
            location: new GeoPoint(place.geometry.location.lat, place.geometry.location.lng),
          },
          cachedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(expiryDate),
          viewCount: increment(0),
        };

        const placeRef = doc(db, "places", placeId);
        batch.set(placeRef, placeData, { merge: true });
      }

      await batch.commit();
      console.log(`[placesController] Committed batch ${Math.floor(i / batchSize) + 1}`);
    }

    const cacheEntry: FirebaseCacheEntry = {
      id: areaKey,
      centerLocation: new GeoPoint(latitude, longitude),
      centerLatitude: latitude,
      centerLongitude: longitude,
      radiusKm: SEARCH_RADIUS_KM,
      timestamp: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiryDate),
      placeIds: placeIds,
    };

    const cacheRef = doc(db, "placeCaches", areaKey);
    await setDoc(cacheRef, cacheEntry);

    console.log(
      `[placesController] Created new cache entry with ${places.length} places: ${areaKey}`
    );
    return cacheEntry;
  } catch (error) {
    console.error("[placesController] Error creating cache entry:", error);
    return null;
  }
};

/**
 * Fetch all places for a cache entry
 */
const fetchPlacesForCacheEntry = async (cacheEntry: FirebaseCacheEntry): Promise<Place[]> => {
  try {
    const places: Place[] = [];

    const placeIds = cacheEntry.placeIds;
    const chunkSize = BATCH_SIZE;

    for (let i = 0; i < placeIds.length; i += chunkSize) {
      const chunk = placeIds.slice(i, i + chunkSize);
      const placeDocs = await Promise.all(
        chunk.map((placeId) => getDoc(doc(db, "places", placeId)))
      );

      placeDocs.forEach((placeDoc) => {
        if (placeDoc.exists()) {
          const placeData = placeDoc.data();

          const place: Place = {
            ...placeData,
            geometry: {
              location: {
                lat: placeData.geometry.location.latitude,
                lng: placeData.geometry.location.longitude,
              },
            },
          } as Place;

          places.push(place);
        }
      });
    }

    console.log(`[placesController] Fetched ${places.length} places from Firebase for cache entry`);
    return places;
  } catch (error) {
    console.error("[placesController] Error fetching places for cache entry:", error);
    return [];
  }
};

const getPlaceDescription = (place: any): string => {
  if (place.editorial_summary?.overview) {
    return place.editorial_summary.overview;
  }

  if (place.description) {
    return place.description;
  }

  if (place.types && place.types.length > 0) {
    for (const type of place.types) {
      const typeKey = type as keyof typeof STANDARD_DESCRIPTIONS;
      if (STANDARD_DESCRIPTIONS[typeKey]) {
        return STANDARD_DESCRIPTIONS[typeKey];
      }
    }
  }

  return STANDARD_DESCRIPTIONS.default;
};

const hasAnyType = (place: any, typeList: string[]): boolean => {
  if (!place.types || !Array.isArray(place.types)) return false;
  return place.types.some((type: string) => typeList.includes(type));
};

/**
 * Check if a place name has any keywords
 */
const containsAnyKeyword = (place: any, keywordList: string[]): boolean => {
  if (!place.name && !place.vicinity) return false;

  const nameLower = (place.name || "").toLowerCase();
  const vicinityLower = (place.vicinity || "").toLowerCase();

  return keywordList.some(
    (keyword) =>
      nameLower.includes(keyword.toLowerCase()) || vicinityLower.includes(keyword.toLowerCase())
  );
};

/**
 * Calculate a tourism score for a place to identify places
 */
const calculateTourismScore = (place: any): number => {
  let score = 0;
  if (hasAnyType(place, NON_TOURIST_TYPES)) {
    score -= 20;
    const mightBeHistoric =
      hasAnyType(place, ["historic"]) ||
      containsAnyKeyword(place, ["historic", "heritage", "museum", "attraction"]);

    if (!mightBeHistoric) {
      if (containsAnyKeyword(place, NON_TOURIST_KEYWORDS)) {
        return DEFINITELY_NOT_TOURIST_SCORE;
      }
    }
  }
  if (hasAnyType(place, HIGH_PRIORITY_TOURIST_TYPES)) {
    score += 60;
  } else if (hasAnyType(place, TOURIST_TYPES)) {
    score += 40;
  }
  if (hasAnyType(place, ["museum"])) score += 20;
  if (hasAnyType(place, ["park"])) score += 15;
  if (hasAnyType(place, ["tourist_attraction"])) score += 20;
  if (hasAnyType(place, ["historic"])) score += 15;
  if (hasAnyType(place, ["natural_feature"])) score += 15;

  if (place.rating && place.user_ratings_total) {
    score += (place.rating - 3) * 5;

    if (place.user_ratings_total > 100) {
      score += (place.rating - 3) * 5;
    }

    score += Math.min(Math.log(place.user_ratings_total) * 2, 20);
  }

  if (place.photos && place.photos.length > 0) {
    score += Math.min(place.photos.length * 2, 15);
  }

  const nameLower = (place.name || "").toLowerCase();
  const vicinityLower = (place.vicinity || "").toLowerCase();

  let keywordMatches = 0;
  for (const keyword of TOURIST_KEYWORDS) {
    const keywordLower = keyword.toLowerCase();
    if (nameLower.includes(keywordLower)) {
      keywordMatches += 2;
    }
    if (vicinityLower.includes(keywordLower)) {
      keywordMatches += 1;
    }
  }

  score += keywordMatches * 2;

  let nonTouristMatches = 0;
  for (const keyword of NON_TOURIST_KEYWORDS) {
    const keywordLower = keyword.toLowerCase();
    if (nameLower.includes(keywordLower)) {
      nonTouristMatches += 2;
    }
    if (vicinityLower.includes(keywordLower)) {
      nonTouristMatches += 1;
    }
  }

  score -= nonTouristMatches * 3;

  if (nameLower.includes("museum") || nameLower.includes("gallery")) score += 30;
  if (nameLower.includes("castle") || nameLower.includes("palace")) score += 30;
  if (nameLower.includes("cathedral") || nameLower.includes("church")) score += 25;
  if (nameLower.includes("monument") || nameLower.includes("memorial")) score += 25;
  if (nameLower.includes("park") && !nameLower.includes("parking")) score += 20;
  if (nameLower.includes("garden") || nameLower.includes("gardens")) score += 20;

  if (
    (nameLower.includes("station") || nameLower.includes("terminal")) &&
    !(
      nameLower.includes("historic") ||
      nameLower.includes("heritage") ||
      nameLower.includes("museum")
    )
  ) {
    score -= 40;
  }

  if (place.website && place.business_status === "OPERATIONAL") {
    score += 10;
  }

  if (place.editorial_summary && place.editorial_summary.overview) {
    score += 15;
  }

  return score;
};

const createPlaceObjectFromApiResult = (place: any, latitude: number, longitude: number): Place => {
  // Calculate distance from current location
  const distance = haversineDistance(
    latitude,
    longitude,
    place.geometry.location.lat,
    place.geometry.location.lng
  );

  return {
    place_id: place.place_id,
    id: place.id || place.place_id,
    name: place.name,
    address: place.formatted_address || place.vicinity || "Address unavailable",
    formatted_address: place.formatted_address || place.vicinity || "Address unavailable",
    geometry: place.geometry,
    description: place.editorial_summary?.overview || getPlaceDescription(place),
    types: place.types || [],
    rating: place.rating || null,
    user_ratings_total: place.user_ratings_total || null,
    price_level: place.price_level || null,
    photos: place.photos || [],
    icon: place.icon || null,
    icon_background_color: place.icon_background_color || null,
    icon_mask_base_uri: place.icon_mask_base_uri || null,
    vicinity: place.vicinity || null,
    business_status: place.business_status || null,
    distance: distance,
    website: place.website || null,
    url: place.url || null,
    formatted_phone_number: place.formatted_phone_number || null,
    opening_hours: place.opening_hours || null,
    reviews: place.reviews || [],
    tourismScore: place.tourismScore || 0,
  };
};

const checkPlaceDetailsCollection = async (placeId: string): Promise<Place | null> => {
  try {
    if (!auth.currentUser) return null;

    const detailsDocRef = doc(db, "placeDetails", placeId);
    const detailsDoc = await getDoc(detailsDocRef);

    if (detailsDoc.exists()) {
      const detailsData = detailsDoc.data();

      let needsRefresh = false;

      if (detailsData.expiresAt) {
        const expiryDate = safeGetDate(detailsData.expiresAt);
        needsRefresh = new Date() > expiryDate;
      } else {
        const fetchedAt = detailsData.fetchedAt?.toDate().getTime() || 0;
        const now = Date.now();
        const age = now - fetchedAt;
        needsRefresh = age > DETAILS_REFRESH_THRESHOLD;
      }

      const place: Place = {
        ...detailsData,
        geometry: {
          location: {
            lat: detailsData.geometry?.location?.latitude || 0,
            lng: detailsData.geometry?.location?.longitude || 0,
          },
        },
        hasFullDetails: true,
        detailsFetchedAt: detailsData.fetchedAt?.toDate().getTime() || Date.now(),
      } as Place;

      try {
        updateDoc(detailsDocRef, {
          viewCount: increment(1),
          lastViewed: serverTimestamp(),
        }).catch((e) => console.log("Error updating view stats:", e));
      } catch (statsError) {
        console.log("Error updating place view stats:", statsError);
      }

      if (!needsRefresh) {
        console.log(
          `[placesController] Found fresh details in permanent collection for: ${placeId}`
        );
        return place;
      } else {
        console.log(
          `[placesController] Found stale details in permanent collection for: ${placeId}`
        );

        NetInfo.fetch().then((state) => {
          if (state.isConnected && !detailsFetchQueue.has(placeId)) {
            console.log(`[placesController] Queuing background refresh for place: ${placeId}`);
            detailsFetchQueue.add(placeId);

            setTimeout(() => {
              fetchPlaceDetailsFromGoogle(placeId, true)
                .then(() => detailsFetchQueue.delete(placeId))
                .catch(() => detailsFetchQueue.delete(placeId));
            }, BACKGROUND_FETCH_DELAY);
          }
        });

        return place;
      }
    }

    return null;
  } catch (error) {
    console.error(`[placesController] Error checking permanent details:`, error);
    return null;
  }
};

const savePlaceDetailsPermanently = async (place: Place): Promise<void> => {
  try {
    if (!auth.currentUser) return;

    const sanitizedPlace = sanitizeForFirebase(place);

    const now = new Date();
    const expiryDate = new Date(now.getTime() + CACHE_EXPIRATION_TIME);

    const placeData = {
      ...sanitizedPlace,
      geometry: {
        location: new GeoPoint(place.geometry.location.lat, place.geometry.location.lng),
      },
      fetchedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiryDate),
      viewCount: increment(1),
      lastViewed: serverTimestamp(),
      hasFullDetails: true,
    };

    const detailsDocRef = doc(db, "placeDetails", place.place_id);
    await setDoc(detailsDocRef, placeData, { merge: true });

    console.log(`[placesController] Saved place details permanently for: ${place.name}`);
  } catch (error) {
    console.error(`[placesController] Error saving place details permanently:`, error);
    throw error;
  }
};

const fetchPlaceDetailsFromGoogle = async (
  placeId: string,
  isBackgroundRefresh = false
): Promise<Place | null> => {
  try {
    if (!isBackgroundRefresh && detailsFetchPromises.has(placeId)) {
      console.log(`[placesController] Reusing existing fetch promise for: ${placeId}`);
      return detailsFetchPromises.get(placeId)!;
    }
    const fetchPromise = (async () => {
      try {
        detailsFetchQueue.add(placeId);
        const hasQuota = await hasQuotaAvailable("places");
        console.log(`[placesController] Has quota for places API: ${hasQuota}`);

        if (!hasQuota) {
          console.warn(`[placesController] No API quota left for place details`);
          return null;
        }

        await recordApiCall("places");
        console.log(`[placesController] Fetching details from Google API for: ${placeId}`);

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?` +
            `place_id=${placeId}` +
            `&fields=place_id,name,formatted_address,rating,geometry,photos,website,url,` +
            `formatted_phone_number,opening_hours,reviews,editorial_summary,types,business_status,price_level,vicinity` +
            `&key=${GOOGLE_MAPS_APIKEY}`
        );

        const data = await response.json();

        if (data.status !== "OK" || !data.result) {
          console.warn(`[placesController] API error for place details: ${data.status}`);
          return null;
        }

        let distance = 0;
        const basicPlace = memoryCache.places.find((p) => p.place_id === placeId);
        if (basicPlace && basicPlace.distance) {
          distance = basicPlace.distance;
        } else if (memoryCache.cacheEntry) {
          distance = haversineDistance(
            memoryCache.cacheEntry.centerLatitude,
            memoryCache.cacheEntry.centerLongitude,
            data.result.geometry.location.lat,
            data.result.geometry.location.lng
          );
        }

        const tourismScore = calculateTourismScore(data.result);
        const now = Date.now();
        const expiresAt = now + CACHE_EXPIRATION_TIME;
        const detailedPlace: Place = {
          place_id: data.result.place_id,
          id: data.result.id || data.result.place_id,
          name: data.result.name || "",
          formatted_address:
            data.result.formatted_address || data.result.vicinity || "Address unavailable",
          address: data.result.formatted_address || data.result.vicinity || "Address unavailable",
          geometry: data.result.geometry,
          description:
            data.result.editorial_summary?.overview ||
            basicPlace?.description ||
            getPlaceDescription(data.result),
          types: data.result.types || [],
          rating: data.result.rating || null,
          user_ratings_total: data.result.user_ratings_total || null,
          price_level: data.result.price_level || null,
          photos: data.result.photos || [],
          icon: data.result.icon || null,
          icon_background_color: data.result.icon_background_color || null,
          icon_mask_base_uri: data.result.icon_mask_base_uri || null,
          vicinity: data.result.vicinity || null,
          business_status: data.result.business_status || null,
          distance: distance || 0,
          website: data.result.website || null,
          url: data.result.url || null,
          formatted_phone_number: data.result.formatted_phone_number || null,
          opening_hours: data.result.opening_hours || null,
          reviews: data.result.reviews || [],
          hasFullDetails: true,
          tourismScore: tourismScore,
        };

        const sanitizedPlace = sanitizeForFirebase(detailedPlace);

        try {
          await savePlaceDetailsPermanently(sanitizedPlace as Place);
        } catch (saveError) {
          console.error(`[placesController] Error saving place details permanently:`, saveError);
        }

        detailsCache.set(placeId, {
          placeId,
          place: detailedPlace,
          fetchedAt: now,
          expiresAt: expiresAt,
          lastViewed: now,
        });

        if (basicPlace) {
          const index = memoryCache.places.findIndex((p) => p.place_id === placeId);
          if (index !== -1) {
            memoryCache.places[index] = detailedPlace;
          }
        } else {
          memoryCache.places.push(detailedPlace);
        }

        if (auth.currentUser) {
          try {
            const placeRef = doc(db, "places", placeId);

            const firestorePlace = {
              ...sanitizedPlace,
              geometry: {
                location: new GeoPoint(
                  detailedPlace.geometry.location.lat,
                  detailedPlace.geometry.location.lng
                ),
              },
              updatedAt: serverTimestamp(),
              expiresAt: Timestamp.fromDate(new Date(expiresAt)),
              hasFullDetails: true,
              lastDetailsUpdate: serverTimestamp(),
              tourismScore: tourismScore,
            };

            await setDoc(placeRef, firestorePlace, { merge: true });
          } catch (updateError) {
            console.warn(`[placesController] Error updating regular place:`, updateError);
          }
        }

        persistCaches();

        return detailedPlace;
      } catch (error) {
        console.error(`[placesController] Error fetching place details from Google:`, error);
        return null;
      } finally {
        detailsFetchQueue.delete(placeId);
        setTimeout(() => {
          detailsFetchPromises.delete(placeId);
        }, 500);
      }
    })();

    if (!isBackgroundRefresh) {
      detailsFetchPromises.set(placeId, fetchPromise);
    }

    return fetchPromise;
  } catch (error) {
    console.error(`[placesController] Error setting up fetch promise:`, error);
    detailsFetchQueue.delete(placeId);
    detailsFetchPromises.delete(placeId);
    return null;
  }
};

/**
 * Fetch places with basic details and cache them
 */
export const fetchNearbyPlaces = async (
  latitude: number,
  longitude: number,
  forceRefresh: boolean = false
): Promise<NearbyPlacesResponse> => {
  try {
    console.log(
      `[placesController] fetchNearbyPlaces at ${latitude.toFixed(6)}, ${longitude.toFixed(
        6
      )}, force=${forceRefresh}`
    );
    console.log(`[placesController] Memory cache has ${memoryCache.places.length} places`);
    console.log(`[placesController] Cache entry exists? ${memoryCache.cacheEntry !== null}`);

    const authUser = auth.currentUser;
    console.log(`[placesController] Firebase auth state - User logged in: ${authUser !== null}`);

    if (!authUser) {
      console.log("[placesController] User not logged in - using cache only, no API calls");

      if (memoryCache.places.length > 0) {
        console.log(
          `[placesController] Returning ${memoryCache.places.length} cached places for unauthenticated user`
        );

        const placesWithDistance = memoryCache.places.map((place) => {
          const distance = haversineDistance(
            latitude,
            longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          );

          return {
            ...place,
            distance,
          };
        });

        const sortedByDistance = placesWithDistance
          .sort((a, b) => (a.distance || 0) - (b.distance || 0))
          .slice(0, MAX_PLACES_TO_FETCH);

        return {
          places: sortedByDistance,
          furthestDistance: SEARCH_RADIUS_METERS,
        };
      }

      console.log("[placesController] No cached places available and user not logged in");
      return {
        places: [],
        furthestDistance: SEARCH_RADIUS_METERS,
      };
    }

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected && memoryCache.places.length > 0) {
      console.log("[placesController] No network connection, using cache only");

      const placesWithDistance = memoryCache.places
        .map((place) => ({
          ...place,
          distance: haversineDistance(
            latitude,
            longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          ),
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, MAX_PLACES_TO_FETCH);

      return {
        places: placesWithDistance,
        furthestDistance: SEARCH_RADIUS_METERS,
      };
    }

    if (
      !forceRefresh &&
      memoryCache.cacheEntry &&
      memoryCache.places.length > 0 &&
      isCacheEntryValidForPosition(memoryCache.cacheEntry, latitude, longitude)
    ) {
      console.log(`[placesController] Using memory cache with ${memoryCache.places.length} places`);

      const placesWithDistance = memoryCache.places.map((place) => {
        const distance = haversineDistance(
          latitude,
          longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        );

        return {
          ...place,
          distance,
        };
      });

      const sortedByDistance = placesWithDistance
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, MAX_PLACES_TO_FETCH);

      let furthestDistance = 0;
      sortedByDistance.forEach((place) => {
        if (place.distance && place.distance > furthestDistance) {
          furthestDistance = place.distance;
        }
      });

      return {
        places: sortedByDistance,
        furthestDistance: Math.max(furthestDistance + 200, 1000),
      };
    }

    if (!forceRefresh && auth.currentUser) {
      try {
        const cacheEntry = await fetchCacheEntryForPosition(latitude, longitude);

        if (cacheEntry) {
          const places = await fetchPlacesForCacheEntry(cacheEntry);

          if (places.length > 0) {
            memoryCache = {
              cacheEntry,
              places,
              lastUpdated: Date.now(),
            };

            persistCaches();

            const placesWithDistance = places.map((place) => {
              const distance = haversineDistance(
                latitude,
                longitude,
                place.geometry.location.lat,
                place.geometry.location.lng
              );

              return {
                ...place,
                distance,
              };
            });

            const sortedByDistance = placesWithDistance
              .sort((a, b) => (a.distance || 0) - (b.distance || 0))
              .slice(0, MAX_PLACES_TO_FETCH);

            let furthestDistance = 0;
            sortedByDistance.forEach((place) => {
              if (place.distance && place.distance > furthestDistance) {
                furthestDistance = place.distance;
              }
            });

            console.log(
              `[placesController] Using Firebase cache with ${places.length} places, returning ${sortedByDistance.length} closest`
            );

            return {
              places: sortedByDistance,
              furthestDistance: Math.max(furthestDistance + 200, 1000),
            };
          }
        }
      } catch (cacheError) {
        console.error("[placesController] Error checking Firebase cache:", cacheError);
      }
    }

    const hasQuota = await hasQuotaAvailable("places");

    if (!hasQuota) {
      console.warn("[placesController] No API quota left! Using existing cache if available");

      if (memoryCache.places.length > 0) {
        const placesWithDistance = memoryCache.places
          .map((place) => {
            const distance = haversineDistance(
              latitude,
              longitude,
              place.geometry.location.lat,
              place.geometry.location.lng
            );

            return {
              ...place,
              distance,
            };
          })
          .sort((a, b) => (a.distance || 0) - (b.distance || 0))
          .slice(0, MAX_PLACES_TO_FETCH);

        return {
          places: placesWithDistance,
          furthestDistance: SEARCH_RADIUS_METERS,
        };
      }

      await initializeCaches();
      if (memoryCache.places.length > 0) {
        const placesWithDistance = memoryCache.places
          .map((place) => {
            const distance = haversineDistance(
              latitude,
              longitude,
              place.geometry.location.lat,
              place.geometry.location.lng
            );

            return {
              ...place,
              distance,
            };
          })
          .sort((a, b) => (a.distance || 0) - (b.distance || 0))
          .slice(0, MAX_PLACES_TO_FETCH);

        return {
          places: placesWithDistance,
          furthestDistance: SEARCH_RADIUS_METERS,
        };
      }

      Alert.alert(
        "Limited Data Available",
        "We've reached our daily limit for finding places. Please try again tomorrow."
      );

      return {
        places: [],
        furthestDistance: SEARCH_RADIUS_METERS,
      };
    }

    console.log(`[placesController] Fetching places from API in ${SEARCH_RADIUS_KM}km radius`);
    console.warn("API CALL BEING MADE");
    await recordApiCall("places");

    let allResults: any[] = [];
    let nextPageToken: string | null = null;
    let pageCount = 0;

    do {
      let apiUrl =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${latitude},${longitude}&` +
        `radius=${SEARCH_RADIUS_METERS}&` +
        `type=tourist_attraction|museum|art_gallery|park|amusement_park|aquarium|church|city_hall|hindu_temple|landmark|monument|mosque|synagogue|point_of_interest|natural_feature|zoo&` +
        `fields=place_id,name,formatted_address,rating,photos,geometry,types,business_status,price_level,vicinity&` +
        `key=${GOOGLE_MAPS_APIKEY}`;

      if (nextPageToken) {
        apiUrl += `&pagetoken=${nextPageToken}`;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status !== "OK") {
        console.warn(`[placesController] API returned status: ${data.status}`);
        break;
      }

      if (data.results && data.results.length > 0) {
        allResults = [...allResults, ...data.results];
        console.log(
          `[placesController] Page ${pageCount + 1}: Received ${data.results.length} places`
        );
      }

      nextPageToken = data.next_page_token || null;

      if (nextPageToken && pageCount < MAX_PAGES - 1) {
        await recordApiCall("places");
      }

      pageCount++;
    } while (nextPageToken && pageCount < MAX_PAGES);

    console.log(`[placesController] Received total of ${allResults.length} places from API`);

    if (allResults.length === 0) {
      if (memoryCache.places.length > 0) {
        return {
          places: memoryCache.places,
          furthestDistance: SEARCH_RADIUS_METERS,
        };
      }

      return {
        places: [],
        furthestDistance: SEARCH_RADIUS_METERS,
      };
    }

    allResults.forEach((place) => {
      place.tourismScore = calculateTourismScore(place);
    });

    const filteredResults = allResults.filter((place: any) => {
      if (place.tourismScore <= DEFINITELY_NOT_TOURIST_SCORE) {
        return false;
      }

      if (hasAnyType(place, HIGH_PRIORITY_TOURIST_TYPES)) {
        return !place.rating || place.rating >= 3.0;
      }

      return (
        place.tourismScore >= MIN_TOURISM_SCORE_THRESHOLD || (place.rating && place.rating >= 4.5)
      );
    });

    let basicPlaces: Place[] = filteredResults.map((place: any) =>
      createPlaceObjectFromApiResult(place, latitude, longitude)
    );

    basicPlaces.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    basicPlaces = basicPlaces.slice(0, MAX_PLACES_TO_FETCH);

    let furthestDistance = 0;
    basicPlaces.forEach((place) => {
      if (place.distance && place.distance > furthestDistance) {
        furthestDistance = place.distance;
      }
    });

    furthestDistance = Math.max(furthestDistance + 200, 1000);

    if (auth.currentUser) {
      createNewCacheEntry(latitude, longitude, basicPlaces)
        .then((newCacheEntry) => {
          if (newCacheEntry) {
            memoryCache = {
              cacheEntry: newCacheEntry,
              places: basicPlaces,
              lastUpdated: Date.now(),
            };

            persistCaches();
          }
        })
        .catch((error) => {
          console.error("[placesController] Error saving to Firebase:", error);
        });
    } else {
      memoryCache = {
        cacheEntry: null,
        places: basicPlaces,
        lastUpdated: Date.now(),
      };
      persistCaches();
    }

    console.log(
      `[placesController] Processed ${basicPlaces.length} places with basic info (no details pre-fetching)`
    );

    return {
      places: basicPlaces,
      furthestDistance,
    };
  } catch (error) {
    console.error("[placesController] Error in fetchNearbyPlaces:", error);

    if (memoryCache.places.length > 0) {
      return {
        places: memoryCache.places,
        furthestDistance: SEARCH_RADIUS_METERS,
      };
    }

    return {
      places: [],
      furthestDistance: SEARCH_RADIUS_METERS,
    };
  }
};

/**
 * Fetch place details on demand
 */
export const fetchPlaceDetailsOnDemand = async (placeId: string): Promise<Place | null> => {
  try {
    console.log(`[placesController] fetchPlaceDetailsOnDemand: ${placeId}`);

    if (detailsFetchPromises.has(placeId)) {
      console.log(`[placesController] Existing fetch promise found for: ${placeId}`);
      return detailsFetchPromises.get(placeId)!;
    }

    if (detailsFetchQueue.has(placeId)) {
      console.log(`[placesController] Place is already being fetched with old system, waiting`);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const cachedAfterWait = detailsCache.get(placeId);
      if (cachedAfterWait) {
        return cachedAfterWait.place;
      }
    }

    const cachedDetails = detailsCache.get(placeId);
    if (cachedDetails) {
      console.log(`[placesController] Found place in details cache: ${cachedDetails.place.name}`);

      cachedDetails.lastViewed = Date.now();

      const now = Date.now();
      const isExpired = cachedDetails.expiresAt
        ? now > cachedDetails.expiresAt
        : needsDetailsRefresh(cachedDetails);

      if (isExpired) {
        console.log(`[placesController] Details are stale, queuing background refresh`);
        NetInfo.fetch().then((state) => {
          if (state.isConnected) {
            setTimeout(() => {
              fetchPlaceDetailsFromGoogle(placeId, true);
            }, BACKGROUND_FETCH_DELAY);
          }
        });
      }

      return cachedDetails.place;
    }

    const cachedPlace = memoryCache.places.find(
      (p) => p.place_id === placeId && p.hasFullDetails && (p.reviews || p.website)
    );

    if (cachedPlace) {
      console.log(
        `[placesController] Found place with full details in memory cache: ${cachedPlace.name}`
      );

      const now = Date.now();
      detailsCache.set(placeId, {
        placeId,
        place: cachedPlace,
        fetchedAt: cachedPlace.detailsFetchedAt || now - DETAILS_REFRESH_THRESHOLD + 86400000,
        expiresAt: (cachedPlace.detailsFetchedAt || now) + DETAILS_REFRESH_THRESHOLD,
        lastViewed: now,
      });

      return cachedPlace;
    }

    const fullFetchPromise = (async () => {
      try {
        if (auth.currentUser) {
          console.log(
            `[placesController] Checking Firebase placeDetails collection for: ${placeId}`
          );
          const permanentDetails = await checkPlaceDetailsCollection(placeId);

          if (permanentDetails) {
            console.log(
              `[placesController] Found permanent details in Firebase for: ${permanentDetails.name}`
            );

            const now = Date.now();
            const fetchedAt = permanentDetails.detailsFetchedAt || now;
            detailsCache.set(placeId, {
              placeId,
              place: permanentDetails,
              fetchedAt: fetchedAt,
              expiresAt: fetchedAt + DETAILS_REFRESH_THRESHOLD,
              lastViewed: now,
            });

            return permanentDetails;
          }
        }

        console.log(
          `[placesController] Not found in Firebase, fetching from Google API: ${placeId}`
        );
        return await fetchPlaceDetailsFromGoogle(placeId);
      } finally {
        setTimeout(() => {
          detailsFetchPromises.delete(placeId);
        }, 500);
      }
    })();

    detailsFetchPromises.set(placeId, fullFetchPromise);

    return fullFetchPromise;
  } catch (error) {
    console.error(`[placesController] Error in fetchPlaceDetailsOnDemand:`, error);
    detailsFetchQueue.delete(placeId);
    detailsFetchPromises.delete(placeId);
    return null;
  }
};

/**
 * Get a place by ID
 */
export const fetchPlaceById = async (placeId: string): Promise<Place | null> => {
  try {
    console.log(`[placesController] fetchPlaceById: ${placeId}`);

    const cachedDetails = detailsCache.get(placeId);
    if (cachedDetails) {
      console.log(`[placesController] Found place in details cache: ${cachedDetails.place.name}`);

      cachedDetails.lastViewed = Date.now();

      const now = Date.now();
      const isExpired = cachedDetails.expiresAt
        ? now > cachedDetails.expiresAt
        : needsDetailsRefresh(cachedDetails);

      if (isExpired) {
        NetInfo.fetch().then((state) => {
          if (state.isConnected && !detailsFetchQueue.has(placeId)) {
            setTimeout(() => {
              fetchPlaceDetailsFromGoogle(placeId, true)
                .then(() => detailsFetchQueue.delete(placeId))
                .catch(() => detailsFetchQueue.delete(placeId));
            }, BACKGROUND_FETCH_DELAY);
          }
        });
      }

      return cachedDetails.place;
    }

    const cachedPlace = memoryCache.places.find((p) => p.place_id === placeId);
    if (cachedPlace) {
      console.log(`[placesController] Found place in memory cache: ${cachedPlace.name}`);

      if (cachedPlace.hasFullDetails) {
        const now = Date.now();
        const fetchedAt = cachedPlace.detailsFetchedAt || now;

        detailsCache.set(placeId, {
          placeId,
          place: cachedPlace,
          fetchedAt: fetchedAt,
          expiresAt: fetchedAt + DETAILS_REFRESH_THRESHOLD,
          lastViewed: now,
        });

        return cachedPlace;
      }

      const detailedPlace = await checkPlaceDetailsCollection(placeId);
      if (detailedPlace) {
        return detailedPlace;
      }

      return await fetchPlaceDetailsOnDemand(placeId);
    }

    const permanentDetails = await checkPlaceDetailsCollection(placeId);
    if (permanentDetails) {
      return permanentDetails;
    }

    if (auth.currentUser) {
      const placeDocRef = doc(db, "places", placeId);
      const placeDoc = await getDoc(placeDocRef);

      if (placeDoc.exists()) {
        const placeData = placeDoc.data();

        let isExpired = false;
        if (placeData.expiresAt) {
          const expiryDate = safeGetDate(placeData.expiresAt);
          isExpired = new Date() > expiryDate;
        } else if (placeData.fetchedAt) {
          const fetchedAt = safeGetDate(placeData.fetchedAt).getTime();
          isExpired = Date.now() - fetchedAt > DETAILS_REFRESH_THRESHOLD;
        }

        if (isExpired) {
          return await fetchPlaceDetailsOnDemand(placeId);
        }

        console.log(
          `[placesController] Found place in Firebase places collection: ${placeData.name}`
        );

        const place: Place = {
          ...placeData,
          geometry: {
            location: {
              lat: placeData.geometry.location.latitude,
              lng: placeData.geometry.location.longitude,
            },
          },
        } as Place;

        if (place.hasFullDetails) {
          const now = Date.now();
          const fetchedAt = placeData.lastDetailsUpdate?.toDate().getTime() || now;

          detailsCache.set(placeId, {
            placeId,
            place,
            fetchedAt: fetchedAt,
            expiresAt: placeData.expiresAt
              ? safeGetDate(placeData.expiresAt).getTime()
              : fetchedAt + DETAILS_REFRESH_THRESHOLD,
            lastViewed: now,
          });

          return place;
        }

        return await fetchPlaceDetailsOnDemand(placeId);
      }
    }

    return await fetchPlaceDetailsFromGoogle(placeId);
  } catch (error) {
    console.error(`[placesController] Error in fetchPlaceById:`, error);
    return null;
  }
};

export const clearPlacesCache = async (): Promise<void> => {
  memoryCache = { cacheEntry: null, places: [], lastUpdated: 0 };
  detailsCache.clear();
  await AsyncStorage.removeItem(LOCAL_CACHE_KEY);
  await AsyncStorage.removeItem(LOCAL_DETAILS_CACHE_KEY);
  console.log("[placesController] Cleared all place caches");
};

export const getCacheStats = async (): Promise<{
  memoryCache: {
    places: number;
    cacheCenter?: string;
    ageInDays?: number;
  };
  detailsCache: {
    count: number;
    freshCount: number;
    staleCount: number;
  };
  firebaseCache?: {
    areas: number;
    places: number;
    permanentDetails: number;
  };
}> => {
  let stats: any = {
    memoryCache: {
      places: memoryCache.places.length,
    },
    detailsCache: {
      count: detailsCache.size,
      freshCount: 0,
      staleCount: 0,
    },
  };

  if (memoryCache.cacheEntry) {
    stats.memoryCache.cacheCenter = `${memoryCache.cacheEntry.centerLatitude.toFixed(
      4
    )}, ${memoryCache.cacheEntry.centerLongitude.toFixed(4)}`;

    const now = new Date();
    const timestamp = safeGetDate(memoryCache.cacheEntry.timestamp);
    const ageMs = now.getTime() - timestamp.getTime();
    stats.memoryCache.ageInDays = Math.round((ageMs / (1000 * 60 * 60 * 24)) * 10) / 10;
  }

  const now = Date.now();
  detailsCache.forEach((entry) => {
    const isExpired = entry.expiresAt
      ? now > entry.expiresAt
      : now - entry.fetchedAt > DETAILS_REFRESH_THRESHOLD;

    if (!isExpired) {
      stats.detailsCache.freshCount++;
    } else {
      stats.detailsCache.staleCount++;
    }
  });

  if (auth.currentUser) {
    try {
      const cachesSnapshot = await getDocs(query(collection(db, "placeCaches"), limit(1000)));
      const placesSnapshot = await getDocs(query(collection(db, "places"), limit(1000)));
      const detailsSnapshot = await getDocs(query(collection(db, "placeDetails"), limit(1000)));

      stats.firebaseCache = {
        areas: cachesSnapshot.size,
        places: placesSnapshot.size,
        permanentDetails: detailsSnapshot.size,
      };
    } catch (error) {
      console.error("[placesController] Error getting Firebase stats:", error);
    }
  }

  return stats;
};
