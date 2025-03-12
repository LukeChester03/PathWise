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
const DEFAULT_RADIUS = 50000;

// Minimum rating threshold for tourist attractions (0-5 scale)
const MIN_RATING_THRESHOLD = 3.5;

// Minimum number of reviews for added credibility
const MIN_REVIEWS_COUNT = 5;

// Cache for nearby places to avoid repeated API calls
let placesCache: {
  places: Place[];
  furthestDistance: number;
  cacheTimestamp: number;
  latitude: number;
  longitude: number;
} | null = null;

// Cache expiration time (30 minutes)
const CACHE_EXPIRATION_TIME = 30 * 60 * 1000;

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
  placesCache = null;
  console.log("Places cache cleared");
};

/**
 * Check if the cache is valid based on position and time
 */
const isCacheValid = (latitude: number, longitude: number): boolean => {
  if (!placesCache) return false;

  // Check if cache has expired
  const now = Date.now();
  if (now - placesCache.cacheTimestamp > CACHE_EXPIRATION_TIME) {
    console.log("Places cache expired");
    return false;
  }

  // Check if user has moved significantly from the cached location
  const distanceMoved = haversineDistance(
    placesCache.latitude,
    placesCache.longitude,
    latitude,
    longitude
  );

  // If moved more than 500 meters, invalidate cache
  if (distanceMoved > 500) {
    console.log(`User moved ${distanceMoved.toFixed(0)}m from cache location - invalidating cache`);
    return false;
  }

  return true;
};

export const fetchNearbyPlaces = async (
  latitude: number,
  longitude: number,
  forceRefresh: boolean = false
): Promise<NearbyPlacesResponse> => {
  try {
    // First check if latitude and longitude are valid numbers
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      console.error("Invalid coordinates for fetchNearbyPlaces:", latitude, longitude);
      return {
        places: [],
        furthestDistance: DEFAULT_RADIUS,
      };
    }

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && isCacheValid(latitude, longitude) && placesCache) {
      console.log("Using cached places data");
      return {
        places: placesCache.places,
        furthestDistance: placesCache.furthestDistance,
      };
    }

    console.log("Fetching fresh nearby places data");

    // Built a richer query with more tourist-specific types and keywords
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&type=tourist_attraction|museum|park|point_of_interest|art_gallery|church|natural_feature|historic|monument|landmark|amusement_park|aquarium|zoo&keyword=attraction|landmark|culture|heritage|nature|park|historical|famous|viewpoint|scenic&rankby=distance&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
    );

    const data = await response.json();

    // If initial search fails, try broader search with radius
    if (data.status !== "OK" || !data.results || data.results.length < 5) {
      console.log("Few or no results found with initial search, trying with radius parameter");

      // Try a broader search with radius parameter
      const radiusResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=20000&type=tourist_attraction|museum|park|landmark|historic&keyword=tourist|attraction|sightseeing|visit&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
      );

      const radiusData = await radiusResponse.json();

      // If we got valid results, use them
      if (radiusData.status === "OK" && radiusData.results && radiusData.results.length > 0) {
        data.results = radiusData.results;
        data.status = radiusData.status;
      }
    }

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("API Error:", data.status, data.error_message || "Unknown API error");
      return {
        places: [],
        furthestDistance: DEFAULT_RADIUS,
      };
    }

    // Handle case when no results (but status is OK)
    if (!data.results || data.results.length === 0) {
      return {
        places: [],
        furthestDistance: DEFAULT_RADIUS, // Default radius if no places found
      };
    }

    // Enhanced filtering to ensure only quality tourist destinations
    const filteredResults = data.results
      .filter((place: any) => {
        // 1. Make sure it's not in our exclusion list
        const hasBlockedType = place.types.some((type: string) => NON_TOURIST_TYPES.includes(type));

        if (hasBlockedType) return false;

        // 2. Calculate tourism score for ranking
        place.tourismScore = calculateTourismScore(place);

        // 3. Filter based on minimum criteria:
        // - Either has a good rating (above threshold)
        // - Or has a strong tourism score
        // - If rating exists, it must not be too low
        return (
          (place.rating && place.rating >= MIN_RATING_THRESHOLD) ||
          place.tourismScore >= 40 ||
          (place.rating === undefined && place.tourismScore >= 30) ||
          (!place.rating && place.tourismScore >= 30)
        );
      })
      // Sort by tourism score and rating to get best attractions first
      .sort((a: any, b: any) => {
        // Primary sort by tourism score
        const scoreDiff = b.tourismScore - a.tourismScore;

        // Secondary sort by rating (if scores are close)
        if (Math.abs(scoreDiff) < 10) {
          const aRating = a.rating || 0;
          const bRating = b.rating || 0;
          return bRating - aRating;
        }

        return scoreDiff;
      })
      // Limit to MAX_PLACES
      .slice(0, MAX_PLACES);

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

    // Get details for each place
    const placesWithDetails: Place[] = await Promise.all(
      filteredResults.map(async (place: Place) => {
        try {
          const detailsResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_address,name,rating,photos,url,website,formatted_phone_number,opening_hours,reviews,editorial_summary&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
          );

          const detailsData = await detailsResponse.json();

          if (detailsData.status !== "OK") {
            console.warn(`Could not fetch details for place: ${place.name}`);
            return place;
          }

          // Calculate distance from user's location to this place
          const distance = haversineDistance(
            latitude,
            longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          );

          // Use editorial summary if available, otherwise use standard description based on place type
          const description =
            detailsData.result.editorial_summary?.overview || getPlaceDescription(place);

          // Create the enhanced place object with all the details
          return {
            ...place,
            description: description,
            address: detailsData.result.formatted_address,
            phone: detailsData.result.formatted_phone_number,
            website: detailsData.result.website,
            rating: detailsData.result.rating,
            photos: detailsData.result.photos,
            openingHours: detailsData.result.opening_hours,
            reviews: detailsData.result.reviews,
            distance: distance, // Add the distance from user to place
          };
        } catch (detailsError) {
          console.error(`Error fetching details for ${place.name}:`, detailsError);

          // Calculate distance for the place even if details fetch fails
          const distance = haversineDistance(
            latitude,
            longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          );

          return {
            ...place,
            distance: distance,
            description: getPlaceDescription(place),
          };
        }
      })
    );

    // Final sort by distance for the UI display
    placesWithDetails.sort((a: Place, b: Place) => {
      return (a.distance || 0) - (b.distance || 0);
    });

    // Update cache with the fresh data
    placesCache = {
      places: placesWithDetails,
      furthestDistance,
      cacheTimestamp: Date.now(),
      latitude,
      longitude,
    };

    console.log(`Cached ${placesWithDetails.length} places at ${new Date().toLocaleTimeString()}`);

    return {
      places: placesWithDetails,
      furthestDistance,
    };
  } catch (error: any) {
    console.error("Error fetching nearby places:", error);
    // Return an empty array and default radius rather than showing an alert
    return {
      places: [],
      furthestDistance: DEFAULT_RADIUS, // Default radius if error
    };
  }
};

