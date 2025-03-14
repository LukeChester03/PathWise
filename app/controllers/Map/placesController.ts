// src/controllers/Map/placesController.ts
import { Place, PlaceDetails, NearbyPlacesResponse } from "../../types/MapTypes";
import { Alert } from "react-native";
import { haversineDistance } from "../../utils/mapUtils";

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

// Maximum number of places to fetch
const MAX_PLACES = 40;

// Default search radius when ranking by distance is not available
const DEFAULT_RADIUS = 20000; // 20km in meters

// Minimum rating threshold for tourist attractions (0-5 scale)
const MIN_RATING_THRESHOLD = 3.5;

// Minimum number of reviews for added credibility
const MIN_REVIEWS_COUNT = 5;

// Dynamic settings that can be updated at runtime
let dynamicMaxPlaces = MAX_PLACES; // Default from constant
let dynamicSearchRadius = DEFAULT_RADIUS; // Default from constant

// Cache for nearby places to avoid repeated API calls
let placesCache: {
  places: Place[];
  furthestDistance: number;
  cacheTimestamp: number;
  latitude: number;
  longitude: number;
  maxPlaces: number; // Track maxPlaces setting
  searchRadius: number; // Track searchRadius setting
  detailedPlaceIds: Set<string>; // Track which places have full details
} | null = null;

// UPDATED: Increased cache expiration time (from 30 minutes to 2 hours)
const CACHE_EXPIRATION_TIME = 120 * 60 * 1000;

// Track recent API calls to implement rate limiting
let lastApiCallTime = 0;
const MIN_API_CALL_INTERVAL = 200; // ms between API calls to prevent bursts

/**
 * Simple rate limiter for API calls
 */
const rateLimitedFetch = async (url: string): Promise<Response> => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;

  if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
    // Wait until we can make another call
    await new Promise((resolve) => setTimeout(resolve, MIN_API_CALL_INTERVAL - timeSinceLastCall));
  }

  lastApiCallTime = Date.now();
  return fetch(url);
};

/**
 * Update the maximum number of places and search radius at runtime
 */
export const updatePlacesSettings = (maxPlaces: number, searchRadiusKm: number): void => {
  console.log(
    `[placesController] Updating settings - maxPlaces: ${maxPlaces}, searchRadius: ${searchRadiusKm}km`
  );

  // Validate and enforce limits
  const newMaxPlaces = Math.min(Math.max(10, maxPlaces), 50);
  const newSearchRadius = Math.min(Math.max(1000, searchRadiusKm * 1000), 50000);

  // Check if values actually changed before updating
  const settingsChanged =
    dynamicMaxPlaces !== newMaxPlaces || dynamicSearchRadius !== newSearchRadius;

  // Update the settings
  dynamicMaxPlaces = newMaxPlaces;
  dynamicSearchRadius = newSearchRadius;

  // Only clear cache if settings actually changed
  if (settingsChanged && placesCache) {
    console.log("[placesController] Settings changed, clearing places cache");
    clearPlacesCache();
  }
};

/**
 * Get appropriate description based on place type
 */
const getPlaceDescription = (place: any): string => {
  if (place.types) {
    for (const type of place.types) {
      // Type assertion to tell TypeScript this is a valid key
      const typeKey = type as keyof typeof STANDARD_DESCRIPTIONS;
      if (STANDARD_DESCRIPTIONS[typeKey]) {
        return STANDARD_DESCRIPTIONS[typeKey];
      }
    }
  }
  return STANDARD_DESCRIPTIONS.default;
};

/**
 * Calculate a tourism score for a place to identify legitimate attractions
 * Higher score = more likely to be a genuine tourist attraction
 */
