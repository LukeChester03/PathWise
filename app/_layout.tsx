import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./navigation/types";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ExploreScreen from "./screens/ExploreScreen";
import LearnScreen from "./screens/LearnScreen";
import MapScreen from "./screens/MapScreen";
import LandingScreen from "./screens/LandingScreen";
import ViewAllScreen from "./screens/ViewAllScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Layout() {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      id={undefined}
      screenOptions={{ headerShown: false, animation: "fade" }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Explore" component={ExploreScreen} />
      <Stack.Screen name="Learn" component={LearnScreen} />
      <Stack.Screen name="Discover" component={MapScreen} />
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="ViewAll" component={ViewAllScreen} />
    </Stack.Navigator>
  );
}
