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
];

// Maximum number of places to fetch
const MAX_PLACES = 20;

// Default search radius when ranking by distance is not available
const DEFAULT_RADIUS = 50000; // 50km

export const fetchNearbyPlaces = async (
  latitude: number,
  longitude: number
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

    // First try with rankby=distance (no radius parameter allowed)
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&type=tourist_attraction|museum|park|point_of_interest|art_gallery|church|natural_feature&keyword=attraction|landmark|culture|heritage|nature|park&rankby=distance&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
    );

    const data = await response.json();

    // If we get ZERO_RESULTS, try a broader search with radius instead
    if (data.status === "ZERO_RESULTS") {
      console.log("No nearby places found with rankby=distance, trying with radius instead");

      // Try a broader search with radius parameter
      const radiusResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${DEFAULT_RADIUS}&type=tourist_attraction,museum,park&keyword=tourist,attraction,sightseeing&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
      );

      const radiusData = await radiusResponse.json();

      // If still no results, return empty array with default radius
      if (
        radiusData.status === "ZERO_RESULTS" ||
        !radiusData.results ||
        radiusData.results.length === 0
      ) {
        console.log("No tourist attractions found in this area");
        return {
          places: [],
          furthestDistance: DEFAULT_RADIUS, // Default 500m radius if no places found
        };
      }

      // Use the results from the radius search
      data.results = radiusData.results;
      data.status = radiusData.status;
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

    // Additional filtering to ensure only tourist destinations
    const filteredResults = data.results
      .filter((place: any) => {
        // Make sure it's not a business, restaurant, etc.
        return !place.types.some((type: string) => NON_TOURIST_TYPES.includes(type));
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
    furthestDistance = Math.max(furthestDistance + 100, DEFAULT_RADIUS); // At least DEFAULT_RADIUS radius

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

          // Combine the place data with the details
          return {
            ...place,
            description:
              detailsData.result.editorial_summary?.overview ||
              "A popular tourist destination worth exploring.",
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
            description: "A tourist attraction worth exploring.",
          };
        }
      })
    );

    // Sort places by distance
    placesWithDetails.sort((a: Place, b: Place) => {
      return (a.distance || 0) - (b.distance || 0);
    });

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
    const detailsResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,name,rating,photos,url,website,formatted_phone_number,opening_hours,reviews,editorial_summary,geometry&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
    );

    const detailsData = await detailsResponse.json();

    if (detailsData.status !== "OK") {
      throw new Error(`Could not fetch details for place ID: ${placeId}`);
    }

    return {
      place_id: placeId,
      name: detailsData.result.name,
      geometry: detailsData.result.geometry,
      description:
        detailsData.result.editorial_summary?.overview ||
        "A popular tourist destination worth exploring.",
      address: detailsData.result.formatted_address,
      phone: detailsData.result.formatted_phone_number,
      website: detailsData.result.website,
      rating: detailsData.result.rating,
      photos: detailsData.result.photos,
      openingHours: detailsData.result.opening_hours,
      reviews: detailsData.result.reviews,
    };
  } catch (error: any) {
    console.error("Error fetching place details:", error);
    Alert.alert("Error fetching place details", error.message || "An unknown error occurred");
    return null;
  }
};
