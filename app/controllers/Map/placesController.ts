// src/controllers/Map/placesController.ts
import { Place, PlaceDetails } from "../../types/MapTypes";
import { Alert } from "react-native";

export const fetchNearbyPlaces = async (latitude: number, longitude: number): Promise<Place[]> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=250&type=tourist_attraction&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
    );
    const data = await response.json();
    console.log(data, "DATA");

    const placesWithDetails: Place[] = await Promise.all(
      data.results.map(async (place: Place) => {
        const detailsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_address,name,rating&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
        );
        const detailsData: PlaceDetails = await detailsResponse.json();
        return {
          ...place,
          description: detailsData.result.desc,
        };
      })
    );

    return placesWithDetails;
  } catch (error: any) {
    console.error("Error fetching nearby places:", error);
    Alert.alert("Error fetching nearby places", error.message);
    return [];
  }
};
