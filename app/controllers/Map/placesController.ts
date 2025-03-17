// src/controllers/Map/placesController.ts
import { Place, PlaceDetails, NearbyPlacesResponse } from "../../types/MapTypes";
import { Alert } from "react-native";
import { haversineDistance } from "../../utils/mapUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { hasQuotaAvailable, recordApiCall } from "./quotaController";
import { GOOGLE_MAPS_APIKEY } from "../../constants/Map/mapConstants";
import { isPlaceVisited } from "../../controllers/Map/visitedPlacesController";
import NetInfo from "@react-native-community/netinfo";

// Firebase imports
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

// CONSTANTS FOR CACHING - STANDARDIZED TO 2 MONTHS
const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000; // 60 days in milliseconds
const SEARCH_RADIUS_KM = 25; // 25km radius (5km buffer beyond our refresh threshold)
const SEARCH_RADIUS_METERS = SEARCH_RADIUS_KM * 1000; // 25km in meters
const MAX_PLACES_TO_FETCH = 100; // Limit to 100 places
const RECACHE_THRESHOLD_KM = 20; // Only re-fetch when user moves 20km from cache center
const CACHE_EXPIRATION_TIME = TWO_MONTHS_MS; // Standardized to 2 months for all caches
const LOCAL_CACHE_KEY = "local_places_cache_v3"; // Updated version for new cache format
const LOCAL_DETAILS_CACHE_KEY = "place_details_cache_v2"; // Updated version for new cache format
const DETAILS_CACHE_SIZE = 200; // Maximum number of place details to cache locally
const MAX_DETAILS_TO_FETCH = 20; // Pre-fetch details for the closest 20 places
const DETAILS_REFRESH_THRESHOLD = TWO_MONTHS_MS; // Standardized to 2 months
const BACKGROUND_FETCH_DELAY = 500; // Delay between background detail fetches
const BATCH_SIZE = 10; // Size of batches for Firebase operations
const CACHE_CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000; // Clean cache weekly
const LAST_CLEANUP_KEY = "last_cache_cleanup"; // Key to track last cleanup time
const MIN_TOURISM_SCORE_THRESHOLD = 40; // Minimum tourism score to consider a place as a tourist attraction
const DEFINITELY_NOT_TOURIST_SCORE = -50; // Score for places that are definitely not tourist attractions
const MAX_PAGES = 2; // Reduced from 3 to 2 to limit API calls

// Types of places we want to exclude (not tourist attractions)
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
  "train_station", // Railway stations should be excluded unless specifically marked as historic
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

// Types that strongly indicate tourist attractions
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

// High-priority tourist types that should almost always be included
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

// Keywords strongly associated with tourist attractions
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

// Specific keywords that are strongly associated with non-tourist places
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

// Standard descriptions by place type for when no editorial summary is available
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

// Firebase cache structure
interface FirebaseCacheEntry {
  id: string;
  centerLocation: GeoPoint;
  centerLatitude: number; // Denormalized for easier queries
  centerLongitude: number; // Denormalized for easier queries
  radiusKm: number;
  timestamp: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp; // NEW: Explicit expiration timestamp
  placeIds: string[];
}

// In-memory cache for fast access
interface MemoryCache {
  cacheEntry: FirebaseCacheEntry | null;
  places: Place[];
  lastUpdated: number; // NEW: Track when the cache was last updated
}

// Details cache entry - Updated with explicit expiration
interface DetailsCacheEntry {
  placeId: string;
  place: Place;
  fetchedAt: number;
  expiresAt: number; // NEW: Explicit expiration time
  lastViewed?: number;
}

// In-memory cache instance
let memoryCache: MemoryCache = {
  cacheEntry: null,
  places: [],
  lastUpdated: 0,
};

// In-memory details cache
let detailsCache: Map<string, DetailsCacheEntry> = new Map();

// Fetch queue to prevent duplicate details fetches
let detailsFetchQueue: Set<string> = new Set();

// Flag to track background processing status
let isProcessingBackground = false;
let detailsFetchPromises: Map<string, Promise<Place | null>> = new Map();

// NEW: Track last cache cleanup time
let lastCacheCleanupTime = 0;

/**
 * Safe timestamp helper function
 * Works with Firestore Timestamp, Date objects, numbers, or strings
 */
const safeGetDate = (timestamp: any): Date => {
  // Case 1: undefined or null timestamp
  if (!timestamp) {
    console.log("[placesController] Timestamp is undefined or null, using current date");
    return new Date();
  }

  // Case 2: It's a Firestore Timestamp object with toDate method
  if (timestamp && typeof timestamp.toDate === "function") {
    try {
      return timestamp.toDate();
    } catch (e) {
      console.error("[placesController] Error converting Firestore timestamp:", e);
      return new Date();
    }
  }

  // Case 3: It's a serialized Firestore Timestamp object (has seconds and nanoseconds)
  if (
    timestamp &&
    typeof timestamp === "object" &&
    "seconds" in timestamp &&
    "nanoseconds" in timestamp
  ) {
    try {
      // Convert seconds to milliseconds and add nanoseconds in milliseconds
      return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    } catch (e) {
      console.error("[placesController] Error reconstructing date from serialized Timestamp:", e);
      return new Date();
    }
  }

  // Case 4: It's a numeric timestamp (milliseconds since epoch)
  if (typeof timestamp === "number") {
    return new Date(timestamp);
  }

  // Case 5: It's already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Case 6: It's a string representation (ISO format)
  if (typeof timestamp === "string") {
    try {
      return new Date(timestamp);
    } catch (e) {
      console.error("[placesController] Invalid timestamp string format:", timestamp);
      return new Date();
    }
  }

  // Default fallback: use current date
  console.error("[placesController] Unrecognized timestamp format:", timestamp);
  return new Date();
};

/**
 * Sanitize place data to make it Firestore-compatible
 * Removes undefined values, functions, and redundant data
 */
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
    // Skip functions or symbols
    if (typeof data[key] === "function" || typeof data[key] === "symbol") {
      continue;
    }

    // Skip redundant fields to reduce storage size
    if (key === "hasFullDetails" || key === "detailsFetchedAt") {
      continue;
    }

    result[key] = sanitizeForFirebase(data[key]);
  }

  return result;
};

