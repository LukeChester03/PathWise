import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { Colors } from "../constants/colours";
import Layout from "../_layout";
import { subscribeToAuthState, isAuthenticated } from "../services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthNavigator = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Initializing authentication...");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setStatusMessage("Checking authentication status...");

        const storedUser = await AsyncStorage.getItem("@pathwise_auth_user");
        if (storedUser) {
          console.log("Found stored authentication data");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const unsubscribe = subscribeToAuthState((user) => {
          console.log(
            `AuthNavigator received auth state: User ${user ? "signed in" : "signed out"}`
          );

          setStatusMessage("Authentication completed, preparing navigation...");

          setTimeout(() => {
            setIsInitializing(false);
          }, 500);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error during authentication initialization:", error);
        setStatusMessage("Error during initialization");

        setTimeout(() => {
          setIsInitializing(false);
        }, 1000);
      }
    };

    checkAuth();
  }, []);

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

  return (
    <NavigationContainer>
      <Layout />
    </NavigationContainer>
  );
};

export default AuthNavigator;
