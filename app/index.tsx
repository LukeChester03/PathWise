import React, { useEffect, useState, useRef } from "react";
import { SafeAreaView, StatusBar, View, ActivityIndicator, Text } from "react-native";
import Layout from "./_layout";
import { NavigationContainer } from "@react-navigation/native";
import XPProvider from "./contexts/Levelling/xpContext";
import XPNotificationsManager from "./components/Levelling/XPNotificationsManager";
import { initStatsSystem } from "./services/statsService";
import {
  initLocationAndPlaces,
  getCurrentLocation,
  updateNearbyPlaces,
  onPlacesUpdate,
  getNearbyPlacesState,
} from "./controllers/Map/locationController";
import { checkRequiredIndexes, getCacheStats } from "./controllers/Map/placesController";
import { Colors } from "./constants/colours";
import { auth } from "./config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

export default function Index() {
  // State to track initialization
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initStatus, setInitStatus] = useState("Starting app initialization...");

  // Refs to track initialization state
  const locationInitializedRef = useRef(false);
  const placesLoadedRef = useRef(false);
  const authReadyRef = useRef(false);
  const maxRetries = 3;
  const retryCountRef = useRef(0);

  // Track the unsubscribe functions
  const unsubscribeFunctionsRef = useRef<Array<() => void>>([]);

  // Initialize systems when the app loads
  useEffect(() => {
    console.log("🚀 App initialization starting...");

    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      authReadyRef.current = true;
      console.log(`👤 Auth state determined: User ${user ? "signed in" : "not signed in"}`);

      // Once auth is ready and we have a user, ensure places are loaded
      if (user && !placesLoadedRef.current) {
        ensurePlacesAreLoaded();
      }
    });

    unsubscribeFunctionsRef.current.push(unsubscribeAuth);

    const initialize = async () => {
      try {
        setInitStatus("Initializing core systems...");

        // Initialize stats system
        const unsubscribeStats = await initStatsSystem(() => {
          // This callback is triggered when stats change
        });

        unsubscribeFunctionsRef.current.push(unsubscribeStats);

        // Check Firebase indexes early to help with debugging
        await checkRequiredIndexes();

        // Initialize location tracking and preload places data
        setInitStatus("Initializing location services...");
        console.log("📍 Initializing location and places...");
        await initLocationAndPlaces();
        locationInitializedRef.current = true;

        // Subscribe to places updates
        const unsubscribePlaces = onPlacesUpdate((placesState) => {
          if (placesState.places && placesState.places.length > 0) {
            console.log(`🏙️ Places loaded: ${placesState.places.length} places available`);
            placesLoadedRef.current = true;

            // Get and log cache stats
            getCacheStats()
              .then((stats) => {
                console.log("📊 Places cache stats:", JSON.stringify(stats));
              })
              .catch((e) => console.error("Error getting cache stats:", e));

            completeInitialization();
          }
        });

        unsubscribeFunctionsRef.current.push(unsubscribePlaces);

        // Start loading places immediately
        ensurePlacesAreLoaded();

        // Safety timeout - allow app to proceed after 8 seconds regardless
        setTimeout(() => {
          if (!initialized) {
            console.warn("⚠️ Initialization safety timeout reached");
            completeInitialization();
          }
        }, 8000);
      } catch (error) {
        console.error("❌ Failed to initialize systems:", error);
        // Still mark as initialized so app can function
        completeInitialization();
      }
    };

    // Helper function to ensure places are loaded
    const ensurePlacesAreLoaded = async () => {
      try {
        if (placesLoadedRef.current) {
          console.log("🏙️ Places already loaded, skipping refresh");
          return;
        }

        // Check if we already have places
        const placesState = getNearbyPlacesState();
        if (placesState.places && placesState.places.length > 0) {
          console.log(`🏙️ Using ${placesState.places.length} existing places`);
          placesLoadedRef.current = true;
          completeInitialization();
          return;
        }

        setInitStatus("Loading places data...");
        console.log("🔄 Performing explicit places refresh...");

        // Get current location
        const currentLocation = await getCurrentLocation();
        if (!currentLocation) {
          console.warn("⚠️ Could not get location for places refresh");

          // If we've tried less than max retries, schedule another attempt
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            setTimeout(() => {
              ensurePlacesAreLoaded();
            }, 2000); // Retry after 2 seconds
            return;
          }

          // If we've reached max retries, proceed without places
          console.warn(
            `⚠️ Max retries (${maxRetries}) reached for getting location, proceeding anyway`
          );
          completeInitialization();
          return;
        }

        console.log(`📍 Got location: ${currentLocation.latitude}, ${currentLocation.longitude}`);

        // Fetch places with force=true to ensure fresh data
        const result = await updateNearbyPlaces(currentLocation, true);

        if (result) {
          console.log("✅ Places refresh initiated successfully");

          // We don't set placesLoadedRef.current=true here because we'll wait for the
          // places update callback to confirm places are actually loaded

          // Set a fallback in case the callback doesn't fire
          setTimeout(() => {
            if (!placesLoadedRef.current) {
              console.warn("⚠️ Places callback didn't fire, completing initialization anyway");
              completeInitialization();
            }
          }, 5000);
        } else {
          console.warn("⚠️ Places refresh failed");
          completeInitialization(); // Continue anyway
        }
      } catch (error) {
        console.error("❌ Error ensuring places are loaded:", error);
        completeInitialization(); // Continue anyway
      }
    };

    const completeInitialization = () => {
      if (!initialized) {
        console.log("✅ App initialization complete");
        setInitialized(true);
        setLoading(false);
      }
    };

    // Call the async initialization function
    initialize();

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up initialization resources");
      unsubscribeFunctionsRef.current.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
    };
  }, []);

  // Show a loading screen during initialization
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
    <XPProvider>
      <NavigationContainer>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="dark-content" />
          <Layout />
          <XPNotificationsManager />
        </SafeAreaView>
      </NavigationContainer>
    </XPProvider>
  );
}
