import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { globalStyles } from "../constants/globalStyles";
import Map from "../components/Map/Map";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import Header from "../components/Global/Header";
import { Colors } from "../constants/colours";
import MapGettingStartedModal from "../components/Map/MapGettingStartedModal";

const MapScreen = () => {
  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
  const [showHelpModal, setShowHelpModal] = useState(false);
  useEffect(() => {
    const updateDimensions = () => {
      setScreenHeight(Dimensions.get("window").height);
    };

    const subscription = Dimensions.addEventListener("change", updateDimensions);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleHelpModal = () => {
    setShowHelpModal(true);
  };

  const handleCloseModal = () => {
    setShowHelpModal(false);
  };

  return (
    <ScreenWithNavBar>
      <View style={globalStyles.container}>
        <Header
          title="Discover"
          subtitle="Plot your journey to a new Place"
          showLogo={true}
          showIcon={true}
          iconName="map"
          iconColor={Colors.primary}
          onHelpPress={handleHelpModal}
          onBackPress={handleCloseModal}
        />
        <View style={styles.mapContainer}>
          <Map />
        </View>
      </View>
      <MapGettingStartedModal visible={showHelpModal} onClose={handleCloseModal} />
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
