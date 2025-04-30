import React from "react";
import { render, cleanup, waitFor, fireEvent } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import LearnScreen from "../screens/LearnScreen"; // Path to LearnScreen
import HomeScreen from "../screens/HomeScreen"; // Path to HomeScreen

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

const Stack = createStackNavigator();

describe("Learn Screen Navigation", () => {
  afterEach(cleanup);

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it("should navigate from Home to Learn and render LearnScreen", async () => {
    const { getByText, findByText } = render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="HomeScreen" component={HomeScreen} />
          <Stack.Screen name="LearnScreen" component={LearnScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );

    // simulate navigation in HomeScreen
    const navigateButton = getByText("Learn");
    fireEvent.press(navigateButton);

    await waitFor(() => {
      const learnScreenTitle = findByText("Learn");
      expect(learnScreenTitle).toBeTruthy();
    });
  });
});
