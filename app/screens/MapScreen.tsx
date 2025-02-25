import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { globalStyles } from "../constants/globalStyles";
import NavBar from "../components/Global/NavBar";
import Map from "../components/Map/Map";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import { Colors } from "../constants/colours";

const MapScreen = () => {
  return (
    <ScreenWithNavBar>
      <View style={globalStyles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Discover</Text>
        </View>
        <Map />
      </View>
    </ScreenWithNavBar>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  header: {
    padding: 20,
    alignItems: "center",
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
});
