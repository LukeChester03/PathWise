// app/_layout.tsx
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import { RootStackParamList } from "./navigation/types";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ExploreScreen from "./screens/ExploreScreen";
import LearnScreen from "./screens/LearnScreen";
import MapScreen from "./screens/MapScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Layout() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Explore" component={ExploreScreen} />
      <Stack.Screen name="Learn" component={LearnScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
    </Stack.Navigator>
  );
}
