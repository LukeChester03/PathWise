// src/controllers/Map/placesController.ts
import { Place, PlaceDetails } from "../../types/MapTypes";
import { Alert } from "react-native";

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

export const fetchNearbyPlaces = async (latitude: number, longitude: number): Promise<Place[]> => {
  try {
    // Improved API request with better filtering
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=1000&type=tourist_attraction&keyword=tourist,attraction,landmark,sightseeing&rankby=prominence&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
    );

    const data = await response.json();

    if (!data.results || data.status !== "OK") {
      console.error("API Error:", data.status, data.error_message);
      throw new Error(data.error_message || "Failed to fetch places");
    }

    // Additional filtering to ensure only tourist destinations
    const filteredResults = data.results.filter((place: any) => {
      // Make sure it's not a business, restaurant, etc.
      return !place.types.some((type: string) => NON_TOURIST_TYPES.includes(type));
    });

    // Get details for each place
    const placesWithDetails: Place[] = await Promise.all(
      filteredResults.map(async (place: Place) => {
        try {
          const detailsResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_address,name,rating,photos,url,website,formatted_phone_number,opening_hours,reviews&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
          );

          const detailsData = await detailsResponse.json();

          if (detailsData.status !== "OK") {
            console.warn(`Could not fetch details for place: ${place.name}`);
            return place;
          }

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
          };
        } catch (detailsError) {
          console.error(`Error fetching details for ${place.name}:`, detailsError);
          return place; // Return the place without details if there's an error
        }
      })
    );

    return placesWithDetails;
  } catch (error: any) {
    console.error("Error fetching nearby places:", error);
    Alert.alert("Error fetching nearby places", error.message || "An unknown error occurred");
    return [];
  }
};

// Optional: Add a function to fetch a place by ID for detailed views
export const fetchPlaceById = async (placeId: string): Promise<Place | null> => {
  try {
    const detailsResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,name,rating,photos,url,website,formatted_phone_number,opening_hours,reviews,editorial_summary&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
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
