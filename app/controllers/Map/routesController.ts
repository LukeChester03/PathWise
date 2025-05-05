import { Alert } from "react-native";
import * as Polyline from "@mapbox/polyline";
import { TravelMode, Coordinate } from "../../types/MapTypes";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { hasQuotaAvailable, recordApiCall } from "./quotaController";
import { GOOGLE_MAPS_APIKEY } from "../../constants/Map/mapConstants";
import { haversineDistance } from "../../utils/mapUtils";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";

const ROUTES_CACHE_STORAGE_KEY = "route_cache_v1";
const ROUTE_CACHE_EXPIRATION = 30 * 24 * 60 * 60 * 1000;

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
    steps?: any[];
  }[];
}

interface RouteResponse {
  routes: Route[];
}

interface CachedRoute {
  origin: string;
  destination: string;
  travelMode: TravelMode;
  coords: Coordinate[];
  duration: string;
  distance: number;
  timestamp: number;
}

interface FirebaseRoute {
  origin: string;
  destination: string;
  travelMode: TravelMode;
  coords: {
    latitude: number;
    longitude: number;
  }[];
  duration: string;
  distance: number;
  createdAt: any;
  updatedAt: any;
}

let routesCache: { [key: string]: CachedRoute } = {};

const DRIVING_DISTANCE_THRESHOLD = 2000;

const initializeRouteCache = async () => {
  try {
    const cachedRoutesJson = await AsyncStorage.getItem(ROUTES_CACHE_STORAGE_KEY);
    if (cachedRoutesJson) {
      routesCache = JSON.parse(cachedRoutesJson);
      console.log(`[routesController] Loaded ${Object.keys(routesCache).length} cached routes`);
    }
  } catch (error) {
    console.error("[routesController] Error initializing route cache:", error);
    routesCache = {};
  }
};

initializeRouteCache();

const persistRouteCache = async () => {
  try {
    await AsyncStorage.setItem(ROUTES_CACHE_STORAGE_KEY, JSON.stringify(routesCache));
  } catch (error) {
    console.error("[routesController] Error persisting route cache:", error);
  }
};

const getRouteCacheKey = (origin: string, destination: string, travelMode: TravelMode): string => {
  return `${origin}|${destination}|${travelMode}`;
};

const isCachedRouteValid = (cachedRoute: CachedRoute): boolean => {
  const now = Date.now();
  return now - cachedRoute.timestamp < ROUTE_CACHE_EXPIRATION;
};

const fetchRouteFromFirebase = async (
  origin: string,
  destination: string,
  travelMode: TravelMode
): Promise<CachedRoute | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    const cacheKey = getRouteCacheKey(origin, destination, travelMode);

    const routeDocRef = doc(db, "routes", cacheKey);
    const routeDoc = await getDoc(routeDocRef);

    if (routeDoc.exists()) {
      const routeData = routeDoc.data() as FirebaseRoute;

      const createdTime = routeData.createdAt.toDate().getTime();
      if (Date.now() - createdTime > ROUTE_CACHE_EXPIRATION) {
        console.log(`[routesController] Firebase route is expired`);
        return null;
      }

      console.log(`[routesController] Found route in Firebase: ${cacheKey}`);

      return {
        origin: routeData.origin,
        destination: routeData.destination,
        travelMode: routeData.travelMode,
        coords: routeData.coords,
        duration: routeData.duration,
        distance: routeData.distance,
        timestamp: createdTime,
      };
    }

    return null;
  } catch (error) {
    console.error("[routesController] Error fetching route from Firebase:", error);
    return null;
  }
};

const saveRouteToFirebase = async (cacheKey: string, route: CachedRoute): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const firebaseRoute: FirebaseRoute = {
      origin: route.origin,
      destination: route.destination,
      travelMode: route.travelMode,
      coords: route.coords,
      duration: route.duration,
      distance: route.distance,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const routeDocRef = doc(db, "routes", cacheKey);
    await setDoc(routeDocRef, firebaseRoute);

    console.log(`[routesController] Saved route to Firebase: ${cacheKey}`);
  } catch (error) {
    console.error("[routesController] Error saving route to Firebase:", error);
  }
};

const estimateDirectDistance = (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): number => {
  return haversineDistance(originLat, originLng, destLat, destLng);
};

