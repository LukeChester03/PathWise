import React, { useEffect, useState, useRef } from "react";
import { SafeAreaView, StatusBar, View, ActivityIndicator, Text } from "react-native";
import XPProvider from "./contexts/Levelling/xpContext";
import XPNotificationsManager from "./components/Levelling/XPNotificationsManager";
import { initStatsSystem } from "./services/statsService";
import {
  initLocationAndPlaces,
  getCurrentLocation,
  updateNearbyPlaces,
  onPlacesUpdate,
  getNearbyPlacesState,
  setPlacesLoadingEnabled,
} from "./controllers/Map/locationController";
import { checkRequiredIndexes, getCacheStats } from "./controllers/Map/placesController";
import { Colors } from "./constants/colours";
import { initAuth } from "./services/authService";
import { AuthProvider } from "./contexts/authContext";
import AuthNavigator from "./navigation/AuthNavigator";

export default function Index() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initStatus, setInitStatus] = useState("Starting app initialization...");

  const locationInitializedRef = useRef(false);
  const placesLoadedRef = useRef(false);
  const authReadyRef = useRef(false);
  const maxRetries = 3;
  const retryCountRef = useRef(0);

  const unsubscribeFunctionsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    console.log("App initialization starting...");

    setPlacesLoadingEnabled(false);

    const initialize = async () => {
      try {
        setInitStatus("Initializing core systems...");

        setInitStatus("Checking authentication status...");
        const currentUser = await initAuth();
        authReadyRef.current = true;
        console.log(
          `🔐 Authentication initialized: User ${currentUser ? "signed in" : "signed out"}`
        );

        const unsubscribeStats = await initStatsSystem(() => {});

        unsubscribeFunctionsRef.current.push(unsubscribeStats);

        await checkRequiredIndexes();

        setInitStatus("Initializing location services...");
        console.log(" Initializing location tracking only (no places yet)...");
        await initLocationAndPlaces();
        locationInitializedRef.current = true;

        const unsubscribePlaces = onPlacesUpdate((placesState) => {
          if (placesState.places && placesState.places.length > 0) {
            console.log(` Places loaded: ${placesState.places.length} places available`);
            placesLoadedRef.current = true;

            getCacheStats()
              .then((stats) => {
                console.log("Places cache stats:", JSON.stringify(stats));
              })
              .catch((e) => console.error("Error getting cache stats:", e));

            completeInitialization();
          }
        });

        unsubscribeFunctionsRef.current.push(unsubscribePlaces);

        if (currentUser) {
          console.log(`User authenticated: ${currentUser.uid}`);
          setPlacesLoadingEnabled(true);
          setInitStatus("User authenticated. Loading places data...");
          ensurePlacesAreLoaded();
        } else {
          console.log(`User not authenticated`);
          setPlacesLoadingEnabled(false);
          completeInitialization();
        }

        setTimeout(() => {
          if (!initialized) {
            console.warn("⚠️ Initialization safety timeout reached");
            completeInitialization();
          }
        }, 8000);
      } catch (error) {
        console.error("Failed to initialize systems:", error);
        completeInitialization();
      }
    };

    const ensurePlacesAreLoaded = async () => {
      try {
        if (placesLoadedRef.current) {
          console.log("🏙️ Places already loaded, skipping refresh");
          return;
        }

        // Check if we already have places
        const placesState = getNearbyPlacesState();
        if (placesState.places && placesState.places.length > 0) {
          console.log(` Using ${placesState.places.length} existing places`);
          placesLoadedRef.current = true;
          completeInitialization();
          return;
        }

        setInitStatus("Loading places data...");
        console.log("🔄 Checking for cached places...");

        // Get current location
        const currentLocation = await getCurrentLocation();
        if (!currentLocation) {
          console.warn("⚠️ Could not get location for places refresh");

          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            setTimeout(() => {
              ensurePlacesAreLoaded();
            }, 2000);
            return;
          }

          // If max retries, proceed without places
          console.warn(
            `Max retries (${maxRetries}) reached for getting location, proceeding anyway`
          );
          completeInitialization();
          return;
        }

        console.log(`Got location: ${currentLocation.latitude}, ${currentLocation.longitude}`);
        console.log("Attempting to load places from cache first...");
        let result = await updateNearbyPlaces(currentLocation, false);

        if (result) {
          console.log("Places loaded successfully (from cache or API if needed)");
          setTimeout(() => {
            if (!placesLoadedRef.current) {
              console.warn("⚠️ Places callback didn't fire, completing initialization anyway");
              completeInitialization();
            }
          }, 5000);
        } else {
          console.warn("Places refresh failed");
          completeInitialization();
        }
      } catch (error) {
        console.error("Error ensuring places are loaded:", error);
        completeInitialization();
      }
    };

    const completeInitialization = () => {
      if (!initialized) {
        console.log("App initialization complete");
        setInitialized(true);
        setLoading(false);
      }
    };
    initialize();

    return () => {
      console.log("🧹 Cleaning up initialization resources");
      unsubscribeFunctionsRef.current.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
    };
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text
          style={{
            marginTop: 20,
            fontSize: 16,
            color: "#555",
            textAlign: "center",
            marginHorizontal: 30,
          }}
        >
          {initStatus}
        </Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <XPProvider>
        <AuthNavigator />
        <XPNotificationsManager />
      </XPProvider>
    </AuthProvider>
  );
}
