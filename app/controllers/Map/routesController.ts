// src/controllers/Map/routesController.ts
import { Alert } from "react-native";
import * as Polyline from "@mapbox/polyline";

interface Route {
  overview_polyline: {
    points: string;
  };
  legs: {
    duration: {
      text: string;
      value: number;
    };
    distance: {
      text: string;
      value: number;
    };
  }[];
}

interface RouteResponse {
  routes: Route[];
}

export const fetchRoute = async (
  origin: string,
  destination: string
): Promise<{
  coords: { latitude: number; longitude: number }[];
  duration: string;
  distance: number;
} | null> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=walking&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
    );
    const data: RouteResponse = await response.json();
    if (data.routes && data.routes.length > 0) {
      const points = data.routes[0].overview_polyline.points;
      const coords = Polyline.decode(points).map(([lat, lng]) => ({
        latitude: lat,
        longitude: lng,
      }));
      const duration = data.routes[0].legs[0].duration.text;

      // Extract distance in kilometers (the API returns distance in meters)
      const distanceInMeters = data.routes[0].legs[0].distance.value;
      const distanceInKm = distanceInMeters / 1000;

      return { coords, duration, distance: distanceInKm };
    } else {
      console.warn("No routes found in the response.");
      return null;
    }
  } catch (error: any) {
    console.error("Error fetching route:", error);
    Alert.alert("Error fetching route", error.message);
    return null;
  }
};
