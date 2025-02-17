import React from "react";
import { View, Text } from "react-native";
import { globalStyles } from "../constants/globalStyles";
import NavBar from "../components/NavBar";
import ScreenWithNavBar from "../components/ScreenWithNavbar";

const LearnScreen = () => {
  return (
    <ScreenWithNavBar>
      <View style={globalStyles.container}>
        <Text>Map Screen</Text>
      </View>
    </ScreenWithNavBar>
  );
};

export default LearnScreen;
