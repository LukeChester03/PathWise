// src/controllers/Map/routesController.ts
import { Alert } from "react-native";
import * as Polyline from "@mapbox/polyline";
import { TravelMode } from "../../types/MapTypes";

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

// Distance threshold for driving vs walking (5km = 5000m)
const DRIVING_DISTANCE_THRESHOLD = 2000;

/**
 * Estimates the direct distance between two coordinates
 * to determine if driving mode should be used before fetching the actual route
 */
const estimateDirectDistance = (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): number => {
  // Simple Haversine implementation for quick distance estimation
  const R = 6371e3; // Earth radius in meters
  const φ1 = (originLat * Math.PI) / 180;
  const φ2 = (destLat * Math.PI) / 180;
  const Δφ = ((destLat - originLat) * Math.PI) / 180;
  const Δλ = ((destLng - originLng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // in meters

  console.log(`Estimated direct distance: ${(distance / 1000).toFixed(2)} km`);
  return distance;
};

/**
 * Parse coordinates from string format (e.g., "37.7749,-122.4194")
 */
const parseCoordinates = (coordString: string): { lat: number; lng: number } | null => {
  try {
    const [lat, lng] = coordString.split(",").map((coord) => parseFloat(coord.trim()));
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  } catch (e) {
    return null;
  }
};

/**
 * Calculate estimated travel time based on distance and mode
 * This is a fallback in case the API doesn't return duration data
 */
const estimateTravelTime = (distanceInMeters: number, travelMode: TravelMode): string => {
  // Rough travel speeds:
  // Walking: ~5 km/h = ~1.4 m/s
  // Driving urban: ~30 km/h = ~8.3 m/s
  const walkingSpeed = 1.4; // meters per second
  const drivingSpeed = 8.3; // meters per second

  const timeInSeconds =
    travelMode === "driving" ? distanceInMeters / drivingSpeed : distanceInMeters / walkingSpeed;

  const minutes = Math.ceil(timeInSeconds / 60);
  return `${minutes} min`;
};

/**
 * Fetches a route between two points, using walking mode for distances under 5km
 * and driving mode for distances over 5km
 */
export const fetchRoute = async (
  origin: string,
  destination: string,
  forceTravelMode?: TravelMode
): Promise<{
  coords: { latitude: number; longitude: number }[];
  duration: string;
  distance: number;
  travelMode: TravelMode;
} | null> => {
  try {
    // Determine appropriate travel mode based on distance
    let travelMode: TravelMode = "walking";

    // Use forced travel mode if provided
    if (forceTravelMode) {
      travelMode = forceTravelMode;
      console.log(`Using forced travel mode: ${travelMode}`);
    } else {
      // Try to estimate direct distance to determine travel mode
      const originCoords = parseCoordinates(origin);
      const destCoords = parseCoordinates(destination);

      if (originCoords && destCoords) {
        const estimatedDistance = estimateDirectDistance(
          originCoords.lat,
          originCoords.lng,
          destCoords.lat,
          destCoords.lng
        );

        // If estimated distance is over threshold, use driving mode
        if (estimatedDistance > DRIVING_DISTANCE_THRESHOLD) {
          travelMode = "driving";
          console.log(
            `Distance exceeds ${DRIVING_DISTANCE_THRESHOLD / 1000}km threshold, using driving mode`
          );
        } else {
          console.log(
            `Distance under ${DRIVING_DISTANCE_THRESHOLD / 1000}km threshold, using walking mode`
          );
        }
      }
    }

    // Log the travel mode we're using
    console.log(`Fetching route with travel mode: ${travelMode}`);

    // Fetch route with appropriate travel mode
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=${travelMode}&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
    );

    const data: RouteResponse = await response.json();

    if (data.routes && data.routes.length > 0) {
      const points = data.routes[0].overview_polyline.points;
      const coords = Polyline.decode(points).map(([lat, lng]) => ({
        latitude: lat,
        longitude: lng,
      }));

      // Get duration and distance from API
      const duration = data.routes[0].legs[0].duration.text;
      const distanceInMeters = data.routes[0].legs[0].distance.value;
      const distanceInKm = distanceInMeters / 1000;

      // Log what we received from the API
      console.log(
        `API returned route: ${distanceInKm.toFixed(
          2
        )}km with ${travelMode} mode, time: ${duration}`
      );

      // Double check threshold for driving mode with actual route distance
      if (travelMode === "walking" && distanceInMeters > DRIVING_DISTANCE_THRESHOLD) {
        console.log(
          `API route distance is over ${
            DRIVING_DISTANCE_THRESHOLD / 1000
          }km, switching to driving mode`
        );
        return fetchRoute(origin, destination, "driving");
      }

      // If the API didn't return a good duration value, estimate it ourselves
      const finalDuration = duration || estimateTravelTime(distanceInMeters, travelMode);

      return {
        coords,
        duration: finalDuration,
        distance: distanceInKm,
        travelMode,
      };
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