const calculateTourismScore = (place: any): number => {
  let score = 0;

  // Base score from types
  const hasValidTouristType = place.types.some((type: string) => TOURIST_TYPES.includes(type));

  if (hasValidTouristType) {
    score += 30; // High base score for having tourist-specific types

    // Give extra points for specific high-value tourist types
    if (place.types.includes("tourist_attraction")) score += 15;
    if (place.types.includes("museum")) score += 10;
    if (place.types.includes("landmark")) score += 10;
    if (place.types.includes("historic")) score += 10;
    if (place.types.includes("natural_feature")) score += 8;
    if (place.types.includes("park")) score += 5;
  }

  // Boost for higher ratings
  if (place.rating) {
    score += (place.rating - 3) * 10; // Rating boost (3.0=0, 4.0=10, 5.0=20)
  }

  // Boost for having photos (tourist attractions usually have photos)
  if (place.photos && place.photos.length > 0) {
    score += Math.min(place.photos.length * 2, 10); // Up to 10 points for photos
  }

  // Boost for having many reviews
  if (place.user_ratings_total) {
    score += Math.min(Math.log(place.user_ratings_total) * 3, 15); // Logarithmic scale, up to 15 points
  }

  // Check if name contains tourist keywords
  const nameLower = place.name.toLowerCase();
  let keywordMatches = 0;

  for (const keyword of TOURIST_KEYWORDS) {
    if (nameLower.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  }

  // Add points for keyword matches in name
  score += keywordMatches * 3;

  // Boost for being a prominent place (Google often gives prominence to major attractions)
  if (place.business_status === "OPERATIONAL" && place.plus_code) {
    score += 5;
  }

  return score;
};

/**
 * Clear the places cache. Call this when user logs out or cache needs to be reset.
 */
export const clearPlacesCache = (): void => {
  console.log("[placesController] Places cache cleared");
  placesCache = null;
};

/**
 * Check if the cache is valid based on position, time, and settings
 */
const isCacheValid = (
  latitude: number,
  longitude: number,
  maxPlacesToOverride?: number
): boolean => {
  if (!placesCache) {
    console.log("[placesController] No cache exists");
    return false;
  }

  // Check if cache has expired
  const now = Date.now();
  const cacheAge = now - placesCache.cacheTimestamp;
  if (cacheAge > CACHE_EXPIRATION_TIME) {
    console.log(
      `[placesController] Cache expired (${Math.round(cacheAge / 1000 / 60)} minutes old)`
    );
    return false;
  }

  // Determine effective maxPlaces to use
  const effectiveMaxPlaces =
    maxPlacesToOverride !== undefined ? maxPlacesToOverride : dynamicMaxPlaces;

  // Check if there's a mismatch in settings
  if (
    placesCache.maxPlaces !== effectiveMaxPlaces ||
    placesCache.searchRadius !== dynamicSearchRadius
  ) {
    console.log(
      `[placesController] Settings mismatch - Cache: max=${placesCache.maxPlaces}, radius=${placesCache.searchRadius}m | Current: max=${effectiveMaxPlaces}, radius=${dynamicSearchRadius}m`
    );
    return false;
  }

  // Check if user has moved significantly from the cached location
  const distanceMoved = haversineDistance(
    placesCache.latitude,
    placesCache.longitude,
    latitude,
    longitude
  );

  // UPDATED: Increase threshold from 500m to 1000m
  if (distanceMoved > 1000) {
    console.log(
      `[placesController] User moved ${distanceMoved.toFixed(
        0
      )}m from cache location - invalidating cache`
    );
    return false;
  }

  console.log("[placesController] Cache is valid and will be used");
  return true;
};

export const fetchNearbyPlaces = async (
  latitude: number,
  longitude: number,
  forceRefresh: boolean = false,
  maxPlacesToOverride?: number // Optional parameter to override dynamicMaxPlaces
): Promise<NearbyPlacesResponse> => {
  try {
    // Use override if provided
    const effectiveMaxPlaces =
      maxPlacesToOverride !== undefined ? maxPlacesToOverride : dynamicMaxPlaces;

    console.log(
      `[placesController] fetchNearbyPlaces: lat=${latitude}, long=${longitude}, force=${forceRefresh}, maxPlaces=${effectiveMaxPlaces}`
    );

    // Check if latitude and longitude are valid numbers
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      console.error("[placesController] Invalid coordinates:", latitude, longitude);
      return {
        places: [],
        furthestDistance: dynamicSearchRadius,
      };
    }

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && isCacheValid(latitude, longitude, maxPlacesToOverride) && placesCache) {
      console.log(
        `[placesController] Using cached places data (${placesCache.places.length} places)`
      );
      return {
        places: placesCache.places,
        furthestDistance: placesCache.furthestDistance,
      };
    }

    console.log(
      `[placesController] Fetching fresh places data with radius ${dynamicSearchRadius}m and max ${effectiveMaxPlaces} places`
    );

    // Array to store all results across pages
    let allResults: any[] = [];
    // Flag to track if we need more pages
    let needMorePages = true;
    // Token for next page
    let nextPageToken: string | null = null;

    // Loop until we have enough places or no more pages are available
    while (needMorePages && allResults.length < effectiveMaxPlaces) {
      // Build the URL for the API request
      let apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${dynamicSearchRadius}&type=tourist_attraction|museum|park|point_of_interest|art_gallery|church|natural_feature|historic|monument|landmark|amusement_park|aquarium|zoo&keyword=attraction|landmark|culture|heritage|nature|park|historical|famous|viewpoint|scenic&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`;

      // Add the page token if we have one
      if (nextPageToken) {
        apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPageToken}&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`;

        // Google requires a delay before using next_page_token
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Make the API request with rate limiting
      const response = await rateLimitedFetch(apiUrl);
      const data = await response.json();

      // Check if the request was successful
      if (data.status === "OK" && data.results && data.results.length > 0) {
        // Add the results to our array
        allResults = [...allResults, ...data.results];

        // Check if there's a next page token
        nextPageToken = data.next_page_token || null;

        // Determine if we need more pages
        needMorePages = !!nextPageToken && allResults.length < effectiveMaxPlaces;

        console.log(
          `[placesController] Received ${data.results.length} places, total: ${
            allResults.length
          }, max: ${effectiveMaxPlaces}, have more: ${!!nextPageToken}`
        );
      } else {
        // No more results, or an error occurred
        needMorePages = false;

        // If this is the first request and it failed, try the alternative search
        if (!nextPageToken && (data.status !== "OK" || !data.results || data.results.length < 5)) {
          console.log(
            "[placesController] Few or no results found with initial search, trying with alternative parameters"
          );

          // Try a broader search with different parameters
          const radiusResponse = await rateLimitedFetch(
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${dynamicSearchRadius}&type=tourist_attraction|museum|park|landmark|historic&keyword=tourist|attraction|sightseeing|visit&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
          );

          const radiusData = await radiusResponse.json();

          // If we got valid results, use them
          if (radiusData.status === "OK" && radiusData.results && radiusData.results.length > 0) {
            allResults = radiusData.results;

            // Check if there's a next page token from the alternative search
            nextPageToken = radiusData.next_page_token || null;

            // Determine if we need more pages
            needMorePages = !!nextPageToken && allResults.length < effectiveMaxPlaces;
          }
        }
      }
    }

    // If we have no results, return empty
    if (allResults.length === 0) {
      console.log("[placesController] No places found");
      return {
        places: [],
        furthestDistance: dynamicSearchRadius,
      };
    }

    // Apply enhanced filtering
    const filteredResults = allResults
      .filter((place: any) => {
        // 1. Make sure it's not in our exclusion list
        const hasBlockedType = place.types.some((type: string) => NON_TOURIST_TYPES.includes(type));

        if (hasBlockedType) return false;

        // 2. Calculate tourism score for ranking
        place.tourismScore = calculateTourismScore(place);

        // 3. Filter based on minimum criteria
        return (
          (place.rating && place.rating >= MIN_RATING_THRESHOLD) ||
          place.tourismScore >= 40 ||
          (place.rating === undefined && place.tourismScore >= 30) ||
          (!place.rating && place.tourismScore >= 30)
        );
      })
      // Sort by tourism score and rating
      .sort((a: any, b: any) => {
        const scoreDiff = b.tourismScore - a.tourismScore;

        if (Math.abs(scoreDiff) < 10) {
          const aRating = a.rating || 0;
          const bRating = b.rating || 0;
          return bRating - aRating;
        }

        return scoreDiff;
      })
      // Limit to configured max places
      .slice(0, effectiveMaxPlaces);

    console.log(
      `[placesController] After filtering: ${filteredResults.length} places (max: ${effectiveMaxPlaces})`
    );

    // Calculate distance to furthest place
    let furthestDistance = 0;

    filteredResults.forEach((place: any) => {
      const distance = haversineDistance(
        latitude,
        longitude,
        place.geometry.location.lat,
        place.geometry.location.lng
      );

      if (distance > furthestDistance) {
        furthestDistance = distance;
      }
    });

    // Add 100 meters buffer to the furthest distance
    furthestDistance = Math.max(furthestDistance + 100, 1000); // At least 1km radius

    // CRITICAL CHANGE: Don't fetch details for all places!
    // Instead, just use the data we already have from nearbySearch
    const placesWithBasicInfo: Place[] = filteredResults.map((place: any) => {
      // Calculate distance from user's location to this place
      const distance = haversineDistance(
        latitude,
        longitude,
        place.geometry.location.lat,
        place.geometry.location.lng
      );

      // Create the basic place object without making additional API calls
      return {
        place_id: place.place_id,
        id: place.id,
        name: place.name,
        address: place.vicinity, // vicinity is available in the nearby search
        formatted_address: place.vicinity,
        geometry: place.geometry,
        description: getPlaceDescription(place),
        types: place.types || [],
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        price_level: place.price_level,
        photos: place.photos || [],
        icon: place.icon,
        icon_background_color: place.icon_background_color,
        icon_mask_base_uri: place.icon_mask_base_uri,
        vicinity: place.vicinity,
        business_status: place.business_status,
        distance: distance, // Add the distance from user to place
      };
    });

    // Final sort by distance for the UI display
    placesWithBasicInfo.sort((a: Place, b: Place) => {
      return (a.distance || 0) - (b.distance || 0);
    });

    // Update cache with the fresh data - using effectiveMaxPlaces in cache
    placesCache = {
      places: placesWithBasicInfo,
      furthestDistance,
      cacheTimestamp: Date.now(),
      latitude,
      longitude,
      maxPlaces: effectiveMaxPlaces,
      searchRadius: dynamicSearchRadius,
      detailedPlaceIds: new Set<string>(), // Initialize with an empty set
    };

    console.log(`[placesController] Cached ${placesWithBasicInfo.length} places with basic info`);

    return {
      places: placesWithBasicInfo,
      furthestDistance,
    };
  } catch (error: any) {
    console.error("[placesController] Error fetching nearby places:", error);
    // Return an empty array and default radius rather than showing an alert
    return {
      places: [],
      furthestDistance: dynamicSearchRadius,
    };
  }
};