const parseCoordinates = (coordString: string): { lat: number; lng: number } | null => {
  try {
    const [lat, lng] = coordString.split(",").map((coord) => parseFloat(coord.trim()));
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  } catch (e) {
    return null;
  }
};

const estimateTravelTime = (distanceInMeters: number, travelMode: TravelMode): string => {
  const walkingSpeed = 1.4;
  const drivingSpeed = 8.3;

  const timeInSeconds =
    travelMode === "driving" ? distanceInMeters / drivingSpeed : distanceInMeters / walkingSpeed;

  const minutes = Math.ceil(timeInSeconds / 60);
  return `${minutes} min`;
};

const generateOfflineRoute = (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  travelMode: TravelMode
): {
  coords: Coordinate[];
  duration: string;
  distance: number;
  travelMode: TravelMode;
} => {
  const distanceInMeters = haversineDistance(originLat, originLng, destLat, destLng);
  const distanceInKm = distanceInMeters / 1000;
  const duration = estimateTravelTime(distanceInMeters, travelMode);
  const coords: Coordinate[] = [
    { latitude: originLat, longitude: originLng },
    {
      latitude: originLat + (destLat - originLat) * 0.33 + (Math.random() * 0.001 - 0.0005),
      longitude: originLng + (destLng - originLng) * 0.33 + (Math.random() * 0.001 - 0.0005),
    },
    {
      latitude: originLat + (destLat - originLat) * 0.66 + (Math.random() * 0.001 - 0.0005),
      longitude: originLng + (destLng - originLng) * 0.66 + (Math.random() * 0.001 - 0.0005),
    },
    { latitude: destLat, longitude: destLng },
  ];

  return {
    coords,
    duration,
    distance: distanceInKm,
    travelMode,
  };
};

