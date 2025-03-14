// Add this fix to your App entry point (app/index.tsx)
// This will ensure places are properly initialized at app startup

import React, { useEffect, useState } from "react";
import { SafeAreaView, StatusBar } from "react-native";
import Layout from "./_layout";
import { NavigationContainer } from "@react-navigation/native";
import XPProvider from "./contexts/Levelling/xpContext";
import XPNotificationsManager from "./components/Levelling/XPNotificationsManager";
import { initStatsSystem } from "./services/statsService";
import {
  initLocationAndPlaces,
  getCurrentLocation,
  updateNearbyPlaces,
} from "./controllers/Map/locationController";

export default function Index() {
  // State to track initialization
  const [initialized, setInitialized] = useState(false);

  // Initialize systems when the app loads
  useEffect(() => {
    let cleanupFunction: (() => void) | undefined;

    const initialize = async () => {
      try {
        console.log("Starting app initialization...");

        // Initialize stats system
        const unsubscribe = await initStatsSystem(() => {
          // This callback is triggered when stats change
        });

        // Store the cleanup function
        cleanupFunction = unsubscribe;

        // Initialize location tracking and preload places data
        console.log("Initializing location and places...");
        await initLocationAndPlaces();

        // ADDED: Force an explicit location and places refresh after initialization
        // This ensures places data is available regardless of what happened in automatic init
        setTimeout(async () => {
          try {
            console.log("🔄 Performing explicit places refresh...");
            const currentLocation = await getCurrentLocation();

            if (currentLocation) {
              console.log(
                `📍 Got location for explicit refresh: ${currentLocation.latitude}, ${currentLocation.longitude}`
              );
              await updateNearbyPlaces(currentLocation, true);
              console.log("✅ Explicit places refresh complete");
            } else {
              console.warn("⚠️ Could not get location for explicit refresh");
            }
          } catch (refreshError) {
            console.error("Error in explicit refresh:", refreshError);
          }
        }, 2000); // Wait 2 seconds after initialization

        console.log("Location and places initialization complete");
        setInitialized(true);
      } catch (error) {
        console.error("Failed to initialize systems:", error);
        // Still mark as initialized so app can function
        setInitialized(true);
      }
    };

    // Call the async initialization function
    initialize();

    // Cleanup on unmount
    return () => {
      if (cleanupFunction) cleanupFunction();
    };
  }, []);

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
