import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { globalStyles } from "../constants/globalStyles";
import Map from "../components/Map/Map";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import Header from "../components/Global/Header";
import { Colors } from "../constants/colours";
import MapGettingStartedModal from "../components/Map/MapGettingStartedModal";
import { Ionicons } from "@expo/vector-icons";

const MapScreen = () => {
  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showDistanceSettingsModal, setShowDistanceSettingsModal] = useState(false);
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

  const handleDistanceSettingsModal = () => {
    setShowDistanceSettingsModal(true);
  };

  const headerRightComponent = (
    <TouchableOpacity
      style={styles.distanceSettingsButton}
      onPress={() => handleDistanceSettingsModal}
    >
      <View style={styles.distanceSettingsIconContainer}>
        <Ionicons name="settings-outline" size={20} color={Colors.primary} />
        <View style={styles.distanceSettingsBadge} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWithNavBar>
      <View style={globalStyles.container}>
        <Header
          title="Discover"
          subtitle="Plot your journey to a new Place"
          showLogo={true}
          showIcon={true}
          iconName="map"
          rightComponent={headerRightComponent}
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
  distanceSettingsButton: {
    padding: 8,
  },
  distanceSettingsIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  distanceSettingsBadge: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5252",
    top: 8,
    right: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
});
