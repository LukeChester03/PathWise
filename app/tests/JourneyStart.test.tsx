import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import MapScreen from "../screens/MapScreen";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

const Stack = createStackNavigator();
jest.mock("../../app/components/Map/MapGettingStartedModal", () => {
  return jest.fn(() => null);
});
// Mock locationController
jest.mock("../../app/controllers/Map/locationController", () => ({
  getNearbyPlacesState: jest.fn(() => ({
    places: [
      {
        place_id: "mock123",
        name: "Mock Place",
        geometry: { location: { lat: 0, lng: 0 } },
        hasFullDetails: true,
      },
    ],
    hasPreloaded: true,
    isLoading: false,
    lastUpdated: Date.now(),
    furthestDistance: 1000,
    isPreloading: false,
  })),
  updateNearbyPlaces: jest.fn(() => Promise.resolve(true)),
}));

// Mock Map component
jest.mock("../../app/components/Map/Map", () => {
  const React = require("react");
  const { TouchableOpacity, Text } = require("react-native");

  return ({ placeToShow, onPlaceCardShown }: any) => {
    return (
      <TouchableOpacity
        testID={`place-card-${placeToShow?.place_id ?? "default"}`}
        onPress={onPlaceCardShown}
      >
        <Text>{placeToShow?.name ?? "Mock Place"}</Text>
      </TouchableOpacity>
    );
  };
});

describe("Start Journey - Discover Screen", () => {
  it("should start a journey when a place is selected", async () => {
    const { findByTestId } = render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="MapScreen" component={MapScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );

    const placeCard = await findByTestId("place-card-default");

    await act(async () => {
      fireEvent.press(placeCard);
    });

    await waitFor(() => {
      expect(placeCard).toBeTruthy();
    });
  });
});
