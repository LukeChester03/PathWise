// app/index.tsx
import React, { useEffect, useState } from "react";
import { SafeAreaView, StatusBar } from "react-native";
import Layout from "./_layout";
import { NavigationContainer } from "@react-navigation/native";
import XPProvider from "./contexts/Levelling/xpContext";
import XPNotificationsManager from "./components/Levelling/XPNotificationsManager";
import { initStatsSystem } from "./services/statsService";

export default function Index() {
  // State to track initialization
  const [initialized, setInitialized] = useState(false);

  // Initialize stats system when the app loads
  useEffect(() => {
    let cleanupFunction: (() => void) | undefined;

    const initialize = async () => {
      try {
        // Await the Promise from initStatsSystem
        const unsubscribe = await initStatsSystem(() => {
          // This callback is triggered when stats change
        });

        // Store the cleanup function
        cleanupFunction = unsubscribe;
        setInitialized(true);
      } catch (error) {
        console.error("Failed to initialize stats system:", error);
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