/**
 * Calculate a key for a geographic area
 */
const getAreaKey = (lat: number, lng: number): string => {
  // Round to 2 decimal places (about 1km precision)
  const latKey = Math.floor(lat * 100) / 100;
  const lngKey = Math.floor(lng * 100) / 100;
  return `${latKey},${lngKey}`;
};

/**
 * Check if a Firebase cache entry is valid for current position and not expired
 */
const isCacheEntryValidForPosition = (
  cacheEntry: FirebaseCacheEntry,
  latitude: number,
  longitude: number
): boolean => {
  // Check if cache entry is expired
  const now = new Date();

  // First check explicit expiration date if available
  if (cacheEntry.expiresAt) {
    const expiryDate = safeGetDate(cacheEntry.expiresAt);
    if (now > expiryDate) {
      console.log("[placesController] Cache entry expired based on explicit expiresAt");
      return false;
    }
  } else {
    // Fallback to checking based on timestamp
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

  // Check if current position is within cached area
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

/**
 * NEW: Clean up expired cache entries from all storage
 */
const cleanupExpiredCacheEntries = async (): Promise<void> => {
  const now = Date.now();

  // Only run cleanup if it's been at least CACHE_CLEANUP_INTERVAL since the last cleanup
  const lastCleanup = await AsyncStorage.getItem(LAST_CLEANUP_KEY);
  const lastCleanupTime = lastCleanup ? parseInt(lastCleanup, 10) : 0;

  if (now - lastCleanupTime < CACHE_CLEANUP_INTERVAL) {
    console.log("[placesController] Skipping cache cleanup, last cleanup was recent");
    return;
  }

  console.log("[placesController] Starting cache cleanup process");

  try {
    // 1. Clean memory caches
    // Clean details cache
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

    // 2. Clean AsyncStorage (will be done when we persist the cleaned memory cache)

    // 3. Clean Firebase if user is logged in
    if (auth.currentUser) {
      // Clean expired cache entries
      try {
        const cachesRef = collection(db, "placeCaches");
        const cachesSnapshot = await getDocs(cachesRef);

        const batch = writeBatch(db);
        let batchCount = 0;
        let deleteCount = 0;

        for (const cacheDoc of cachesSnapshot.docs) {
          const cacheData = cacheDoc.data();
          let isExpired = false;

          // Check explicit expiration
          if (cacheData.expiresAt) {
            const expiryDate = safeGetDate(cacheData.expiresAt);
            isExpired = new Date() > expiryDate;
          } else {
            // Check based on timestamp
            const timestamp = safeGetDate(cacheData.timestamp);
            isExpired = now - timestamp.getTime() > CACHE_EXPIRATION_TIME;
          }

          if (isExpired) {
            batch.delete(doc(db, "placeCaches", cacheDoc.id));
            deleteCount++;
            batchCount++;

            // Commit batch if it reaches the limit
            if (batchCount >= BATCH_SIZE) {
              await batch.commit();
              batchCount = 0;
            }
          }
        }

        // Commit any remaining deletes
        if (batchCount > 0) {
          await batch.commit();
        }

        console.log(
          `[placesController] Deleted ${deleteCount} expired cache entries from Firebase`
        );
      } catch (error) {
        console.error("[placesController] Error cleaning up Firebase cache:", error);
      }

      // Clean expired place details
      try {
        const twoMonthsAgo = new Date(now - CACHE_EXPIRATION_TIME);
        const detailsRef = collection(db, "placeDetails");
        const oldDetailsQuery = query(
          detailsRef,
          where("fetchedAt", "<", Timestamp.fromDate(twoMonthsAgo)),
          limit(BATCH_SIZE * 5) // Limit to avoid excessive operations
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

    // Update the last cleanup time
    await AsyncStorage.setItem(LAST_CLEANUP_KEY, now.toString());
    lastCacheCleanupTime = now;

    console.log("[placesController] Cache cleanup completed");
  } catch (error) {
    console.error("[placesController] Error during cache cleanup:", error);
  }
};

/**
 * Initialize memory caches from local storage with expiration checks
 */
const initializeCaches = async () => {
  try {
    const now = Date.now();

    // Check if cleanup is needed
    cleanupExpiredCacheEntries().catch((e) =>
      console.error("[placesController] Error during cache cleanup:", e)
    );

    // Load the area cache first
    const cacheData = await AsyncStorage.getItem(LOCAL_CACHE_KEY);
    if (cacheData) {
      const parsedCache = JSON.parse(cacheData);
      if (
        parsedCache.places &&
        Array.isArray(parsedCache.places) &&
        parsedCache.places.length > 0
      ) {
        // Check if cache is expired
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

    // Load the details cache
    const detailsData = await AsyncStorage.getItem(LOCAL_DETAILS_CACHE_KEY);
    if (detailsData) {
      const parsedDetails = JSON.parse(detailsData);
      if (Array.isArray(parsedDetails) && parsedDetails.length > 0) {
        // Convert array back to Map, filtering out expired entries
        detailsCache = new Map();
        parsedDetails.forEach((entry: DetailsCacheEntry) => {
          // Skip expired entries
          const isExpired = entry.expiresAt
            ? now > entry.expiresAt
            : now - entry.fetchedAt > DETAILS_REFRESH_THRESHOLD;

          if (!isExpired) {
            // Ensure expiresAt is set
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

/**
 * Save memory caches to local storage with expiration data
 */
const persistCaches = async () => {
  try {
    // Save area cache
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

    // Save details cache - convert Map to Array first
    if (detailsCache.size > 0) {
      const detailsArray = Array.from(detailsCache.values());
      // Sort by lastViewed (most recent first) and limit size
      detailsArray.sort((a, b) => (b.lastViewed || 0) - (a.lastViewed || 0));
      const limitedDetails = detailsArray.slice(0, DETAILS_CACHE_SIZE);
      await AsyncStorage.setItem(LOCAL_DETAILS_CACHE_KEY, JSON.stringify(limitedDetails));
    }

    console.log("[placesController] Saved caches to local storage");
  } catch (error) {
    console.error("[placesController] Error persisting caches:", error);
  }
};

// Initialize immediately
initializeCaches();

/**
 * Check if place details need a refresh based on explicit expiration or age
 */
const needsDetailsRefresh = (detailsEntry: DetailsCacheEntry): boolean => {
  const now = Date.now();

  // Check explicit expiration first
  if (detailsEntry.expiresAt) {
    return now > detailsEntry.expiresAt;
  }

  // Fallback to age check
  const age = now - detailsEntry.fetchedAt;
  return age > DETAILS_REFRESH_THRESHOLD;
};

/**
 * Fetch a cache entry from Firebase for a given position
 */
const fetchCacheEntryForPosition = async (
  latitude: number,
  longitude: number
): Promise<FirebaseCacheEntry | null> => {
  try {
    // Check if user is logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("[placesController] No user logged in, cannot access Firebase cache");
      return null;
    }

    // Try to find a cache entry that covers this position
    // First check for a direct match with the area key
    const areaKey = getAreaKey(latitude, longitude);
    const directCacheRef = doc(db, "placeCaches", areaKey);
    const directCacheDoc = await getDoc(directCacheRef);

    if (directCacheDoc.exists()) {
      const cacheData = directCacheDoc.data() as FirebaseCacheEntry;
      cacheData.id = directCacheDoc.id;

      // Make sure we have valid timestamps
      try {
        // Validate timestamp using our safe function - this won't throw an error
        safeGetDate(cacheData.timestamp);
      } catch (e) {
        console.warn("[placesController] Invalid timestamp in cache entry:", e);
        // We can continue as our safe function will handle this
      }

      if (isCacheEntryValidForPosition(cacheData, latitude, longitude)) {
        console.log(`[placesController] Found valid cache entry for position: ${areaKey}`);
        return cacheData;
      }
    }

    // If no direct match, query for any cache that might cover this position
    const placeCachesRef = collection(db, "placeCaches");
    const cachesQuery = query(
      placeCachesRef,
      where("centerLatitude", ">=", latitude - 0.5),
      where("centerLatitude", "<=", latitude + 0.5)
    );

    const querySnapshot = await getDocs(cachesQuery);

    if (!querySnapshot.empty) {
      // Find the closest valid cache entry
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
 * Create a new cache entry in Firebase with proper batch handling and explicit expiration
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

    // Track place IDs to include in cache entry
    const placeIds: string[] = [];

    // Process places in smaller batches to avoid issues
    const batchSize = BATCH_SIZE; // Maximum 10 places per batch

    for (let i = 0; i < places.length; i += batchSize) {
      // Create a new batch for each group of places
      const batch = writeBatch(db);
      const currentBatch = places.slice(i, i + batchSize);

      console.log(
        `[placesController] Processing batch ${Math.floor(i / batchSize) + 1} with ${
          currentBatch.length
        } places`
      );

      // Add each place to the current batch
      for (const place of currentBatch) {
        const placeId = place.place_id;
        placeIds.push(placeId);

        // Sanitize place data before saving to Firebase
        const sanitizedPlace = sanitizeForFirebase(place);

        // Create GeoPoint for location
        const placeData = {
          ...sanitizedPlace,
          geometry: {
            location: new GeoPoint(place.geometry.location.lat, place.geometry.location.lng),
          },
          cachedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(expiryDate), // Add explicit expiration
          viewCount: increment(0), // Initialize if doesn't exist
        };

        // Add to current batch
        const placeRef = doc(db, "places", placeId);
        batch.set(placeRef, placeData, { merge: true });
      }

      // Commit this batch before creating a new one
      await batch.commit();
      console.log(`[placesController] Committed batch ${Math.floor(i / batchSize) + 1}`);
    }

    // Now create the cache entry
    const cacheEntry: FirebaseCacheEntry = {
      id: areaKey,
      centerLocation: new GeoPoint(latitude, longitude),
      centerLatitude: latitude,
      centerLongitude: longitude,
      radiusKm: SEARCH_RADIUS_KM,
      timestamp: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiryDate), // Add explicit expiration
      placeIds: placeIds,
    };

    // Save cache entry to Firebase
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

    // Batch fetch places in chunks to avoid too many concurrent requests
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

          // Convert GeoPoint back to lat/lng object
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

/**
 * Get place description with safeguards
 */
const getPlaceDescription = (place: any): string => {
  // First try editorial summary
  if (place.editorial_summary?.overview) {
    return place.editorial_summary.overview;
  }

  // Then try existing description
  if (place.description) {
    return place.description;
  }

  // Then try by place type
  if (place.types && place.types.length > 0) {
    for (const type of place.types) {
      const typeKey = type as keyof typeof STANDARD_DESCRIPTIONS;
      if (STANDARD_DESCRIPTIONS[typeKey]) {
        return STANDARD_DESCRIPTIONS[typeKey];
      }
    }
  }

  // Fallback
  return STANDARD_DESCRIPTIONS.default;
};

/**
 * Check if a place has any of the provided types
 */
const hasAnyType = (place: any, typeList: string[]): boolean => {
  if (!place.types || !Array.isArray(place.types)) return false;
  return place.types.some((type: string) => typeList.includes(type));
};

/**
 * Check if a place name or vicinity contains any of the provided keywords
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
 * Calculate a tourism score for a place to identify legitimate attractions
 * IMPROVED: Better scoring algorithm that properly identifies actual tourist places
 */
const calculateTourismScore = (place: any): number => {
  let score = 0;

  // Start with checking for definite non-tourist places
  // Transport hubs and other non-tourist places should be excluded
  // unless they have historical/cultural significance
  if (hasAnyType(place, NON_TOURIST_TYPES)) {
    // Start with a negative score for non-tourist types
    score -= 20;

    // If it's a transport hub, check if it might actually be historic/tourist
    const mightBeHistoric =
      hasAnyType(place, ["historic"]) ||
      containsAnyKeyword(place, ["historic", "heritage", "museum", "attraction"]);

    if (!mightBeHistoric) {
      // Double-check if it's a typical non-tourist place
      if (containsAnyKeyword(place, NON_TOURIST_KEYWORDS)) {
        return DEFINITELY_NOT_TOURIST_SCORE; // Definitely not a tourist place
      }
    }
  }

  // High-priority tourist types get a big boost
  if (hasAnyType(place, HIGH_PRIORITY_TOURIST_TYPES)) {
    score += 60; // These should almost always be included
  }
  // Regular tourist types get a good boost
  else if (hasAnyType(place, TOURIST_TYPES)) {
    score += 40;
  }

  // Additional scoring for specific types
  if (hasAnyType(place, ["museum"])) score += 20;
  if (hasAnyType(place, ["park"])) score += 15;
  if (hasAnyType(place, ["tourist_attraction"])) score += 20;
  if (hasAnyType(place, ["historic"])) score += 15;
  if (hasAnyType(place, ["natural_feature"])) score += 15;

  // Boost for higher ratings, but only if there are enough ratings
  if (place.rating && place.user_ratings_total) {
    score += (place.rating - 3) * 5; // Rating boost (3.0=0, 4.0=5, 5.0=10)

    // More weight to ratings if there are many of them
    if (place.user_ratings_total > 100) {
      score += (place.rating - 3) * 5; // Double the rating importance for well-reviewed places
    }

    // Add points based on number of ratings (logarithmic scale to avoid extremely popular places dominating)
    score += Math.min(Math.log(place.user_ratings_total) * 2, 20);
  }

  // Boost for having photos (tourist attractions usually have photos)
  if (place.photos && place.photos.length > 0) {
    score += Math.min(place.photos.length * 2, 15);
  }

  // Check name and vicinity for tourist keywords
  const nameLower = (place.name || "").toLowerCase();
  const vicinityLower = (place.vicinity || "").toLowerCase();

  let keywordMatches = 0;
  for (const keyword of TOURIST_KEYWORDS) {
    const keywordLower = keyword.toLowerCase();
    if (nameLower.includes(keywordLower)) {
      keywordMatches += 2; // Double points for matches in the name
    }
    if (vicinityLower.includes(keywordLower)) {
      keywordMatches += 1;
    }
  }

  // Add points for keyword matches
  score += keywordMatches * 2;

  // Check for non-tourist keywords that should reduce the score
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

  // Subtract points for non-tourist keyword matches
  score -= nonTouristMatches * 3;

  // Additional checks for specific place names
  if (nameLower.includes("museum") || nameLower.includes("gallery")) score += 30;
  if (nameLower.includes("castle") || nameLower.includes("palace")) score += 30;
  if (nameLower.includes("cathedral") || nameLower.includes("church")) score += 25;
  if (nameLower.includes("monument") || nameLower.includes("memorial")) score += 25;
  if (nameLower.includes("park") && !nameLower.includes("parking")) score += 20;
  if (nameLower.includes("garden") || nameLower.includes("gardens")) score += 20;

  // Special case: Train/railway stations are not tourist attractions unless historic
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

  // If it has a website and is operational, it's more likely to be an attraction
  if (place.website && place.business_status === "OPERATIONAL") {
    score += 10;
  }

  // If it has an editorial summary, it's more likely to be notable
  if (place.editorial_summary && place.editorial_summary.overview) {
    score += 15;
  }

  return score;
};

/**
 * Create a place object from Google API result with full details
 */
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

/**
 * Check the permanent details collection for existing place details with expiration awareness
 */
const checkPlaceDetailsCollection = async (placeId: string): Promise<Place | null> => {
  try {
    if (!auth.currentUser) return null;

    // Check in the permanent placeDetails collection
    const detailsDocRef = doc(db, "placeDetails", placeId);
    const detailsDoc = await getDoc(detailsDocRef);

    if (detailsDoc.exists()) {
      const detailsData = detailsDoc.data();

      // Check if details are still valid or need refreshing
      // First check explicit expiration if available
      let needsRefresh = false;

      if (detailsData.expiresAt) {
        const expiryDate = safeGetDate(detailsData.expiresAt);
        needsRefresh = new Date() > expiryDate;
      } else {
        // Fallback to checking timestamp
        const fetchedAt = detailsData.fetchedAt?.toDate().getTime() || 0;
        const now = Date.now();
        const age = now - fetchedAt;
        needsRefresh = age > DETAILS_REFRESH_THRESHOLD;
      }

      // Convert GeoPoint back to lat/lng object
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

      // Record usage stats
      try {
        // Update view count and last viewed in the background
        updateDoc(detailsDocRef, {
          viewCount: increment(1),
          lastViewed: serverTimestamp(),
        }).catch((e) => console.log("Error updating view stats:", e));
      } catch (statsError) {
        // Non-critical error, just log
        console.log("Error updating place view stats:", statsError);
      }

      if (!needsRefresh) {
        console.log(
          `[placesController] Found fresh details in permanent collection for: ${placeId}`
        );
        return place;
      } else {
        console.log(
          `[placesController] Found stale details in permanent collection for: ${placeId} - will refresh in background`
        );

        // Return existing details but queue a refresh in the background if online
        NetInfo.fetch().then((state) => {
          if (state.isConnected && !detailsFetchQueue.has(placeId)) {
            console.log(
              `[placesController] Queuing background refresh for stale place: ${placeId}`
            );
            detailsFetchQueue.add(placeId);

            // Start background fetch with a delay
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

/**
 * Save place details to the permanent collection with explicit expiration
 */
const savePlaceDetailsPermanently = async (place: Place): Promise<void> => {
  try {
    if (!auth.currentUser) return;

    // Sanitize place data for Firebase
    const sanitizedPlace = sanitizeForFirebase(place);

    // Calculate expiration date
    const now = new Date();
    const expiryDate = new Date(now.getTime() + CACHE_EXPIRATION_TIME);

    // Convert place to Firestore-compatible format
    const placeData = {
      ...sanitizedPlace,
      geometry: {
        location: new GeoPoint(place.geometry.location.lat, place.geometry.location.lng),
      },
      fetchedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiryDate), // Add explicit expiration
      viewCount: increment(1),
      lastViewed: serverTimestamp(),
      hasFullDetails: true,
    };

    // Save to the permanent placeDetails collection
    const detailsDocRef = doc(db, "placeDetails", place.place_id);
    await setDoc(detailsDocRef, placeData, { merge: true });

    console.log(`[placesController] Saved place details permanently for: ${place.name}`);
  } catch (error) {
    console.error(`[placesController] Error saving place details permanently:`, error);
    throw error; // Re-throw to allow caller to handle
  }
};

/**
 * Fetch place details directly from Google API
 * IMPROVED: Better deduplication and caching
 */
const fetchPlaceDetailsFromGoogle = async (
  placeId: string,
  isBackgroundRefresh = false
): Promise<Place | null> => {
  try {
    // If there's already a fetch in progress for this place, return that promise
    // unless this is a background refresh which should run independently
    if (!isBackgroundRefresh && detailsFetchPromises.has(placeId)) {
      console.log(`[placesController] Reusing existing fetch promise for: ${placeId}`);
      return detailsFetchPromises.get(placeId)!;
    }

    // Create a new promise for this fetch
    const fetchPromise = (async () => {
      try {
        // Track that we're fetching this place
        detailsFetchQueue.add(placeId);

        // Check quota before making an API call
        const hasQuota = await hasQuotaAvailable("places");
        console.log(`[placesController] Has quota for places API: ${hasQuota}`);

        if (!hasQuota) {
          console.warn(`[placesController] No API quota left for place details`);
          return null;
        }

        // Record this API call in our quota
        await recordApiCall("places");
        console.log(`[placesController] Fetching details from Google API for: ${placeId}`);

        // Make the API call
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

        // Calculate distance if we have it in memory cache
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

        // Calculate tourism score for the place
        const tourismScore = calculateTourismScore(data.result);

        // Set expiration time for the details
        const now = Date.now();
        const expiresAt = now + CACHE_EXPIRATION_TIME;

        // Create place object with full details - use nulls not undefined
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

        // Sanitize the place data before saving to Firebase
        const sanitizedPlace = sanitizeForFirebase(detailedPlace);

        // Save to the permanent collection
        try {
          await savePlaceDetailsPermanently(sanitizedPlace as Place);
        } catch (saveError) {
          console.error(`[placesController] Error saving place details permanently:`, saveError);
          // Continue anyway - we still want to return the data
        }

        // Update the details cache with expiration time
        detailsCache.set(placeId, {
          placeId,
          place: detailedPlace,
          fetchedAt: now,
          expiresAt: expiresAt, // Add explicit expiration
          lastViewed: now,
        });

        // Update memory cache
        if (basicPlace) {
          const index = memoryCache.places.findIndex((p) => p.place_id === placeId);
          if (index !== -1) {
            memoryCache.places[index] = detailedPlace;
          }
        } else {
          // Add to memory cache if not there
          memoryCache.places.push(detailedPlace);
        }

        // Update regular places collection in Firebase if user is logged in
        if (auth.currentUser) {
          try {
            const placeRef = doc(db, "places", placeId);

            // Create a Firestore-compatible object with GeoPoint and expiration
            const firestorePlace = {
              ...sanitizedPlace,
              geometry: {
                location: new GeoPoint(
                  detailedPlace.geometry.location.lat,
                  detailedPlace.geometry.location.lng
                ),
              },
              updatedAt: serverTimestamp(),
              expiresAt: Timestamp.fromDate(new Date(expiresAt)), // Add explicit expiration
              hasFullDetails: true,
              lastDetailsUpdate: serverTimestamp(),
              tourismScore: tourismScore,
            };

            await setDoc(placeRef, firestorePlace, { merge: true });
          } catch (updateError) {
            console.warn(`[placesController] Error updating regular place:`, updateError);
            // Continue anyway - this is a non-critical update
          }
        }

        // Save caches to local storage
        persistCaches();

        return detailedPlace;
      } catch (error) {
        console.error(`[placesController] Error fetching place details from Google:`, error);
        return null;
      } finally {
        // Always clean up
        detailsFetchQueue.delete(placeId);
        // Remove from promises map after a brief delay (to allow concurrent requests to use it)
        setTimeout(() => {
          detailsFetchPromises.delete(placeId);
        }, 500);
      }
    })();

    // Store the promise for reuse
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
 * Process batch of places in the background
 * This checks Firebase FIRST before making API calls
 */
const processPendingPlacesBatch = async (): Promise<void> => {
  if (isProcessingBackground) return;

  try {
    isProcessingBackground = true;

    // Check if we have an internet connection
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log(`[placesController] No internet connection, skipping background processing`);
      isProcessingBackground = false;
      return;
    }

    // Check if user is logged in for Firebase access
    if (!auth.currentUser) {
      console.log(
        `[placesController] No user logged in for Firebase access, skipping background processing`
      );
      isProcessingBackground = false;
      return;
    }

    // Get places that need details
    const placesMissingDetails = memoryCache.places
      .filter(
        (p) => !p.hasFullDetails && !p.reviews && !p.website && !detailsFetchQueue.has(p.place_id)
      )
      .slice(0, 5); // Process max 5 at a time to not overwhelm

    if (placesMissingDetails.length === 0) {
      // No more places to process
      isProcessingBackground = false;
      return;
    }

    console.log(
      `[placesController] Checking Firebase for ${placesMissingDetails.length} places in background`
    );

    // STEP 1: First check Firebase in batch for ALL places
    const placeIds = placesMissingDetails.map((p) => p.place_id);
    const placeDetailsDocs = await Promise.all(
      placeIds.map((id) => getDoc(doc(db, "placeDetails", id)))
    );

    // Track which places were found in Firebase
    const foundInFirebase = new Set<string>();
    let firebaseCount = 0;

    // Process places found in Firebase first
    for (let i = 0; i < placeDetailsDocs.length; i++) {
      const detailsDoc = placeDetailsDocs[i];
      const placeId = placeIds[i];

      if (detailsDoc.exists()) {
        // Found in Firebase, update memory cache
        firebaseCount++;
        foundInFirebase.add(placeId);

        const detailsData = detailsDoc.data();

        // Check if the Firebase entry is expired
        let isExpired = false;
        if (detailsData.expiresAt) {
          const expiryDate = safeGetDate(detailsData.expiresAt);
          isExpired = new Date() > expiryDate;
        } else {
          // Fallback to checking timestamp
          const fetchedAt = detailsData.fetchedAt?.toDate().getTime() || 0;
          const now = Date.now();
          isExpired = now - fetchedAt > DETAILS_REFRESH_THRESHOLD;
        }

        if (isExpired) {
          // Skip expired entries
          continue;
        }

        const place = {
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

        // Update in memory cache
        const index = memoryCache.places.findIndex((p) => p.place_id === placeId);
        if (index !== -1) {
          memoryCache.places[index] = {
            ...place,
            distance: memoryCache.places[index].distance,
          };
        }

        // Calculate expiration if missing
        const expiresAt = detailsData.expiresAt
          ? safeGetDate(detailsData.expiresAt).getTime()
          : (place.detailsFetchedAt || Date.now()) + DETAILS_REFRESH_THRESHOLD;

        // Update details cache
        detailsCache.set(placeId, {
          placeId,
          place,
          fetchedAt: place.detailsFetchedAt || Date.now(),
          expiresAt: expiresAt,
          lastViewed: Date.now(),
        });

        // Update usage metrics in Firebase
        try {
          updateDoc(doc(db, "placeDetails", placeId), {
            viewCount: increment(1),
            lastViewed: serverTimestamp(),
          }).catch((e) => console.log("Error updating view stats:", e));
        } catch (e) {
          // Non-critical error
        }
      }
    }

    // STEP 2: Check if quota is available for places NOT in Firebase
    if (!(await hasQuotaAvailable("places"))) {
      console.log(`[placesController] No quota available for fetching remaining places`);
      isProcessingBackground = false;
      return;
    }

    // STEP 3: Only fetch places not found in Firebase
    const placesNeedingApi = placesMissingDetails.filter((p) => !foundInFirebase.has(p.place_id));

    if (placesNeedingApi.length === 0) {
      console.log(
        `[placesController] All ${firebaseCount} places found in Firebase, no API calls needed`
      );
      isProcessingBackground = false;
      return;
    }

    console.log(
      `[placesController] Found ${firebaseCount} places in Firebase, need to fetch ${placesNeedingApi.length} from Google API`
    );

    // Process places not found in Firebase
    let apiCount = 0;
    for (const place of placesNeedingApi) {
      // Check if we still have quota
      if (await hasQuotaAvailable("places")) {
        try {
          // Fetch from Google and store in Firebase
          const detailedPlace = await fetchPlaceDetailsFromGoogle(place.place_id);
          if (detailedPlace) {
            apiCount++;
          }

          // Add a small delay between requests
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.warn(
            `[placesController] Error processing place in background: ${place.name}`,
            error
          );
        }
      } else {
        // No more quota, stop processing
        break;
      }
    }

    console.log(
      `[placesController] Background processing complete: ${firebaseCount} from Firebase + ${apiCount} from API`
    );
  } finally {
    isProcessingBackground = false;
  }
};

/**
 * MAIN FUNCTION: Fetch places with details in one go and cache them
 * IMPROVED: Optimized API calls, better caching, and standardized expiration
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

    // DEBUG: Log cache state at the beginning
    console.log(`[placesController] Memory cache has ${memoryCache.places.length} places`);
    console.log(`[placesController] Cache entry exists? ${memoryCache.cacheEntry !== null}`);

    // DEBUG: Check Firebase authentication state
    const authUser = auth.currentUser;
    console.log(`[placesController] Firebase auth state - User logged in: ${authUser !== null}`);

    // AUTHENTICATION CHECK: Only proceed with API calls if user is logged in
    if (!authUser) {
      console.log("[placesController] User not logged in - using cache only, no API calls");

      // If we have anything in memory cache, return it without API calls
      if (memoryCache.places.length > 0) {
        console.log(
          `[placesController] Returning ${memoryCache.places.length} cached places for unauthenticated user`
        );

        // Calculate distance to each place
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

        // Sort by distance
        const sortedByDistance = placesWithDistance
          .sort((a, b) => (a.distance || 0) - (b.distance || 0))
          .slice(0, MAX_PLACES_TO_FETCH);

        return {
          places: sortedByDistance,
          furthestDistance: SEARCH_RADIUS_METERS,
        };
      }

      // If no cache at all, return empty result
      console.log("[placesController] No cached places available and user not logged in");
      return {
        places: [],
        furthestDistance: SEARCH_RADIUS_METERS,
      };
    }

    // Check network status first
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected && memoryCache.places.length > 0) {
      console.log("[placesController] No network connection, using cache only");

      // Return cached places with updated distances
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

    // STEP 1: Check if we have this in memory cache
    if (
      !forceRefresh &&
      memoryCache.cacheEntry &&
      memoryCache.places.length > 0 &&
      isCacheEntryValidForPosition(memoryCache.cacheEntry, latitude, longitude)
    ) {
      console.log(`[placesController] Using memory cache with ${memoryCache.places.length} places`);

      // Calculate distance to each place
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

      // IMPORTANT FIX: Sort by distance first and take only MAX_PLACES_TO_FETCH (100) closest places
      const sortedByDistance = placesWithDistance
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, MAX_PLACES_TO_FETCH);

      // Find furthest distance of closest places
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

    // STEP 2: Check if we have a Firebase cache entry
    if (!forceRefresh && auth.currentUser) {
      try {
        const cacheEntry = await fetchCacheEntryForPosition(latitude, longitude);

        if (cacheEntry) {
          // We found a valid cache entry in Firebase, fetch all the places
          const places = await fetchPlacesForCacheEntry(cacheEntry);

          if (places.length > 0) {
            // Update memory cache
            memoryCache = {
              cacheEntry,
              places,
              lastUpdated: Date.now(),
            };

            // Save to local storage as backup
            persistCaches();

            // Calculate distance and sort
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

            // IMPORTANT FIX: Sort by distance first and take only MAX_PLACES_TO_FETCH (100) closest places
            const sortedByDistance = placesWithDistance
              .sort((a, b) => (a.distance || 0) - (b.distance || 0))
              .slice(0, MAX_PLACES_TO_FETCH);

            // Find furthest distance of closest places
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
        // Continue to API fallback
      }
    }

    // STEP 3: Check quota before making any API calls
    const hasQuota = await hasQuotaAvailable("places");

    if (!hasQuota) {
      console.warn("[placesController] No API quota left! Using existing cache if available");

      // If memory cache has any places, use it even if not ideal
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

      // Try loading from local storage one more time
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

      // If no cache and no quota, return empty with warning
      Alert.alert(
        "Limited Data Available",
        "We've reached our daily limit for finding places. Please try again tomorrow."
      );

      return {
        places: [],
        furthestDistance: SEARCH_RADIUS_METERS,
      };
    }

    // STEP 4: Make API calls with pagination to get up to 100 places
    console.log(`[placesController] Fetching places from API in ${SEARCH_RADIUS_KM}km radius`);
    console.warn("API CALL BEING MADE");
    // Record the API call for nearbysearch
    await recordApiCall("places");

    // We'll use pagination to get more places
    let allResults: any[] = [];
    let nextPageToken: string | null = null;
    let pageCount = 0;

    do {
      // Build URL for wide-area search with BASIC details only
      // IMPORTANT FIX: Updated place types to better target tourist attractions
      let apiUrl =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${latitude},${longitude}&` +
        `radius=${SEARCH_RADIUS_METERS}&` +
        `type=tourist_attraction|museum|art_gallery|park|amusement_park|aquarium|church|city_hall|hindu_temple|landmark|monument|mosque|synagogue|point_of_interest|natural_feature|zoo&` +
        `fields=place_id,name,formatted_address,rating,photos,geometry,types,business_status,price_level,vicinity&` +
        `key=${GOOGLE_MAPS_APIKEY}`;

      // Add page token if we have one
      if (nextPageToken) {
        apiUrl += `&pagetoken=${nextPageToken}`;
        // Wait briefly before using the next page token
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Make API request
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status !== "OK") {
        console.warn(`[placesController] API returned status: ${data.status}`);
        break;
      }

      // Add results to our collection
      if (data.results && data.results.length > 0) {
        allResults = [...allResults, ...data.results];
        console.log(
          `[placesController] Page ${pageCount + 1}: Received ${data.results.length} places`
        );
      }

      // Store next page token if available
      nextPageToken = data.next_page_token || null;

      // Record API call if we're going to fetch another page
      if (nextPageToken && pageCount < MAX_PAGES - 1) {
        await recordApiCall("places");
      }

      pageCount++;
    } while (nextPageToken && pageCount < MAX_PAGES);

    console.log(`[placesController] Received total of ${allResults.length} places from API`);

    if (allResults.length === 0) {
      // Use existing cache as fallback
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

    // STEP 5: Process and filter results
    // Calculate tourism score for each place
    allResults.forEach((place) => {
      place.tourismScore = calculateTourismScore(place);
    });

    // IMPROVED FILTERING: Better filtering to include actual tourist attractions
    const filteredResults = allResults.filter((place: any) => {
      // Skip places with very negative scores (definitely not tourist attractions)
      if (place.tourismScore <= DEFINITELY_NOT_TOURIST_SCORE) {
        return false;
      }

      // High-priority tourist types should almost always be included if they have decent ratings
      if (hasAnyType(place, HIGH_PRIORITY_TOURIST_TYPES)) {
        return !place.rating || place.rating >= 3.0;
      }

      // For regular tourist types, apply a stricter tourism score threshold
      return (
        place.tourismScore >= MIN_TOURISM_SCORE_THRESHOLD || (place.rating && place.rating >= 4.5)
      ); // Include very highly rated places
    });

    // STEP 6: Create place objects from basic API results
    let basicPlaces: Place[] = filteredResults.map((place: any) =>
      createPlaceObjectFromApiResult(place, latitude, longitude)
    );

    // IMPORTANT FIX: Sort by distance first then limit to MAX_PLACES_TO_FETCH
    basicPlaces.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    basicPlaces = basicPlaces.slice(0, MAX_PLACES_TO_FETCH);

    // Find furthest distance of closest places
    let furthestDistance = 0;
    basicPlaces.forEach((place) => {
      if (place.distance && place.distance > furthestDistance) {
        furthestDistance = place.distance;
      }
    });

    furthestDistance = Math.max(furthestDistance + 200, 1000);

    // STEP 7: Save to Firebase if user is logged in - save all filtered places
    if (auth.currentUser) {
      createNewCacheEntry(latitude, longitude, basicPlaces)
        .then((newCacheEntry) => {
          if (newCacheEntry) {
            // Update memory cache
            memoryCache = {
              cacheEntry: newCacheEntry,
              places: basicPlaces,
              lastUpdated: Date.now(),
            };

            // Save to local storage as backup
            persistCaches();
          }
        })
        .catch((error) => {
          console.error("[placesController] Error saving to Firebase:", error);
        });
    } else {
      // Save to memory cache
      memoryCache = {
        cacheEntry: null,
        places: basicPlaces,
        lastUpdated: Date.now(),
      };

      // Save to local storage if not using Firebase
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

    // Use existing cache on error if available
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
 * Fetch place details on demand - used when a user selects a place
 * ENHANCED: Better caching, single API call strategy, and standardized expiration
 */
export const fetchPlaceDetailsOnDemand = async (placeId: string): Promise<Place | null> => {
  try {
    console.log(`[placesController] fetchPlaceDetailsOnDemand: ${placeId}`);

    // STEP 1: Check if this place is already being fetched
    if (detailsFetchPromises.has(placeId)) {
      console.log(`[placesController] Existing fetch promise found for: ${placeId}`);
      return detailsFetchPromises.get(placeId)!;
    }

    // If using the old queue, wait for the other fetch
    if (detailsFetchQueue.has(placeId)) {
      console.log(`[placesController] Place is already being fetched with old system, waiting`);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check if it's now in cache
      const cachedAfterWait = detailsCache.get(placeId);
      if (cachedAfterWait) {
        return cachedAfterWait.place;
      }
    }

    // STEP 2: Check in-memory details cache
    const cachedDetails = detailsCache.get(placeId);
    if (cachedDetails) {
      console.log(`[placesController] Found place in details cache: ${cachedDetails.place.name}`);

      // Update last viewed time
      cachedDetails.lastViewed = Date.now();

      // Check if expired
      const now = Date.now();
      const isExpired = cachedDetails.expiresAt
        ? now > cachedDetails.expiresAt
        : needsDetailsRefresh(cachedDetails);

      // If details are stale, queue a refresh in the background
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

    // STEP 3: Check memory cache for place with full details
    const cachedPlace = memoryCache.places.find(
      (p) => p.place_id === placeId && p.hasFullDetails && (p.reviews || p.website)
    );

    if (cachedPlace) {
      console.log(
        `[placesController] Found place with full details in memory cache: ${cachedPlace.name}`
      );

      // Add to details cache with expiration
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

    // STEP 4: Create a promise for the entire remaining process
    const fullFetchPromise = (async () => {
      try {
        // Check Firebase first if user is logged in
        if (auth.currentUser) {
          console.log(
            `[placesController] Checking Firebase placeDetails collection for: ${placeId}`
          );
          const permanentDetails = await checkPlaceDetailsCollection(placeId);

          if (permanentDetails) {
            console.log(
              `[placesController] Found permanent details in Firebase for: ${permanentDetails.name}`
            );

            // Add to details cache with expiration
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

        // Fetch from Google API as last resort
        console.log(
          `[placesController] Not found in Firebase, fetching from Google API: ${placeId}`
        );
        return await fetchPlaceDetailsFromGoogle(placeId);
      } finally {
        // Clean up promises map after a delay
        setTimeout(() => {
          detailsFetchPromises.delete(placeId);
        }, 500);
      }
    })();

    // Store the promise for reuse
    detailsFetchPromises.set(placeId, fullFetchPromise);

    // Return the promise result
    return fullFetchPromise;
  } catch (error) {
    console.error(`[placesController] Error in fetchPlaceDetailsOnDemand:`, error);
    detailsFetchQueue.delete(placeId);
    detailsFetchPromises.delete(placeId);
    return null;
  }
};

/**
 * Get a place by ID from cache or Firebase
 */
export const fetchPlaceById = async (placeId: string): Promise<Place | null> => {
  try {
    console.log(`[placesController] fetchPlaceById: ${placeId}`);

    // STEP 1: Check details cache first (fastest)
    const cachedDetails = detailsCache.get(placeId);
    if (cachedDetails) {
      console.log(`[placesController] Found place in details cache: ${cachedDetails.place.name}`);

      // Update last viewed time
      cachedDetails.lastViewed = Date.now();

      // Check if expired
      const now = Date.now();
      const isExpired = cachedDetails.expiresAt
        ? now > cachedDetails.expiresAt
        : needsDetailsRefresh(cachedDetails);

      // Background refresh if expired
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

    // STEP 2: Check memory cache
    const cachedPlace = memoryCache.places.find((p) => p.place_id === placeId);
    if (cachedPlace) {
      console.log(`[placesController] Found place in memory cache: ${cachedPlace.name}`);

      // If it has full details, add to details cache
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

      // If it doesn't have full details, look in permanent collection
      const detailedPlace = await checkPlaceDetailsCollection(placeId);
      if (detailedPlace) {
        return detailedPlace;
      }

      // Otherwise fetch details on demand
      return await fetchPlaceDetailsOnDemand(placeId);
    }

    // STEP 3: Check permanent details collection
    const permanentDetails = await checkPlaceDetailsCollection(placeId);
    if (permanentDetails) {
      return permanentDetails;
    }

    // STEP 4: If user is logged in, check Firebase places collection
    if (auth.currentUser) {
      const placeDocRef = doc(db, "places", placeId);
      const placeDoc = await getDoc(placeDocRef);

      if (placeDoc.exists()) {
        const placeData = placeDoc.data();

        // Check if expired
        let isExpired = false;
        if (placeData.expiresAt) {
          const expiryDate = safeGetDate(placeData.expiresAt);
          isExpired = new Date() > expiryDate;
        } else if (placeData.fetchedAt) {
          const fetchedAt = safeGetDate(placeData.fetchedAt).getTime();
          isExpired = Date.now() - fetchedAt > DETAILS_REFRESH_THRESHOLD;
        }

        // If expired, fetch new version
        if (isExpired) {
          return await fetchPlaceDetailsOnDemand(placeId);
        }

        console.log(
          `[placesController] Found place in Firebase places collection: ${placeData.name}`
        );

        // Convert GeoPoint back to lat/lng object
        const place: Place = {
          ...placeData,
          geometry: {
            location: {
              lat: placeData.geometry.location.latitude,
              lng: placeData.geometry.location.longitude,
            },
          },
        } as Place;

        // If it has full details, add to details cache
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

        // Otherwise fetch details on demand
        return await fetchPlaceDetailsOnDemand(placeId);
      }
    }

    // STEP 5: Not found anywhere, fetch directly from Google
    return await fetchPlaceDetailsFromGoogle(placeId);
  } catch (error) {
    console.error(`[placesController] Error in fetchPlaceById:`, error);
    return null;
  }
};

/**
 * Clear caches (for debugging or troubleshooting)
 */
export const clearPlacesCache = async (): Promise<void> => {
  memoryCache = { cacheEntry: null, places: [], lastUpdated: 0 };
  detailsCache.clear();
  await AsyncStorage.removeItem(LOCAL_CACHE_KEY);
  await AsyncStorage.removeItem(LOCAL_DETAILS_CACHE_KEY);
  console.log("[placesController] Cleared all place caches");
};

/**
 * Get cache statistics
 */
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
    // Use the safe function here too
    const timestamp = safeGetDate(memoryCache.cacheEntry.timestamp);
    const ageMs = now.getTime() - timestamp.getTime();
    stats.memoryCache.ageInDays = Math.round((ageMs / (1000 * 60 * 60 * 24)) * 10) / 10;
  }

  // Calculate details cache freshness
  const now = Date.now();
  detailsCache.forEach((entry) => {
    // Check expiration first
    const isExpired = entry.expiresAt
      ? now > entry.expiresAt
      : now - entry.fetchedAt > DETAILS_REFRESH_THRESHOLD;

    if (!isExpired) {
      stats.detailsCache.freshCount++;
    } else {
      stats.detailsCache.staleCount++;
    }
  });

  // Get Firebase stats if logged in
  if (auth.currentUser) {
    try {
      // Use more efficient queries with limits to avoid loading too much data
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
