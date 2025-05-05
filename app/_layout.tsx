import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import { RootStackParamList } from "./navigation/types";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ExploreScreen from "./screens/ExploreScreen";
import LearnScreen from "./screens/LearnScreen";
import MapScreen from "./screens/MapScreen";
import LandingScreen from "./screens/LandingScreen";
import ViewAllScreen from "./screens/ViewAllScreen";
import MyJourneyScreen from "./screens/MyJourneyScreen";
import PlaceDetailsScreen from "./screens/PlaceDetailsScreen";
import TravelProfileScreen from "./screens/TravelProfileScreen";
import PhraseBookScreen from "./screens/PhraseBookScreen";
import { isAuthenticated } from "./services/authService";
import { Colors } from "./constants/colours";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CulturalContextScreen from "./screens/CulturalContextScreen";
import AdvancedTravelAnalysisScreen from "./screens/AdvancedTravelAnalysisScreen";
import KnowledgeQuestScreen from "./screens/KnowledgeQuestScreen";
import QuizSessionScreen from "./screens/QuizSessionScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Layout() {
  const [initialRouteName, setInitialRouteName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndSetRoute = async () => {
      try {
        console.log("Determining initial route based on authentication state");
        await new Promise((resolve) => setTimeout(resolve, 500));
        const userAuthenticated = await isAuthenticated();
        const storedUser = await AsyncStorage.getItem("@pathwise_auth_user");
        if (userAuthenticated || storedUser) {
          console.log(" User is authenticated, setting initial route to Home");
          setInitialRouteName("Home");
        } else {
          console.log(" User is not authenticated, setting initial route to Landing");
          setInitialRouteName("Landing");
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking authentication status:", error);
        setInitialRouteName("Landing");
        setIsLoading(false);
      }
    };

    checkAuthAndSetRoute();
  }, []);

  if (isLoading || initialRouteName === null) {
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
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName as any}
      id={undefined}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Explore" component={ExploreScreen} />
      <Stack.Screen name="Learn" component={LearnScreen} />
      <Stack.Screen name="Discover" component={MapScreen} />
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="ViewAll" component={ViewAllScreen} />
      <Stack.Screen name="MyJourney" component={MyJourneyScreen} />
      <Stack.Screen name="PlaceDetails" component={PlaceDetailsScreen} />
      <Stack.Screen
        name="TravelProfile"
        component={TravelProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Phrasebook" component={PhraseBookScreen} />
      <Stack.Screen name="CulturalContext" component={CulturalContextScreen} />
      <Stack.Screen name="AdvancedTravelAnalysis" component={AdvancedTravelAnalysisScreen} />
      <Stack.Screen name="KnowledgeQuestScreen" component={KnowledgeQuestScreen} />
      <Stack.Screen name="QuizSession" component={QuizSessionScreen} />
    </Stack.Navigator>
  );
}
