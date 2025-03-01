import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { globalStyles } from "../constants/globalStyles";
import Map from "../components/Map/Map";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import Header from "../components/Global/Header";

const MapScreen = () => {
  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);

  useEffect(() => {
    const updateDimensions = () => {
      setScreenHeight(Dimensions.get("window").height);
    };

    const subscription = Dimensions.addEventListener("change", updateDimensions);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <ScreenWithNavBar>
      <View style={globalStyles.container}>
        <Header title="Discover" showLogo={true} subtitle="Explore nearby locations" />
        <View style={styles.mapContainer}>
          <Map />
        </View>
      </View>
    </ScreenWithNavBar>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    position: "relative",
  },
});