/**
 * NEW FUNCTION: Fetch place details on demand when a user selects a place
 * This is the key to reducing API calls
 */
export const fetchPlaceDetailsOnDemand = async (placeId: string): Promise<Place | null> => {
  try {
    // Check if the place is in the cache first
    if (placesCache && placesCache.places.length > 0) {
      const cachedPlaceIndex = placesCache.places.findIndex((place) => place.place_id === placeId);
      const cachedPlace = cachedPlaceIndex >= 0 ? placesCache.places[cachedPlaceIndex] : null;

      // Check if we already have detailed information for this place
      if (cachedPlace && placesCache.detailedPlaceIds.has(placeId)) {
        console.log(`[placesController] Using cached detailed data for place: ${cachedPlace.name}`);
        return cachedPlace;
      }

      // If we have the place but without details, fetch the details and update cache
      if (cachedPlace) {
        console.log(`[placesController] Fetching details for cached place: ${cachedPlace.name}`);

        // Fetch place details from API
        const detailsResponse = await rateLimitedFetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,name,rating,photos,url,website,formatted_phone_number,opening_hours,reviews,editorial_summary,geometry,types&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
        );
        const detailsData = await detailsResponse.json();

        if (detailsData.status !== "OK") {
          console.warn(`[placesController] Could not fetch details for place: ${cachedPlace.name}`);
          return cachedPlace; // Return what we have
        }

        // Use editorial summary if available, otherwise use standard description
        const description =
          detailsData.result.editorial_summary?.overview ||
          cachedPlace.description ||
          getPlaceDescription(cachedPlace);

        // Create the enhanced place object with all the details
        const enhancedPlace: Place = {
          ...cachedPlace,
          description: description,
          formatted_address: detailsData.result.formatted_address || cachedPlace.vicinity,
          address: detailsData.result.formatted_address || cachedPlace.vicinity,
          phone: detailsData.result.formatted_phone_number,
          formatted_phone_number: detailsData.result.formatted_phone_number,
          website: detailsData.result.website,
          url: detailsData.result.url,
          opening_hours: detailsData.result.opening_hours,
          openingHours: detailsData.result.opening_hours,
          reviews: detailsData.result.reviews,
          // Update with new data but keep existing fields
          rating: detailsData.result.rating || cachedPlace.rating,
          photos: detailsData.result.photos || cachedPlace.photos,
        };

        // Update the place in cache with detailed info
        if (placesCache && cachedPlaceIndex >= 0) {
          placesCache.places[cachedPlaceIndex] = enhancedPlace;
          placesCache.detailedPlaceIds.add(placeId); // Mark as having details
          console.log(
            `[placesController] Updated cache with detailed info for ${enhancedPlace.name}`
          );
        }

        return enhancedPlace;
      }
    }

    // If not in cache at all, fetch from API directly
    console.log(`[placesController] Fetching details for place ID: ${placeId}`);
    const detailsResponse = await rateLimitedFetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,name,rating,photos,url,website,formatted_phone_number,opening_hours,reviews,editorial_summary,geometry,types&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
    );

    const detailsData = await detailsResponse.json();

    if (detailsData.status !== "OK") {
      throw new Error(`Could not fetch details for place ID: ${placeId}`);
    }

    // Use editorial summary if available, otherwise use standard description
    const description =
      detailsData.result.editorial_summary?.overview || getPlaceDescription(detailsData.result);

    // Create the place object
    const detailedPlace: Place = {
      place_id: placeId,
      name: detailsData.result.name,
      geometry: detailsData.result.geometry,
      description: description,
      address: detailsData.result.formatted_address,
      formatted_address: detailsData.result.formatted_address,
      phone: detailsData.result.formatted_phone_number,
      formatted_phone_number: detailsData.result.formatted_phone_number,
      website: detailsData.result.website,
      url: detailsData.result.url,
      rating: detailsData.result.rating,
      photos: detailsData.result.photos,
      openingHours: detailsData.result.opening_hours,
      opening_hours: detailsData.result.opening_hours,
      reviews: detailsData.result.reviews,
      types: detailsData.result.types,
    };

    // Try to add to cache if it exists
    if (placesCache) {
      // Check if this place should be added to the cache
      const placeDistance = detailedPlace.geometry
        ? haversineDistance(
            placesCache.latitude,
            placesCache.longitude,
            detailedPlace.geometry.location.lat,
            detailedPlace.geometry.location.lng
          )
        : 0;

      // Only add to cache if it's within our search radius
      if (placeDistance <= placesCache.searchRadius) {
        const existingIndex = placesCache.places.findIndex((p) => p.place_id === placeId);

        if (existingIndex >= 0) {
          // Update existing place
          placesCache.places[existingIndex] = detailedPlace;
        } else {
          // Add new place to cache
          placesCache.places.push(detailedPlace);
        }

        // Mark as having details
        placesCache.detailedPlaceIds.add(placeId);
        console.log(`[placesController] Added detailed place to cache: ${detailedPlace.name}`);
      }
    }

    return detailedPlace;
  } catch (error: any) {
    console.error("[placesController] Error fetching place details:", error);
    return null;
  }
};

// Existing fetchPlaceById function
export const fetchPlaceById = async (placeId: string): Promise<Place | null> => {
  // This can now use our new fetchPlaceDetailsOnDemand function
  return fetchPlaceDetailsOnDemand(placeId);
};
