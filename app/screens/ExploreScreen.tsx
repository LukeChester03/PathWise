import React from "react";
import { View, Text } from "react-native";
import { globalStyles } from "../constants/globalStyles";
import NavBar from "../components/Global/NavBar";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";

const ExploreScreen = () => {
  return (
    <ScreenWithNavBar>
      <View style={globalStyles.container}></View>
    </ScreenWithNavBar>
  );
};

export default ExploreScreen;