// Function to fetch a place by ID for detailed views
export const fetchPlaceById = async (placeId: string): Promise<Place | null> => {
  try {
    // Check if the place is in the cache first
    if (placesCache && placesCache.places.length > 0) {
      const cachedPlace = placesCache.places.find((place) => place.place_id === placeId);
      if (cachedPlace) {
        console.log(`Using cached data for place: ${cachedPlace.name}`);
        return cachedPlace;
      }
    }

    // If not in cache, fetch from API
    const detailsResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,name,rating,photos,url,website,formatted_phone_number,opening_hours,reviews,editorial_summary,geometry,types&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
    );

    const detailsData = await detailsResponse.json();

    if (detailsData.status !== "OK") {
      throw new Error(`Could not fetch details for place ID: ${placeId}`);
    }

    // Use editorial summary if available, otherwise use standard description
    const description =
      detailsData.result.editorial_summary?.overview || getPlaceDescription(detailsData.result);

    return {
      place_id: placeId,
      name: detailsData.result.name,
      geometry: detailsData.result.geometry,
      description: description,
      address: detailsData.result.formatted_address,
      phone: detailsData.result.formatted_phone_number,
      website: detailsData.result.website,
      rating: detailsData.result.rating,
      photos: detailsData.result.photos,
      openingHours: detailsData.result.opening_hours,
      reviews: detailsData.result.reviews,
      types: detailsData.result.types,
    };
  } catch (error: any) {
    console.error("Error fetching place details:", error);
    Alert.alert("Error fetching place details", error.message || "An unknown error occurred");
    return null;
  }
};
