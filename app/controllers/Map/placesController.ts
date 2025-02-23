import { Place } from "../../types/MapTypes";
import { Alert } from "react-native";

export const fetchNearbyPlaces = async (latitude: number, longitude: number): Promise<Place[]> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=500&type=tourist_attraction&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
    );
    const data = await response.json();
    return data.results;
  } catch (error: any) {
    console.error("Error fetching nearby places:", error);
    Alert.alert("Error fetching nearby places", error.message);
    return [];
  }
};
