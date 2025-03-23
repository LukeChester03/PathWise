import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { Colors } from "../constants/colours";
import Layout from "../_layout";
import { subscribeToAuthState, isAuthenticated } from "../services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * AuthNavigator manages authentication state and initializes the correct navigation flow
 * It ensures the app is properly initialized before displaying any screens
 */
const AuthNavigator = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Initializing authentication...");

  useEffect(() => {
    // Check for authentication in multiple ways to ensure reliability in Expo Go
    const checkAuth = async () => {
      try {
        setStatusMessage("Checking authentication status...");

        // First check if there's stored auth data
        const storedUser = await AsyncStorage.getItem("@pathwise_auth_user");
        if (storedUser) {
          console.log("Found stored authentication data");
        }

        // Add extra delay for Expo Go environment to ensure auth is properly initialized
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Subscribe to auth state changes
        const unsubscribe = subscribeToAuthState((user) => {
          console.log(
            `AuthNavigator received auth state: User ${user ? "signed in" : "signed out"}`
          );

          // When auth state is determined, we can proceed with navigation
          setStatusMessage("Authentication completed, preparing navigation...");

          // Add a small delay to ensure smooth transition
          setTimeout(() => {
            setIsInitializing(false);
          }, 500);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error during authentication initialization:", error);
        setStatusMessage("Error during initialization");

        // Proceed anyway after error
        setTimeout(() => {
          setIsInitializing(false);
        }, 1000);
      }
    };

    checkAuth();
  }, []);

  // Show loading indicator with status while initializing
  if (isInitializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text
          style={{
            marginTop: 20,
            fontSize: 16,
            color: "#555",
            textAlign: "center",
          }}
        >
          {statusMessage}
        </Text>
      </View>
    );
  }

  // Once initialized, show the main app layout which will determine
  // the initial route based on authentication state
  return (
    <NavigationContainer>
      <Layout />
    </NavigationContainer>
  );
};

export default AuthNavigator;
