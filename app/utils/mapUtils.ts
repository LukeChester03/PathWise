import { Coordinate, NavigationStep } from "../types/MapTypes";

export const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  fallbackHeading: number = 0
): number => {
  if (lat1 === lat2 && lon1 === lon2) {
    return fallbackHeading;
  }

  const toRad = (value: number): number => (value * Math.PI) / 180;
  const toDeg = (value: number): number => (value * 180) / Math.PI;

  const startLat = toRad(lat1);
  const startLng = toRad(lon1);
  const destLat = toRad(lat2);
  const destLng = toRad(lon2);

  const y = Math.sin(destLng - startLng) * Math.cos(destLat);
  const x =
    Math.cos(startLat) * Math.sin(destLat) -
    Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
  let brng = Math.atan2(y, x);
  brng = toDeg(brng);
  return (brng + 360) % 360;
};

export const calculateLookAheadPosition = (
  latitude: number,
  longitude: number,
  heading: number,
  distance: number
): Coordinate => {
  if (!latitude || !longitude || heading === undefined || distance === undefined) {
    return { latitude, longitude };
  }

  const R = 6371000;
  const d = distance / R;
  const bearingRad = (heading * Math.PI) / 180;

  const lat1 = (latitude * Math.PI) / 180;
  const lon1 = (longitude * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearingRad)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lon2 * 180) / Math.PI,
  };
};

export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const parseRouteInstructions = (result: any): NavigationStep[] => {
  try {
    if (!result.legs || !result.legs[0] || !result.legs[0].steps) {
      console.warn("Invalid route data format");
      return [];
    }

    const steps = result.legs[0].steps;

    return steps.map((step: any, index: number) => ({
      id: index,
      instructions: step.html_instructions.replace(/<[^>]*>/g, ""),
      distance: {
        text: step.distance.text,
        value: step.distance.value,
      },
      duration: {
        text: step.duration.text,
        value: step.duration.value,
      },
      maneuver: step.maneuver || "",
      startLocation: {
        latitude: step.start_location.lat,
        longitude: step.start_location.lng,
      },
      endLocation: {
        latitude: step.end_location.lat,
        longitude: step.end_location.lng,
      },
    }));
  } catch (error) {
    console.error("Error parsing route instructions:", error);
    return [];
  }
};

export const getNotificationMessage = (placeName: string): string => {
  const messages = [
    `${placeName} is just around the corner!`,
    `You're close to ${placeName}! Discover it now.`,
    `Adventure awaits at nearby ${placeName}!`,
    `New discovery opportunity: ${placeName} is close by!`,
    `${placeName} is within walking distance. Check it out!`,
  ];

  return messages[Math.floor(Math.random() * messages.length)];
};