export const fetchRoute = async (
  origin: string,
  destination: string,
  forceTravelMode?: TravelMode
): Promise<{
  coords: Coordinate[];
  duration: string;
  distance: number;
  travelMode: TravelMode;
} | null> => {
  try {
    console.log(`[routesController] fetchRoute from ${origin} to ${destination}`);

    let travelMode: TravelMode = "walking";

    if (forceTravelMode) {
      travelMode = forceTravelMode;
    } else {
      const originCoords = parseCoordinates(origin);
      const destCoords = parseCoordinates(destination);

      if (originCoords && destCoords) {
        const estimatedDistance = estimateDirectDistance(
          originCoords.lat,
          originCoords.lng,
          destCoords.lat,
          destCoords.lng
        );

        if (estimatedDistance > DRIVING_DISTANCE_THRESHOLD) {
          travelMode = "driving";
        }
      }
    }

    console.log(`[routesController] Using travel mode: ${travelMode}`);

    const cacheKey = getRouteCacheKey(origin, destination, travelMode);
    const cachedRoute = routesCache[cacheKey];

    if (cachedRoute && isCachedRouteValid(cachedRoute)) {
      console.log("[routesController] Using cached route from memory");
      return {
        coords: cachedRoute.coords,
        duration: cachedRoute.duration,
        distance: cachedRoute.distance,
        travelMode: cachedRoute.travelMode,
      };
    }

    const firebaseRoute = await fetchRouteFromFirebase(origin, destination, travelMode);
    if (firebaseRoute) {
      routesCache[cacheKey] = firebaseRoute;
      persistRouteCache();

      console.log("[routesController] Using cached route from Firebase");
      return {
        coords: firebaseRoute.coords,
        duration: firebaseRoute.duration,
        distance: firebaseRoute.distance,
        travelMode: firebaseRoute.travelMode,
      };
    }

    const hasQuota = await hasQuotaAvailable("directions");

    if (!hasQuota) {
      console.warn("[routesController] No directions API quota left, using offline route");

      const originCoords = parseCoordinates(origin);
      const destCoords = parseCoordinates(destination);

      if (originCoords && destCoords) {
        const offlineRoute = generateOfflineRoute(
          originCoords.lat,
          originCoords.lng,
          destCoords.lat,
          destCoords.lng,
          travelMode
        );

        const routeToCache: CachedRoute = {
          origin,
          destination,
          travelMode,
          coords: offlineRoute.coords,
          duration: offlineRoute.duration,
          distance: offlineRoute.distance,
          timestamp: Date.now(),
        };

        routesCache[cacheKey] = routeToCache;
        persistRouteCache();

        saveRouteToFirebase(cacheKey, routeToCache);

        return offlineRoute;
      }

      return null;
    }

    console.log(`[routesController] Fetching route from API`);

    await recordApiCall("directions");

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=${travelMode}&key=${GOOGLE_MAPS_APIKEY}`
    );

    const data: RouteResponse = await response.json();

    if (data.routes && data.routes.length > 0) {
      const points = data.routes[0].overview_polyline.points;
      const coords = Polyline.decode(points).map(([lat, lng]) => ({
        latitude: lat,
        longitude: lng,
      }));

      const duration = data.routes[0].legs[0].duration.text;
      const distanceInMeters = data.routes[0].legs[0].distance.value;
      const distanceInKm = distanceInMeters / 1000;

      console.log(
        `[routesController] Route fetched: ${distanceInKm.toFixed(
          2
        )}km with ${travelMode} mode, time: ${duration}`
      );

      if (travelMode === "walking" && distanceInMeters > DRIVING_DISTANCE_THRESHOLD) {
        console.log(`[routesController] Distance exceeds walking threshold, switching to driving`);
        return fetchRoute(origin, destination, "driving");
      }

      const finalDuration = duration || estimateTravelTime(distanceInMeters, travelMode);

      const routeToCache: CachedRoute = {
        origin,
        destination,
        travelMode,
        coords,
        duration: finalDuration,
        distance: distanceInKm,
        timestamp: Date.now(),
      };

      routesCache[cacheKey] = routeToCache;
      persistRouteCache();

      saveRouteToFirebase(cacheKey, routeToCache);

      return {
        coords,
        duration: finalDuration,
        distance: distanceInKm,
        travelMode,
      };
    } else {
      console.warn("[routesController] No routes found in API response");

      const originCoords = parseCoordinates(origin);
      const destCoords = parseCoordinates(destination);

      if (originCoords && destCoords) {
        return generateOfflineRoute(
          originCoords.lat,
          originCoords.lng,
          destCoords.lat,
          destCoords.lng,
          travelMode
        );
      }

      return null;
    }
  } catch (error: any) {
    console.error("[routesController] Error fetching route:", error);

    const originCoords = parseCoordinates(origin);
    const destCoords = parseCoordinates(destination);

    if (originCoords && destCoords) {
      return generateOfflineRoute(
        originCoords.lat,
        originCoords.lng,
        destCoords.lat,
        destCoords.lng,
        forceTravelMode || "walking"
      );
    }

    return null;
  }
};

export const clearRouteCache = async (): Promise<void> => {
  routesCache = {};
  await AsyncStorage.removeItem(ROUTES_CACHE_STORAGE_KEY);
  console.log("[routesController] Route cache cleared");
};

export const getRouteCacheStats = (): {
  memoryCache: {
    count: number;
    youngestAge: string;
    oldestAge: string;
  };
  firebaseCache?: {
    count: number;
  };
} => {
  const stats: any = {
    memoryCache: {
      count: 0,
      youngestAge: "N/A",
      oldestAge: "N/A",
    },
  };

  const cacheKeys = Object.keys(routesCache);
  stats.memoryCache.count = cacheKeys.length;

  if (cacheKeys.length > 0) {
    let oldestTimestamp = Date.now();
    let youngestTimestamp = 0;

    cacheKeys.forEach((key) => {
      const route = routesCache[key];
      if (route.timestamp < oldestTimestamp) {
        oldestTimestamp = route.timestamp;
      }
      if (route.timestamp > youngestTimestamp) {
        youngestTimestamp = route.timestamp;
      }
    });

    const oldestAgeDays = Math.floor((Date.now() - oldestTimestamp) / (1000 * 60 * 60 * 24));
    const youngestAgeDays = Math.floor((Date.now() - youngestTimestamp) / (1000 * 60 * 60 * 24));

    stats.memoryCache.youngestAge = `${youngestAgeDays} days`;
    stats.memoryCache.oldestAge = `${oldestAgeDays} days`;
  }

  if (auth.currentUser) {
    getDocs(collection(db, "routes"))
      .then((snapshot) => {
        if (!stats.firebaseCache) stats.firebaseCache = {};
        stats.firebaseCache.count = snapshot.size;
      })
      .catch((error) => {
        console.error("[routesController] Error getting Firebase route stats:", error);
      });
  }

  return stats;
};
