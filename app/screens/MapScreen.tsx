import React from "react";
import { View, Text } from "react-native";
import { globalStyles } from "../constants/globalStyles";
import NavBar from "../components/NavBar";

const MapScreen = () => {
  return (
    <View style={globalStyles.container}>
      <Text>Map Screen</Text>
      <NavBar />
    </View>
  );
};

export default MapScreen;
